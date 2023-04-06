import * as syncMigrator from '../migrator/sync';
import * as permissions from './permissions';
import { LoggingClient, PinejsClient } from './sbvr-utils';
import * as nodeSchedule from 'node-schedule';
import * as serialize from 'serialize-javascript';
import { db } from './sbvr-utils';

const client = new PinejsClient('/migrations/') as LoggingClient;

function assertFutureDate(date: Date) {
	if (new Date().getTime() >= date.getTime()) {
		throw new Error('Scheduled job date must be in the future');
	}
}

function scheduleJob(
	key: string,
	date: Date,
	callback: () => Promise<void>,
): void {
	nodeSchedule.scheduleJob(key, date, async () => {
		db.transaction(async (tx) => {
			await syncMigrator.executeMigrations(tx, [[key, callback]]);
		});
	});
}

// Limit jobs to only be a MigrationFn, no SQL.
export const schedule = async (
	key: string,
	date: Date,
	callback: () => Promise<void>,
): Promise<void> => {
	// Validate date is in the future.
	assertFutureDate(date);

	// Store in database.
	await client.post({
		resource: 'scheduled_job',
		passthrough: {
			req: permissions.root,
		},
		body: {
			migration_key: key,
			execution_date: date.toISOString(),
			callback: serialize(callback),
		},
	});

	// Schedule job for execution.
	scheduleJob(key, date, callback);
};

export const cancel = (key: string): void => {
	nodeSchedule.cancelJob(key);
};

export const reschedule = async (
	key: string,
	date: Date,
	callback: () => Promise<void>,
): Promise<void> => {
	// Validate date is in the future.
	assertFutureDate(date);

	// Update database record.
	await client.patch({
		resource: 'scheduled_job',
		passthrough: {
			req: permissions.root,
		},
		options: {
			$filter: {
				migration_key: key,
			},
		},
		body: {
			execution_date: date.toISOString(),
			callback: serialize(callback),
		},
	});

	// Reschedule job for execution.
	cancel(key);
	scheduleJob(key, date, callback);
};
