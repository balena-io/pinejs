import { Tx } from '../database-layer/db';
import * as syncMigrator from '../migrator/sync';
import type { MigrationFn, ScheduledMigration } from '../migrator/utils';
import * as permissions from './permissions';
import { LoggingClient, PinejsClient } from './sbvr-utils';
import * as nodeSchedule from 'node-schedule';
import * as serialize from 'serialize-javascript';

const client = new PinejsClient('/migrations/') as LoggingClient;

function assertFutureDate(date: Date) {
	if (new Date().getTime() >= date.getTime()) {
		throw new Error('Scheduled migration date must be in the future');
	}
}

// Limit scheduled migrations to only be a MigrationFn, no SQL.
export const addScheduledMigration = async (
	tx: Tx,
	date: Date,
	key: string,
	migrationFn: MigrationFn,
): Promise<void> => {
	// Validate date is in the future.
	assertFutureDate(date);

	// Store in database.
	await client.post({
		resource: 'scheduled_migration',
		passthrough: {
			req: permissions.root,
		},
		body: {
			migration_key: key,
			execution_time: date.toISOString(),
			callback: serialize(migrationFn),
		},
	});

	// Schedule for execution.
	nodeSchedule.scheduleJob(key, date, async () => {
		await syncMigrator.executeMigrations(tx, [[key, migrationFn]]);
	});
};

export const cancelScheduledMigration = (key: string): void => {
	nodeSchedule.cancelJob(key);
};

export const updateScheduledMigration = async (
	tx: Tx,
	date: Date,
	key: string,
	migrationFn: MigrationFn,
): Promise<void> => {
	// Validate date is in the future.
	assertFutureDate(date);

	// Get existing scheduled migration.
	const [migration] = (await client.get({
		resource: 'scheduled_migration',
		passthrough: {
			req: permissions.root,
		},
		options: {
			$select: 'id',
			$filter: {
				migration_key: key,
			},
		},
	})) as ScheduledMigration &
		Array<{
			id: number;
		}>;

	// Update record.
	if (migration != null) {
		await client.patch({
			resource: 'scheduled_migration',
			id: migration.id,
			passthrough: {
				req: permissions.root,
			},
			body: {
				migration_key: key,
				execution_time: date.toISOString(),
				callback: serialize(migrationFn),
			},
		});

		// Cancel any currently scheduled jobs,
		// then reschedule for execution.
		nodeSchedule.cancelJob(key);
		nodeSchedule.scheduleJob(key, date, async () => {
			await syncMigrator.executeMigrations(tx, [[key, migrationFn]]);
		});
	}
};
