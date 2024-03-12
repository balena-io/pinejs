import Ajv from 'ajv';
import type { Schema, ValidateFunction } from 'ajv';
import * as cronParser from 'cron-parser';
import type { AnyObject } from 'pinejs-client-core';

import { tasks as tasksEnv } from '../config-loader/env';
import type { Tx } from '../database-layer/db';
import { BadRequestError } from './errors';
import { addPureHook } from './hooks';
import * as permissions from './permissions';
import type { ExecutableModel } from './sbvr-utils';
import { PinejsClient } from './sbvr-utils';
import { sbvrUtils } from '../server-glue/module';

export const apiRoot = 'tasks';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const modelText: string = require(`./${apiRoot}.sbvr`);

const handlers: {
	[name: string]: TaskHandler;
} = {};

export const taskStatuses = ['pending', 'cancelled', 'success', 'failed'];
export interface Task {
	id: number;
	created_at: Date;
	modified_at: Date;
	is_created_by__actor: number;
	is_executed_by__handler: string;
	is_executed_with__parameter_set: object | null;
	is_scheduled_with__cron_expression: string | null;
	is_scheduled_to_execute_on__time: Date | null;
	priority: number;
	status: (typeof taskStatuses)[number];
	started_on__time: Date | null;
	ended_on__time: Date | null;
	error_message: string | null;
	attempt_count: number;
	attempt_limit: number;
}

type PartialTask = Pick<
	Task,
	| 'id'
	| 'is_created_by__actor'
	| 'is_executed_by__handler'
	| 'is_executed_with__parameter_set'
	| 'is_scheduled_with__cron_expression'
	| 'priority'
	| 'attempt_count'
	| 'attempt_limit'
>;

interface TaskArgs {
	api: PinejsClient;
	params: AnyObject;
	tx: Tx;
}

type TaskResponse = Promise<{
	status: (typeof taskStatuses)[number];
	error?: string;
}>;

export interface TaskHandler {
	name: string;
	fn: (options: TaskArgs) => TaskResponse;
	validate?: ValidateFunction;
}

// Parse a cron expression
function parseCron(cron: string): Date {
	return cronParser.parseExpression(cron).next().toDate();
}

export const config = {
	models: [
		{
			apiRoot,
			modelText,
			customServerCode: exports,
			migrations: {},
		},
	] as ExecutableModel[],
};

// Setting inlineRefs=false as without it we run into a
// "Maximum call stack size exceeded" error apprarently caused
// by String.prototype._uncountable_words being set in sbvr-parser?
const ajv = new Ajv({
	inlineRefs: false,
});

export const setup = async () => {
	addPureHook('POST', apiRoot, 'task', {
		POSTPARSE: async ({ req, request }) => {
			// Set the actor
			request.values.is_created_by__actor =
				req.user?.actor ?? req.apiKey?.actor;
			if (request.values.is_created_by__actor == null) {
				throw new BadRequestError(
					'Creating tasks with missing actor on req is not allowed',
				);
			}

			// Set defaults
			request.values.status = 'pending';
			request.values.attempt_count = 0;
			request.values.priority ??= 1;
			request.values.attempt_limit ??= 1;

			// Set scheduled start time using cron expression if provided
			if (
				request.values.is_scheduled_with__cron_expression != null &&
				request.values.is_scheduled_to_execute_on__time == null
			) {
				try {
					request.values.is_scheduled_to_execute_on__time = parseCron(
						request.values.is_scheduled_with__cron_expression,
					).toISOString();
				} catch (_) {
					throw new BadRequestError(
						`Invalid cron expression: ${request.values.is_scheduled_with__cron_expression}`,
					);
				}
			}

			// Assert that the provided start time is far enough in the future
			if (request.values.is_scheduled_to_execute_on__time != null) {
				const now = new Date(new Date().getTime() + tasksEnv.queueIntervalMS);
				const startTime = new Date(
					request.values.is_scheduled_to_execute_on__time,
				);
				if (startTime < now) {
					throw new BadRequestError(
						`Task scheduled start time must be greater than ${tasksEnv.queueIntervalMS} milliseconds in the future`,
					);
				}
			}

			// Assert that the requested handler exists
			const handlerName = request.values.is_executed_by__handler;
			if (handlerName == null) {
				throw new BadRequestError(`Must specify a task handler to execute`);
			}
			const handler = handlers[handlerName];
			if (handler == null) {
				throw new BadRequestError(
					`No task handler with name '${handlerName}' registered`,
				);
			}

			// Assert that the provided parameter set is valid
			if (handler.validate != null) {
				if (!handler.validate(request.values.is_executed_with__parameter_set)) {
					throw new BadRequestError(
						`Invalid parameter set: ${ajv.errorsText(handler.validate.errors)}`,
					);
				}
			}
		},
	});

	// Start the worker if possible
	if (tasksEnv.queueConcurrency > 0 && tasksEnv.queueIntervalMS >= 1000) {
		watch();
	}
};

// Register a task handler
export function addTaskHandler(
	name: string,
	fn: TaskHandler['fn'],
	schema?: Schema,
): void {
	if (handlers[name] != null) {
		throw new Error(`Task handler with name '${name}' already registered`);
	}
	handlers[name] = {
		name,
		fn,
		validate: schema != null ? ajv.compile(schema) : undefined,
	};
}

// Calculate next attempt datetime for a task that has failed using exponential backoff
function getNextAttemptTime(attempt: number): Date | null {
	const millisecondsInFuture =
		Math.ceil(Math.exp(Math.min(10, attempt))) * 1000;
	return new Date(Date.now() + millisecondsInFuture);
}

// Watch for new tasks to execute
let executing = 0;
function watch(): void {
	const client = new PinejsClient({
		apiPrefix: `/${apiRoot}/`,
	});

	setInterval(async () => {
		// Do nothing if there are no handlers or if we are already at the concurrency limit
		if (
			Object.keys(handlers).length === 0 ||
			executing >= tasksEnv.queueConcurrency
		) {
			return;
		}

		try {
			await sbvrUtils.db.transaction(async (tx) => {
				const names = Object.keys(handlers);
				const binds = names.map((_, index) => `$${index + 1}`).join(', ');
				const result = await tx.executeSql(
					`
					SELECT
						t."id",
						t."is executed by-handler" AS is_executed_by__handler,
						t."is executed with-parameter set" AS is_executed_with__parameter_set,
						t."is scheduled with-cron expression" AS is_scheduled_with__cron_expression,
						t."attempt count" AS attempt_count,
						t."attempt limit" AS attempt_limit,
						t."priority" AS priority,
						t."is created by-actor" AS is_created_by__actor
					FROM
						task AS t
					WHERE
						t."is executed by-handler" IN (${binds}) AND
						t."status" = 'pending' AND
						t."attempt count" <= t."attempt limit" AND
						(
							t."is scheduled to execute on-time" IS NULL OR
							t."is scheduled to execute on-time" <= CURRENT_TIMESTAMP + INTERVAL '${Math.ceil(tasksEnv.queueIntervalMS / 1000)} second'
						)
					ORDER BY
						t."is scheduled to execute on-time" ASC,
						t."priority" DESC,
						t."id" ASC
					LIMIT 1
					FOR UPDATE
					SKIP LOCKED
				`,
					names,
				);
				if (result.rows.length > 0) {
					executing++;
					await execute(client, result.rows[0] as PartialTask, tx);
					executing--;
				}
			});
		} catch (err: unknown) {
			console.error('Failed polling for tasks:', err);
		}
	}, tasksEnv.queueIntervalMS);
}

// Execute a task
async function execute(
	client: PinejsClient,
	task: PartialTask,
	tx: Tx,
): Promise<void> {
	try {
		// Get the handler
		const handler = handlers[task.is_executed_by__handler];
		const startedOnTime = new Date();
		if (handler == null) {
			await update(
				client,
				tx,
				task,
				startedOnTime,
				'failed',
				'Matching task handler not found',
			);
			return;
		}

		// Validate parameters before execution so we can fail early if
		// the parameter set is invalid. This can happen if the handler
		// definition changes after a task is added to the queue.
		if (
			handler.validate != null &&
			!handler.validate(task.is_executed_with__parameter_set)
		) {
			await update(
				client,
				tx,
				task,
				startedOnTime,
				'failed',
				`Invalid parameter set: ${ajv.errorsText(handler.validate.errors)}`,
			);
			return;
		}

		// Execute the handler
		const result = await handler.fn({
			api: new PinejsClient({
				passthrough: {
					tx,
				},
			}),
			params: task.is_executed_with__parameter_set ?? {},
			tx,
		});

		// Update the task with the results
		await update(client, tx, task, startedOnTime, result.status, result.error);
	} catch (err: unknown) {
		// This shouldn't normally happen, but if it does, we want to log it and kill the process
		console.error('Task execution failed:', err);
		process.exit(1);
	}
}

// Update a task
async function update(
	client: PinejsClient,
	tx: Tx,
	task: PartialTask,
	startedOnTime: Date,
	status: string,
	errorMessage?: string,
): Promise<void> {
	const attemptCount = task.attempt_count + 1;
	const body: AnyObject = {
		started_on__time: startedOnTime,
		ended_on__time: new Date(),
		status,
		attempt_count: attemptCount,
		...(errorMessage != null && { error_message: errorMessage }),
	};

	// Re-enqueue if the task failed but has retries left, remember that
	// executionCount includes the initial attempt while retryLimit does not
	if (status === 'failed' && attemptCount < task.attempt_limit) {
		body.status = 'pending';

		// Schedule next attempt using exponential backoff
		body.is_scheduled_to_execute_on__time = getNextAttemptTime(attemptCount);
	}

	// Patch current task
	await client.patch({
		resource: 'task',
		passthrough: {
			tx,
			req: permissions.root,
		},
		id: task.id,
		body,
	});

	// Create new task with same configuration if previous
	// iteration completed and has a cron expression
	if (
		['failed', 'success'].includes(body.status) &&
		task.is_scheduled_with__cron_expression != null
	) {
		await client.post({
			resource: 'task',
			passthrough: {
				tx,
				req: permissions.root,
			},
			body: {
				attempt_limit: task.attempt_limit,
				is_created_by__actor: task.is_created_by__actor,
				is_executed_by__handler: task.is_executed_by__handler,
				is_executed_with__parameter_set: task.is_executed_with__parameter_set,
				is_scheduled_with__cron_expression:
					task.is_scheduled_with__cron_expression,
				priority: task.priority,
			},
		});
	}
}
