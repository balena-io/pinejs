import * as nodeSchedule from 'node-schedule';
import { AnyObject } from 'pinejs-client-core';

import * as errors from './errors';
import { addPureHook } from './hooks';
import * as sbvrUtils from './sbvr-utils';
import type * as Db from '../database-layer/db';
import { permissions } from '../server-glue/module';

const apiRoot = 'tasks';
const DEFAULT_RETRY_LIMIT = 10;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const modelText: string = require(`./${apiRoot}.sbvr`);

interface Task {
	id: number;
	key: string;
	is_executed_by__handler: string;
	is_executed_with__parameter_set: any;
	start_time: Date;
	retry_limit: number;
	error_count: number;
	last_error?: string;
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
function getClient(): sbvrUtils.PinejsClient {
	return new sbvrUtils.PinejsClient(`/${apiRoot}/`) as sbvrUtils.LoggingClient;
}

/**
 * Validates a task.
 * @param values - Request values to validate
 */
function validate(values: AnyObject) {
	// Assert that the provided date is in the future.
	if (values.start_time == null) {
		throw new errors.BadRequestError('Must specify a start time for the task');
	}
	if (new Date(values.start_time).getTime() <= new Date().getTime()) {
		throw new errors.BadRequestError('Task start time must be in the future');
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
	if (handler.parameters != null && parameterSet == null) {
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
async function execute(task: Task): Promise<void> {
	const client = getClient();
	try {
		await taskHandlers[task.is_executed_by__handler].callback(
			task.is_executed_with__parameter_set,
		);

		// Execution was a success so update the task as such.
		await client.patch({
			resource: 'task',
			id: task.id,
			body: {
				status: 'success',
			},
		});
	} catch (err: any) {
		// Re-schedule if the retry limit has not been reached.
		task.error_count++;
		if (task.error_count < task.retry_limit) {
			await client.patch({
				resource: 'task',
				id: task.id,
				body: {
					error_count: task.error_count,
					last_error: err.message,
					// TODO: Improve backoff time logic.
					start_time: new Date(Date.now() + 10000 * task.error_count),
				},
			});
		} else {
			// Execution failed so update the task as such.
			await client.patch({
				resource: 'task',
				id: task.id,
				body: {
					status: 'failed',
					error_count: task.error_count,
					last_error: err.message,
				},
			});
		}
	}
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

export const setup = async (tx: Db.Tx) => {
	// Validate and schedule new tasks for future execution.
	addPureHook('POST', apiRoot, 'task', {
		POSTPARSE: async ({ req, request }) => {
			// Set the actor.
			request.values.is_executed_by__actor = getActor(req);

			// Set defaults.
			request.values.status = 'pending';
			request.values.retry_count = 0;
			request.values.retry_limit ??= DEFAULT_RETRY_LIMIT;
			request.values.error_count = 0;

			// Validate the task.
			validate(request.values);
		},
		POSTRUN: async ({ api, result }) => {
			const task = (await api.get({
				resource: 'task',
				id: result,
			})) as Task;
			nodeSchedule.scheduleJob(`${task.id}`, task.start_time, async () => {
				await execute(task);
			});
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

	// Find and re-schedule/execute pending tasks on startup.
	const client = getClient();
	const tasks = (await client.get({
		resource: 'task',
		passthrough: {
			req: permissions.root,
			tx,
		},
		options: {
			$filter: {
				status: 'pending',
			},
		},
	})) as Task[];
	const now = new Date();
	for (const task of tasks) {
		if (task.start_time.getTime() < now.getTime()) {
			// Execute pending tasks that should have already been executed.
			await execute(task);
		} else if (task.start_time.getTime() > now.getTime()) {
			// Re-schedule pending tasks that have not yet been executed.
			nodeSchedule.scheduleJob(task.key, task.start_time, async () => {
				await execute(task);
			});
		}
	}
};

/**
 * Register a new task handler.
 * @param name - task handler unique name
 * @param parameters - task handler parameters definition
 * @param callback - task handler callback to execute
 *
 * @example
 * addTaskHandler('myTaskHandler', {
 *     message: 'string',
 * }, async ({ message }) => {
 *    console.log(message);
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
