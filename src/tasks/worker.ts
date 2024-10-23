import type { ValidateFunction } from 'ajv';
import { setTimeout } from 'node:timers/promises';
import type { AnyObject } from 'pinejs-client-core';
import { tasks as tasksEnv } from '../config-loader/env';
import type * as Db from '../database-layer/db';
import * as permissions from '../sbvr-api/permissions';
import { PinejsClient } from '../sbvr-api/sbvr-utils';
import { sbvrUtils } from '../server-glue/module';
import { ajv } from './common';
import type { Task } from './tasks';
import type TasksModel from './tasks';

interface TaskArgs {
	api: PinejsClient;
	params: AnyObject;
}

type TaskResponse = Promise<{
	status: Task['Read']['status'];
	error?: string;
}>;

export interface TaskHandler {
	name: string;
	fn: (options: TaskArgs) => TaskResponse;
	validate?: ValidateFunction;
}

type PartialTask = Pick<
	Task['Read'],
	| 'id'
	| 'is_created_by__actor'
	| 'is_executed_by__handler'
	| 'is_executed_with__parameter_set'
	| 'is_scheduled_with__cron_expression'
	| 'attempt_count'
	| 'attempt_limit'
>;

// Map of column names with SBVR names used in SELECT queries
const selectColumns = Object.entries({
	id: 'id',
	'is executed by-handler': 'is_executed_by__handler',
	'is executed with-parameter set': 'is_executed_with__parameter_set',
	'is scheduled with-cron expression': 'is_scheduled_with__cron_expression',
	'attempt count': 'attempt_count',
	'attempt limit': 'attempt_limit',
	'is created by-actor': 'is_created_by__actor',
} satisfies Record<string, keyof Task['Read']>)
	.map(([key, value]) => `t."${key}" AS "${value}"`)
	.join(', ');

// The worker is responsible for executing tasks in the queue.
// It polls the database for tasks to execute. It will execute
// tasks in parallel up to a certain concurrency limit.
export class Worker {
	public handlers: Record<string, TaskHandler> = {};
	private readonly concurrency: number;
	private readonly interval: number;
	private running = false;
	private executing = 0;

	constructor(private readonly client: PinejsClient<TasksModel>) {
		this.concurrency = tasksEnv.queueConcurrency;
		this.interval = tasksEnv.queueIntervalMS;
	}

	// Check if instance can execute more tasks
	private canExecute(): boolean {
		return (
			this.executing < this.concurrency && Object.keys(this.handlers).length > 0
		);
	}

	private async execute(task: PartialTask, tx: Db.Tx): Promise<void> {
		this.executing++;
		try {
			// Get specified handler
			const handler = this.handlers[task.is_executed_by__handler];
			const startedOnTime = new Date();

			// This should never actually happen
			if (handler == null) {
				await this.update(
					tx,
					task,
					startedOnTime,
					'failed',
					'Matching task handler not found, this should never happen!',
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
				await this.update(
					tx,
					task,
					startedOnTime,
					'failed',
					`Invalid parameter set: ${ajv.errorsText(handler.validate.errors)}`,
				);
				return;
			}

			// Execute handler and update task with results
			let status: Task['Read']['status'] = 'queued';
			let error: string | undefined;
			try {
				const results = await handler.fn({
					api: new PinejsClient({}),
					params: task.is_executed_with__parameter_set ?? {},
				});
				status = results.status;
				error = results.error;
			} finally {
				await this.update(tx, task, startedOnTime, status, error);
			}
		} catch (err) {
			// This shouldn't happen, but if it does we want to log and kill the process
			console.error(
				`Failed to execute task ${task.id} with handler ${task.is_executed_by__handler}:`,
				err,
			);
			process.exit(1);
		} finally {
			this.executing--;
		}
	}

	// Update task and schedule next attempt if needed
	private async update(
		tx: Db.Tx,
		task: PartialTask,
		startedOnTime: Date,
		status: Task['Read']['status'],
		errorMessage?: string,
	): Promise<void> {
		const attemptCount = task.attempt_count + 1;
		const body: Partial<Task['Write']> = {
			started_on__time: startedOnTime,
			ended_on__time: new Date(),
			status,
			attempt_count: attemptCount,
			...(errorMessage != null && { error_message: errorMessage }),
		};

		// Re-enqueue if the task failed but has retries left, remember that
		// attemptCount includes the initial attempt while attempt_limit does not
		if (status === 'failed' && attemptCount < task.attempt_limit) {
			body.status = 'queued';

			// Schedule next attempt using exponential backoff
			body.is_scheduled_to_execute_on__time =
				this.getNextAttemptTime(attemptCount);
		}

		// Patch current task
		await this.client.patch({
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
			body.status != null &&
			['failed', 'succeeded'].includes(body.status) &&
			task.is_scheduled_with__cron_expression != null
		) {
			await this.client.post({
				resource: 'task',
				passthrough: {
					tx,
					req: permissions.root,
				},
				options: {
					returnResource: false,
				},
				body: {
					attempt_limit: task.attempt_limit,
					is_created_by__actor: task.is_created_by__actor,
					is_executed_by__handler: task.is_executed_by__handler,
					is_executed_with__parameter_set: task.is_executed_with__parameter_set,
					is_scheduled_with__cron_expression:
						task.is_scheduled_with__cron_expression,
				},
			});
		}
	}

	// Calculate next attempt time using exponential backoff
	private getNextAttemptTime(attempt: number): Date | null {
		const delay = Math.ceil(Math.exp(Math.min(10, attempt)));
		return new Date(Date.now() + delay);
	}

	// Poll for tasks and execute them
	// This is recursive and is spawned once per concurrency limit
	private poll(): void {
		let executed = false;
		void (async () => {
			try {
				if (!this.canExecute()) {
					return;
				}
				const handlerNames = Object.keys(this.handlers);
				if (handlerNames.length === 0) {
					// No handlers currently added so just wait for next poll in case one is added in the meantime
					return;
				}
				await sbvrUtils.db.transaction(async (tx) => {
					const result = await sbvrUtils.db.executeSql(
						`SELECT ${selectColumns}
						FROM task AS t
						WHERE
							t."is executed by-handler" IN (${handlerNames.map((_, index) => `$${index + 1}`).join(', ')}) AND
							t."status" = 'queued' AND
							t."attempt count" <= t."attempt limit" AND
							(
								t."is scheduled to execute on-time" IS NULL OR
								t."is scheduled to execute on-time" <= CURRENT_TIMESTAMP + $${handlerNames.length + 1} * INTERVAL '1 SECOND'
							)
						ORDER BY
							t."is scheduled to execute on-time" ASC,
							t."id" ASC
						LIMIT 1 FOR UPDATE SKIP LOCKED`,
						[...handlerNames, Math.ceil(this.interval / 1000)],
					);

					// Execute task if one was found
					if (result.rows.length > 0) {
						await this.execute(result.rows[0] as PartialTask, tx);
						executed = true;
					}
				});
			} catch (err) {
				console.error('Failed polling for tasks:', err);
			} finally {
				if (!executed) {
					await setTimeout(this.interval);
				}
				if (this.running) {
					this.poll();
				}
			}
		})();
	}

	public async stop(): Promise<void> {
		this.running = false;
	}

	// Start polling for tasks
	public async start(): Promise<void> {
		// Tasks only support postgres for now
		if (sbvrUtils.db.engine !== 'postgres') {
			throw new Error(
				'Database does not support tasks, giving up on starting worker',
			);
		}

		const handlerNames = Object.keys(this.handlers);

		// Check for any pending tasks with unknown handlers
		const tasksWithUnknownHandlers = await this.client.get({
			resource: 'task',
			passthrough: {
				req: permissions.root,
			},
			options: {
				$filter: {
					status: 'queued',
					...(handlerNames.length > 0 && {
						$not: {
							is_executed_by__handler: { $in: handlerNames },
						},
					}),
				},
			},
		});
		if (tasksWithUnknownHandlers.length > 0) {
			throw new Error(
				`Found tasks with unknown handlers: ${tasksWithUnknownHandlers
					.map((task) => `${task.id}(${task.is_executed_by__handler})`)
					.join(', ')}`,
			);
		}

		if (this.running === true) {
			return;
		}
		this.running = true;
		// Spawn children to poll for and execute tasks
		for (let i = 0; i < this.concurrency; i++) {
			this.poll();
		}
	}
}
