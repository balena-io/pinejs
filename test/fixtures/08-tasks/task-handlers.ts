import type { FromSchema } from 'json-schema-to-ts';
import { sbvrUtils, tasks } from '../../../src/server-glue/module';

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

export const initTaskHandlers = () => {
	tasks.addTaskHandler(
		'create_device',
		async (options) => {
			try {
				const params = options.params as CreateDeviceParams;
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

	tasks.addTaskHandler('will_fail', async () => {
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

	void tasks.worker?.start();
};
