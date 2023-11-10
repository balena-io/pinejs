import * as nodeSchedule from 'node-schedule';
import { AnyObject } from 'pinejs-client-core';

import * as errors from './errors';
import { addPureHook } from './hooks';
import * as sbvrUtils from './sbvr-utils';
import { tasks as tasksEnv } from '../config-loader/env';
import type * as Db from '../database-layer/db';

const apiRoot = 'tasks';
const DEFAULT_RETRY_LIMIT = 10;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const modelText: string = require(`./${apiRoot}.sbvr`);

interface Task {
	id: number;
	error_count: number;
	is_executed_by__handler: string;
	is_executed_with__parameter_set: any;
	is_for__model_name: string;
	is_scheduled_by__actor: string;
	is_scheduled_with__cron_expression?: string;
	start_time: Date;
	key: string;
	last_error?: string;
	priority: number;
	retry_limit: number;
	run_count: number;
	is_complete: boolean;
}

interface TaskRun {
	id: number;
	end_time: Date;
	error?: string;
	is_for__task: {
		__id: number;
	};
	start_time: Date;
	status: string;
}

interface TaskHandler {
	parameters: {
		[key: string]: string;
	};
	callback: (parameterSet: any) => Promise<void>;
}

// TODO: Need to scope task handlers to model?
const taskHandlers: {
	[name: string]: TaskHandler;
} = {};

/**
 * Get and return actor from hook request object.
 * @param req - Hook request object
 * @returns Actor ID
 * @throws BadRequestError if actor is missing
 */
function getActor(req: sbvrUtils.HookReq): number {
	const actor = req.user?.actor ?? req.apiKey?.actor;
	if (actor == null) {
		throw new errors.BadRequestError(
			'Scheduling task with missing actor on req is not allowed',
		);
	}
	return actor;
}

/**
 * Create and return client for internal use.
 * @returns A /tasks pine client
 */
function getClient(tx: Db.Tx): sbvrUtils.PinejsClient {
	return new sbvrUtils.PinejsClient({
		apiPrefix: `/${apiRoot}/`,
		passthrough: {
			tx,
		},
	}) as sbvrUtils.LoggingClient;
}

/**
 * Validates a task.
 * @param values - Request values to validate
 */
function validate(values: AnyObject) {
	// Assert that the provided start time is at least a minute in the future.
	if (values.start_time == null) {
		throw new errors.BadRequestError('Must specify a start time for the task');
	}
	const now = new Date(new Date().getTime() + tasksEnv.pollIntervalMS);
	const startTime = new Date(values.start_time);
	if (startTime < now) {
		throw new errors.BadRequestError(
			`Task start time must be greater than ${tasksEnv.pollIntervalMS} milliseconds in the future`,
		);
	}

	// Assert that the requested handler exists.
	if (values.is_executed_by__handler == null) {
		throw new errors.BadRequestError(`Must specify a task handler to execute`);
	}
	if (taskHandlers[values.is_executed_by__handler] == null) {
		throw new errors.BadRequestError(
			`No task handler with name ${values.is_executed_by__handler} registered`,
		);
	}

	// Assert that the requested parameters match the handler.
	const handler = taskHandlers[values.is_executed_by__handler];
	const parameterSet = values.is_executed_with__parameter_set;
	if (Object.keys(handler.parameters).length > 0 && parameterSet == null) {
		throw new errors.BadRequestError(
			`Must specify parameters to execute task handler "${values.is_executed_by__handler}"`,
		);
	}

	if (parameterSet != null) {
		for (const parameterName of Object.keys(parameterSet)) {
			if (handler.parameters[parameterName] == null) {
				throw new errors.BadRequestError(
					`Task handler "${values.is_executed_by__handler}" does not accept parameter "${parameterName}"`,
				);
			}
			if (
				typeof parameterSet[parameterName] !== handler.parameters[parameterName]
			) {
				throw new errors.BadRequestError(
					`Task handler "${values.is_executed_by__handler}" parameter "${parameterName}" must be of type "${handler.parameters[parameterName]}"`,
				);
			}
		}
	}
}

/**
 * Execute a task, retrying and updating as necessary.
 * @param task - Task to execute
 */
async function execute(task: Task, db: Db.Database): Promise<void> {
	await db.transaction(async (tx) => {
		const client = getClient(tx);

		// Create task run record.
		const taskRun = (await client.post({
			resource: 'task_run',
			body: {
				is_for__task: task.id,
				start_time: new Date(),
				status: 'running',
			},
		})) as TaskRun;

		try {
			await taskHandlers[task.is_executed_by__handler].callback({
				...task.is_executed_with__parameter_set,
				tx,
			});

			// Execution was a success so update the task and task_run as such.
			await Promise.all([
				client.patch({
					resource: 'task_run',
					id: taskRun.id,
					body: {
						end_time: new Date(),
						status: 'success',
					},
				}),
				client.patch({
					resource: 'task',
					id: task.id,
					body: {
						run_count: task.run_count + 1,
						is_complete: true,
					},
				}),
			]);
		} catch (err: any) {
			await client.patch({
				resource: 'task_run',
				id: taskRun.id,
				body: {
					end_time: new Date(),
					status: 'failed',
					error: err.message,
				},
			});

			// Update the main task resource.
			// Mark as failed if all attempts have been exhausted or re-schedule.
			const body: AnyObject = {
				error_count: task.error_count + 1,
				last_error: err.message,
				run_count: task.run_count + 1,
			};
			if (body.error_count < task.retry_limit) {
				body.start_time = calculateNextAttemptDate(
					task.start_time,
					task.run_count,
				);
				console.log('next start_time:', body.start_time);
			} else {
				body.is_complete = true;
			}
			await client.patch({
				resource: 'task',
				id: task.id,
				body,
			});
		}
	});
}

// Calculate a date for the next attempt using the following exponential backoff formula:
//  nextAttemptDate = max(now, previousStartTime) + e^min(attempt, 10) seconds
function calculateNextAttemptDate(
	previousStartTime: Date,
	attempt: number,
): Date {
	const from = new Date(
		Math.max(new Date().getTime(), previousStartTime.getTime()),
	);
	const exponent = Math.exp(Math.min(attempt, 10));
	return new Date(from.getTime() + exponent * 1000);
}

export const config = {
	models: [
		{
			apiRoot,
			modelText,
			customServerCode: exports,
			migrations: {},
		},
	] as sbvrUtils.ExecutableModel[],
};

export const setup = async () => {
	// Validate and schedule new tasks for future execution.
	addPureHook('POST', apiRoot, 'task', {
		POSTPARSE: async ({ req, request }) => {
			// Set the actor.
			request.values.is_scheduled_by__actor = getActor(req);

			// Set defaults.
			request.values.error_count = 0;
			request.values.status = 'pending';
			request.values.retry_count = 0;
			request.values.run_count = 0;
			request.values.is_complete = false;
			request.values.retry_limit ??= DEFAULT_RETRY_LIMIT;
			request.values.priority ??= 1;

			// Validate the task.
			validate(request.values);
		},
	});

	// Cancel tasks when they are deleted.
	addPureHook('DELETE', apiRoot, 'task', {
		POSTRUN: async (args) => {
			const affectedIds = await sbvrUtils.getAffectedIds(args);
			for (const id of affectedIds) {
				nodeSchedule.cancelJob(`${id}`);
			}
		},
	});
};

let currentTask: string | undefined;
export async function postSetup(db: Db.Database): Promise<void> {
	setInterval(async () => {
		if (currentTask == null) {
			await db.transaction(async (tx) => {
				const result = await tx.executeSql(
					'SELECT t."id", t."error count" AS error_count, t."is executed by-handler" AS is_executed_by__handler, t."is executed with-parameter set" AS is_executed_with__parameter_set, t."is scheduled with-cron expression" AS is_scheduled_with__cron_expression, t."start time" AS start_time, t."key", t."retry limit" as retry_limit, t."run count" AS run_count FROM task AS t WHERE t."is complete"=false AND t."start time" > NOW() ORDER BY t."priority" DESC, t."start time" ASC LIMIT 1 FOR UPDATE SKIP LOCKED',
				);
				if (result.rows.length > 0) {
					const task = result.rows[0] as Task;
					currentTask = task.key;
					nodeSchedule.scheduleJob(task.start_time, async () => {
						await execute(task, db);
						currentTask = undefined;
					});
				}
			});
		}
	}, tasksEnv.pollIntervalMS);
}

/**
 * Register a new task handler.
 * @param name - task handler unique name
 * @param parameters - task handler parameters definition
 * @param callback - task handler callback to execute
 *
 * @example
 * addTaskHandler('myTaskHandler', {
 *		message: 'string',
 * }, async ({ message }) => {
 *		console.log(message);
 * });
 */
export const addTaskHandler = (
	name: string,
	parameters: TaskHandler['parameters'],
	callback: TaskHandler['callback'],
): void => {
	if (taskHandlers[name] != null) {
		throw new Error(`Task handler with name "${name}" already registered`);
	}
	taskHandlers[name] = {
		parameters,
		callback,
	};
};
