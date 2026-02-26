import type { FromSchema } from 'json-schema-to-ts';
import { sbvrUtils, tasks, dbModule } from '@balena/pinejs';

// Define JSON schema for accepted parameters
const createDeviceParamsSchema = {
	type: 'object',
	properties: {
		name: {
			type: 'string',
		},
		type: {
			type: 'string',
		},
	},
	required: ['name', 'type'],
	additionalProperties: false,
} as const;

const incrementDeviceCountParamsSchema = {
	type: 'object',
	properties: {
		deviceId: {
			type: 'number',
		},
	},
	required: ['deviceId'],
	additionalProperties: false,
} as const;

// Generate type from schema and export for callers to use
export type CreateDeviceParams = FromSchema<typeof createDeviceParamsSchema>;
export type IncrementDeviceCountParams = FromSchema<
	typeof incrementDeviceCountParamsSchema
>;

export const initTaskHandlers = async () => {
	tasks.addTaskHandler(
		'create_device',
		async (options) => {
			try {
				const params = options.params;
				await options.api.post({
					apiPrefix: '/example/',
					resource: 'device',
					body: {
						name: params.name,
						type: params.type,
					},
				});
				return {
					status: 'succeeded',
				};
			} catch (err: any) {
				return {
					status: 'failed',
					error: err.message,
				};
			}
		},
		createDeviceParamsSchema,
	);

	tasks.addTaskHandler('will_fail', () => {
		try {
			throw new Error('This task is supposed to fail');
		} catch (err: any) {
			return {
				status: 'failed',
				error: err.message,
			};
		}
	});

	tasks.addTaskHandler(
		'increment_device_count',
		async (options) => {
			const deviceId = options.params.deviceId;
			await sbvrUtils.db.executeSql(
				'UPDATE device SET count = count + 1 WHERE id = $1',
				[deviceId],
			);
			return { status: 'succeeded' };
		},
		incrementDeviceCountParamsSchema,
	);

	await tasks.addCronTask(
		'set_device_note',
		'0 0 1,3,5,7 * * *',
		async (options) => {
			const newNote = 'provisioning done';
			try {
				await options.api.patch({
					apiPrefix: '/example/',
					resource: 'device',
					options: {
						$filter: {
							note: { $ne: newNote },
						},
					},
					body: {
						note: newNote,
					},
				});
				return {
					status: 'succeeded',
				};
			} catch (err: any) {
				return {
					status: 'failed',
					error: err.message,
				};
			}
		},
	);

	// manually add a scheduled task ahead of time, to confirm that during pine init, addCronTask() will update its cron expression.
	const oldHeartbeatTaskCronExpression = '0 0 2,4,6,8 * * *';
	try {
		await sbvrUtils.db.executeSql(
			`
			INSERT INTO task ("key", "is created by-actor", "is executed by-handler", "is executed with-parameter set", "is scheduled with-cron expression", "is scheduled to execute on-time", status, "attempt count", "attempt limit")
			VALUES (NULL, 0, 'set_device_last_heartbeat', NULL, '${oldHeartbeatTaskCronExpression}', '2100-02-03 03:00:00+02', 'queued', 0, 1);
			`,
			[],
		);
	} catch (err) {
		if (
			err instanceof dbModule.UniqueConstraintError &&
			err.message ===
				'duplicate key value violates unique constraint "task$/Mt7Ad3mHEm0JFpuaX1BioDwNSWTgsEFOG1igq8EIrk="'
		) {
			// that's fine, a different pine instance has already created this, just make sure the expected cron expression is set
			await sbvrUtils.db.executeSql(
				`
				UPDATE task
				SET "is scheduled with-cron expression" = '${oldHeartbeatTaskCronExpression}'
				WHERE "is executed by-handler" = 'set_device_last_heartbeat'
				AND "status" = 'queued'
				`,
				[],
			);
		} else {
			throw err;
		}
	}
	await tasks.addCronTask(
		'set_device_last_heartbeat',
		'0 0 0,3,6,12 * * *',
		async (options) => {
			try {
				// Fake heartbeat to the device with the oldest one
				await options.api.patch({
					apiPrefix: '/example/',
					resource: 'device',
					options: {
						$top: 1,
						$orderby: { last_heartbeat: 'desc' },
					},
					body: {
						last_heartbeat: new Date(),
					},
				});
				return {
					status: 'succeeded',
				};
			} catch (err: any) {
				return {
					status: 'failed',
					error: err.message,
				};
			}
		},
	);

	tasks.worker?.start();
};
