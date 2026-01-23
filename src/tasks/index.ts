import type { Schema } from 'ajv';
import { type CronExpression, CronExpressionParser } from 'cron-parser';
import { tasks as tasksEnv } from '../config-loader/env.js';
import { addPureHook } from '../sbvr-api/hooks.js';
import * as permissions from '../sbvr-api/permissions.js';
import * as sbvrUtils from '../sbvr-api/sbvr-utils.js';
import type { ConfigLoader } from '../server-glue/module.js';
import { ajv, apiRoot } from './common.js';
import type { TaskHandler } from './worker.js';
import { Worker } from './worker.js';
import type TasksModel from './tasks.js';
import type { Task } from './tasks.js';
import type { FromSchema } from 'json-schema-to-ts';
import { importSBVR } from '../server-glue/sbvr-loader.js';
import { BadRequestError, ConflictError } from '../sbvr-api/errors.js';

export type * from './tasks.js';

const modelText = await importSBVR('./tasks.sbvr', import.meta);

// Create index for polling tasks table
const initSql = `
CREATE INDEX IF NOT EXISTS idx_task_poll ON task USING btree (
	"is executed by-handler",
	"is scheduled to execute on-time" ASC,
	"id" ASC
) WHERE status = 'queued';

-- TODO: Remove this once pinejs is able to auto generate partial unique indexes from rules.
-- It is necessary that each handler that executes a task that is scheduled with a cron expression and has a status that is equal to "queued", executes at most one task that is scheduled with a cron expression and has a status that is equal to "queued".
CREATE UNIQUE INDEX IF NOT EXISTS "task$/Mt7Ad3mHEm0JFpuaX1BioDwNSWTgsEFOG1igq8EIrk="
ON "task" ("is executed by-handler")
WHERE ("is scheduled with-cron expression" IS NOT NULL
AND 'queued' = "status");
`;

declare module '../sbvr-api/sbvr-utils.js' {
	export interface API {
		[apiRoot]: PinejsClient<TasksModel>;
	}
}

export let worker: Worker | null = null;

export function canExecuteTasks() {
	return sbvrUtils.db.engine === 'postgres' && tasksEnv.queueConcurrency > 0;
}

// TODO-Major: stop exporting this
export const setup: ConfigLoader.SetupFunction = () => {
	// Async task functionality is only supported on Postgres
	if (sbvrUtils.db.engine !== 'postgres') {
		console.warn('Skipping task setup as database not supported');
		return;
	}

	if (worker != null) {
		// Don't try to setup multiple times
		return;
	}

	const client = sbvrUtils.api[apiRoot];
	worker = new Worker(client);

	// Add resource hooks
	addPureHook('POST', apiRoot, 'task', {
		POSTPARSE: ({ req, request }) => {
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

			const minAllowedScheduledTime = new Date(
				Date.now() + tasksEnv.queueIntervalMS,
			);

			if (request.values.is_scheduled_with__cron_expression != null) {
				let cronExpression: CronExpression | undefined;
				try {
					// always validate the cron expression when provided.
					cronExpression = CronExpressionParser.parse(
						request.values.is_scheduled_with__cron_expression,
					);
				} catch {
					throw new Error(
						`Invalid cron expression: ${request.values.is_scheduled_with__cron_expression}`,
					);
				}
				// Set a scheduled start date if missing, using the cron expression after we validated it.
				if (request.values.is_scheduled_to_execute_on__time == null) {
					let nextScheduledRunTime = cronExpression.next().toDate();
					if (nextScheduledRunTime < minAllowedScheduledTime) {
						// Reschedule it for the next run, so that the task creation doesn't fail.
						nextScheduledRunTime = cronExpression.next().toDate();
					}
					request.values.is_scheduled_to_execute_on__time =
						nextScheduledRunTime.toISOString();
				}
			}

			// Assert that the provided start time is far enough in the future
			if (request.values.is_scheduled_to_execute_on__time != null) {
				const startTime = new Date(
					request.values.is_scheduled_to_execute_on__time,
				);
				if (startTime < minAllowedScheduledTime) {
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
			const handler = worker?.handlers.get(handlerName);
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
};

export const config: ConfigLoader.Config = {
	models: [
		{
			modelName: apiRoot,
			apiRoot,
			modelText,
			customServerCode: { setup },
			initSql,
			migrations: {
				'22.0.0-timestamps': async (tx, { db }) => {
					switch (db.engine) {
						// No need to migrate anything other than postgres
						case 'postgres':
							await tx.executeSql('DROP INDEX IF EXISTS idx_task_poll;');
							await tx.executeSql(`\
								ALTER TABLE "task"
								ALTER COLUMN "created at" SET DATA TYPE TIMESTAMPTZ USING "created at"::TIMESTAMPTZ,
								ALTER COLUMN "modified at" SET DATA TYPE TIMESTAMPTZ USING "modified at"::TIMESTAMPTZ,
								ALTER COLUMN "ended on-time" SET DATA TYPE TIMESTAMPTZ USING "ended on-time"::TIMESTAMPTZ,
								ALTER COLUMN "is scheduled to execute on-time" SET DATA TYPE TIMESTAMPTZ USING "is scheduled to execute on-time"::TIMESTAMPTZ,
								ALTER COLUMN "started on-time" SET DATA TYPE TIMESTAMPTZ USING "started on-time"::TIMESTAMPTZ;`);
							await tx.executeSql(`\
								CREATE INDEX IF NOT EXISTS idx_task_poll ON task USING btree (
									"is executed by-handler",
									"is scheduled to execute on-time" ASC,
									"id" ASC
								) WHERE status = 'queued';`);
							break;
					}
				},
				'23.4.0-unique-cron-tasks': async (tx, { db }) => {
					switch (db.engine) {
						// No need to migrate anything other than postgres
						case 'postgres':
							await tx.executeSql(`\
								-- It is necessary that each handler that executes a task that is scheduled with a cron expression and has a status that is equal to "queued", executes at most one task that is scheduled with a cron expression and has a status that is equal to "queued".
								CREATE UNIQUE INDEX IF NOT EXISTS "task$/Mt7Ad3mHEm0JFpuaX1BioDwNSWTgsEFOG1igq8EIrk="
								ON "task" ("is executed by-handler")
								WHERE ("is scheduled with-cron expression" IS NOT NULL
								AND 'queued' = "status");`);
							break;
					}
				},
			},
		},
	],
};

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

	if (worker.handlers.has(name)) {
		throw new Error(`Task handler with name '${name}' already registered`);
	}
	worker.handlers.set(name, {
		name,
		fn,
		validate: schema != null ? ajv.compile(schema) : undefined,
	});
}

// Register a cron task and its handler
export async function addCronTask(
	name: string,
	cron: string,
	fn: TaskHandler<
		NonNullable<Task['Read']['is_executed_with__parameter_set']>
	>['fn'],
): Promise<void> {
	addTaskHandler(name, fn);

	const client = sbvrUtils.api[apiRoot];
	try {
		await client.post({
			resource: 'task',
			passthrough: {
				req: permissions.root,
			},
			options: {
				returnResource: false,
			},
			body: {
				is_executed_by__handler: name,
				is_scheduled_with__cron_expression: cron,
				status: 'queued',
			},
		});
	} catch (err) {
		if (
			// TODO: Remove the ConflictError one we bump to https://github.com/balena-io-modules/abstract-sql-compiler/pull/316
			// since then the rule will throw a proper BadRequestError instead of the generic ConflictError that's atm thrown
			// from the partial unique index.
			(err instanceof ConflictError &&
				err.message === 'Unique key constraint violated') ||
			(err instanceof BadRequestError &&
				err.message ===
					'It is necessary that each handler that executes a task that is scheduled with a cron expression and has a status that is equal to "queued", executes at most one task that is scheduled with a cron expression and has a status that is equal to "queued".')
		) {
			await client.patch({
				resource: 'task',
				passthrough: {
					req: permissions.root,
				},
				options: {
					$filter: {
						is_executed_by__handler: name,
						status: 'queued',
						$and: [
							{ is_scheduled_with__cron_expression: { $ne: null } },
							{ is_scheduled_with__cron_expression: { $ne: cron } },
						],
					},
				},
				body: {
					is_scheduled_with__cron_expression: cron,
				},
			});
		} else {
			throw err;
		}
	}
}
