import type { Schema } from 'ajv';
import * as cronParser from 'cron-parser';
import { tasks as tasksEnv } from '../config-loader/env';
import { addPureHook } from '../sbvr-api/hooks';
import * as sbvrUtils from '../sbvr-api/sbvr-utils';
import type { ConfigLoader } from '../server-glue/module';
import { ajv, apiRoot } from './common';
import type { TaskHandler } from './worker';
import { Worker } from './worker';
import type TasksModel from './tasks';
import type { Task } from './tasks';
import type { FromSchema } from 'json-schema-to-ts';

export type * from './tasks';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const modelText: string = require('./tasks.sbvr');

// Create index for polling tasks table
const initSql = `
CREATE INDEX IF NOT EXISTS idx_task_poll ON task USING btree (
	"is executed by-handler",
	"is scheduled to execute on-time" ASC,
	"id" ASC
) WHERE status = 'queued';
`;

declare module '../sbvr-api/sbvr-utils' {
	export interface API {
		[apiRoot]: PinejsClient<TasksModel>;
	}
}

export const config: ConfigLoader.Config = {
	models: [
		{
			modelName: apiRoot,
			apiRoot,
			modelText,
			customServerCode: exports,
			initSql,
		},
	],
};

export let worker: Worker | null = null;
export async function setup(): Promise<void> {
	// Async task functionality is only supported on Postgres
	if (sbvrUtils.db.engine !== 'postgres') {
		console.warn('Skipping task setup as database not supported');
		return;
	}

	const client = sbvrUtils.api[apiRoot];
	worker = new Worker(client);

	// Add resource hooks
	addPureHook('POST', apiRoot, 'task', {
		POSTPARSE: async ({ req, request }) => {
			// Set the actor
			request.values.is_created_by__actor =
				req.user?.actor ?? req.apiKey?.actor;
			if (request.values.is_created_by__actor == null) {
				throw new Error(
					'Creating tasks with missing actor on req is not allowed',
				);
			}

			// Set defaults
			request.values.status = 'queued';
			request.values.attempt_count = 0;
			request.values.attempt_limit ??= 1;

			// Set scheduled start time using cron expression if provided
			if (
				request.values.is_scheduled_with__cron_expression != null &&
				request.values.is_scheduled_to_execute_on__time == null
			) {
				try {
					request.values.is_scheduled_to_execute_on__time = cronParser
						.parseExpression(request.values.is_scheduled_with__cron_expression)
						.next()
						.toDate()
						.toISOString();
				} catch {
					throw new Error(
						`Invalid cron expression: ${request.values.is_scheduled_with__cron_expression}`,
					);
				}
			}

			// Assert that the provided start time is far enough in the future
			if (request.values.is_scheduled_to_execute_on__time != null) {
				const now = new Date(Date.now() + tasksEnv.queueIntervalMS);
				const startTime = new Date(
					request.values.is_scheduled_to_execute_on__time,
				);
				if (startTime < now) {
					throw new Error(
						`Task scheduled start time must be greater than ${tasksEnv.queueIntervalMS} milliseconds in the future`,
					);
				}
			}

			// Assert that the requested handler exists
			const handlerName = request.values.is_executed_by__handler;
			if (handlerName == null) {
				throw new Error(`Must specify a task handler to execute`);
			}
			const handler = worker?.handlers[handlerName];
			if (handler == null) {
				throw new Error(
					`No task handler with name '${handlerName}' registered`,
				);
			}

			// Assert that the provided parameter set is valid
			if (handler.validate != null) {
				if (!handler.validate(request.values.is_executed_with__parameter_set)) {
					throw new Error(
						`Invalid parameter set: ${ajv.errorsText(handler.validate.errors)}`,
					);
				}
			}
		},
	});
}

// Register a task handler
export function addTaskHandler(
	name: string,
	fn: TaskHandler<
		NonNullable<Task['Read']['is_executed_with__parameter_set']>
	>['fn'],
	schema?: undefined,
): void;
export function addTaskHandler<T extends Schema>(
	name: string,
	fn: TaskHandler<FromSchema<NonNullable<T>>>['fn'],
	schema: T,
): void;
export function addTaskHandler<T extends Schema>(
	name: string,
	fn: TaskHandler<
		NonNullable<Task['Read']['is_executed_with__parameter_set']>
	>['fn'],
	schema?: T,
): void {
	if (worker == null) {
		throw new Error('Database does not support tasks');
	}

	if (worker.handlers[name] != null) {
		throw new Error(`Task handler with name '${name}' already registered`);
	}
	worker.handlers[name] = {
		name,
		fn,
		validate: schema != null ? ajv.compile(schema) : undefined,
	};
}
