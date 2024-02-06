import { expect } from 'chai';
import { strict } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { PineTest } from 'pinejs-client-supertest';
import { testInit, testDeInit, testLocalServer } from './lib/test-init';
import { tasks as tasksEnv } from '../src/config-loader/env';
import type { Task } from '../src/sbvr-api/tasks';
import * as cronParser from 'cron-parser';

const configPath = __dirname + '/fixtures/08-tasks/config.js';
const taskHandlersPath = __dirname + '/fixtures/08-tasks/task-handlers.js';

const actorId = 1;

// Wait for a condition to be true, or throw an error if it doesn't happen in time.
async function waitFor(checkFn: () => Promise<boolean>): Promise<void> {
	const maxCount = 10;
	for (let i = 1; i <= maxCount; i++) {
		console.log(`Waiting (${i}/${maxCount})...`);
		await setTimeout(tasksEnv.queueIntervalMS);
		if (await checkFn()) {
			return;
		}
	}
	throw new Error('waitFor timed out');
}

// Create a task and return it
async function createTask(
	pineTest: PineTest,
	apikey: string,
	task: Partial<Task>,
): Promise<Task> {
	const { body: createdTask } = await pineTest
		.post({
			resource: 'task',
			body: {
				key: randomUUID(),
				is_executed_with__api_prefix: '/example/',
				apikey,
				...task,
			},
		})
		.expect(201);
	return createdTask as Task;
}

// Get a task, assert it has expected properties, and return it
async function expectTask(
	pineTest: PineTest,
	id: number,
	expected: Partial<Task>,
): Promise<Task> {
	const { body: updatedTask } = await pineTest
		.get({
			resource: 'task',
			id,
		})
		.expect(200);
	expect(updatedTask.is_created_by__actor).to.equal(actorId);
	Object.entries(expected).forEach(([key, value]) => {
		expect(updatedTask).to.have.property(key, value);
	});
	return updatedTask;
}

describe('08 task tests', function () {
	let pineServer: Awaited<ReturnType<typeof testInit>>;
	let pineTest: PineTest;
	let apikey: string;
	before(async () => {
		pineServer = await testInit({
			configPath,
			deleteDb: true,
			taskHandlersPath,
		});
		pineTest = new PineTest(
			{
				apiPrefix: 'tasks/',
			},
			{
				app: testLocalServer,
			},
		);

		// Create an API key for future use.
		apikey = randomUUID();
		await pineTest
			.post({
				apiPrefix: 'Auth/',
				resource: 'api_key',
				body: {
					key: apikey,
					is_of__actor: actorId,
					permissions: [],
				},
			})
			.expect(201);
	});

	after(async () => {
		testDeInit(pineServer);
	});

	describe('tasks', () => {
		it('should execute tasks FIFO by default', async () => {
			// This task should be executed first
			const name1 = randomUUID();
			const task1 = await createTask(pineTest, apikey, {
				is_executed_by__handler: 'create_device',
				is_executed_with__parameter_set: {
					name: name1,
					type: randomUUID(),
				},
			});

			// This task should be executed second
			const name2 = randomUUID();
			const task2 = await createTask(pineTest, apikey, {
				is_executed_by__handler: 'create_device',
				is_executed_with__parameter_set: {
					name: name2,
					type: randomUUID(),
				},
			});

			// Assert the device records were created in the expected order
			await waitFor(async () => {
				const { body: devices } = (await pineTest
					.get({
						apiPrefix: 'example/',
						resource: 'device',
						options: {
							$select: ['created_at', 'name'],
							$filter: {
								name: {
									$in: [name1, name2],
								},
							},
						},
					})
					.expect(200)) as {
					body: Array<{ created_at: string; name: string }>;
				};
				const sorted = devices.sort((a, b) =>
					a.created_at.localeCompare(b.created_at),
				);
				return (
					sorted.length === 2 &&
					sorted[0].name === name1 &&
					sorted[1].name === name2
				);
			});

			// Assert the task records were updated as expected
			for (const id of [task1.id, task2.id]) {
				const task = await expectTask(pineTest, id, {
					status: 'success',
					error_message: null,
					attempt_count: 1,
				});

				// Assert that timestamps are not null
				strict(task.started_on__time, 'started_on__time is null');
				strict(task.ended_on__time, 'ended_on__time is null');

				// Parse and check dates
				expect(new Date(task.started_on__time)).to.be.instanceOf(Date);
				expect(new Date(task.ended_on__time)).to.be.instanceOf(Date);
				expect(new Date(task.ended_on__time).getTime()).to.be.greaterThan(
					new Date(task.started_on__time).getTime(),
				);
			}
		});

		it('should execute tasks with higher priority first', async () => {
			// This task should be executed first
			const name1 = randomUUID();
			const name2 = randomUUID();
			await Promise.all([
				createTask(pineTest, apikey, {
					is_executed_by__handler: 'create_device',
					is_executed_with__parameter_set: {
						name: name1,
						type: randomUUID(),
					},
					priority: 1,
				}),
				createTask(pineTest, apikey, {
					is_executed_by__handler: 'create_device',
					is_executed_with__parameter_set: {
						name: name2,
						type: randomUUID(),
					},
					priority: 2,
				}),
			]);

			// Assert the device records were created in the expected order
			await waitFor(async () => {
				const { body: devices } = (await pineTest
					.get({
						apiPrefix: 'example/',
						resource: 'device',
						options: {
							$select: ['created_at', 'name'],
							$filter: {
								name: {
									$in: [name1, name2],
								},
							},
						},
					})
					.expect(200)) as {
					body: Array<{ created_at: string; name: string }>;
				};
				const sorted = devices.sort((a, b) =>
					a.created_at.localeCompare(b.created_at),
				);
				return (
					sorted.length === 2 &&
					sorted[0].name === name2 &&
					sorted[1].name === name1
				);
			});
		});

		it('should execute on specified future date', async () => {
			// Create a task to create a new device record in 3s
			const name = randomUUID();
			let task = await createTask(pineTest, apikey, {
				is_executed_by__handler: 'create_device',
				is_executed_with__parameter_set: {
					name,
					type: randomUUID(),
				},
				is_scheduled_to_execute_on__time: new Date(Date.now() + 3000),
			});

			// Assert the task handler created the expected device record
			await waitFor(async () => {
				const { body: devices } = await pineTest
					.get({
						apiPrefix: 'example/',
						resource: 'device',
						options: {
							$filter: {
								name,
							},
						},
					})
					.expect(200);
				return devices.length === 1;
			});

			// Assert the task record was updated as expected
			task = await expectTask(pineTest, task.id, {
				status: 'success',
				error_message: null,
				attempt_count: 1,
			});

			// Assert that timestamps are not null
			strict(task.started_on__time, 'started_on__time is null');
			strict(task.ended_on__time, 'ended_on__time is null');
			strict(
				task.is_scheduled_to_execute_on__time,
				'is_scheduled_to_execute_on__time is null',
			);

			// Parse dates once and reuse them
			const started = new Date(task.started_on__time).getTime();
			const ended = new Date(task.ended_on__time).getTime();
			const scheduled = new Date(
				task.is_scheduled_to_execute_on__time,
			).getTime();
			const created = new Date(task.created_at).getTime();

			// Check if end time is greater than start time
			expect(ended).to.be.greaterThan(started);

			// Check if the task was created before it was started
			expect(created).to.be.lessThan(started);

			// Calculate the earliest and latest start times based on queue interval
			const earliest = scheduled - tasksEnv.queueIntervalMS;
			const latest = scheduled + tasksEnv.queueIntervalMS;

			// Check if the start time was within the expected range
			expect(started)
				.to.be.greaterThanOrEqual(earliest)
				.and.lessThanOrEqual(latest);
		});

		it('should set scheduled execution time when cron expression is provided', async () => {
			// Create a task to create a new device record in 3s
			const cron = '0 0 2,8,12,14 * * *';
			const expectedSchedule = cronParser.parseExpression(cron).next().toDate();
			const task = await createTask(pineTest, apikey, {
				is_executed_by__handler: 'create_device',
				is_executed_with__parameter_set: {
					name: randomUUID(),
					type: randomUUID(),
				},
				is_scheduled_with__cron_expression: cron,
			});

			// Assert schedule properties are not null
			strict(
				task.is_scheduled_with__cron_expression,
				'is_scheduled_with__cron_expression is null',
			);
			strict(
				task.is_scheduled_to_execute_on__time,
				'is_scheduled_to_execute_on__time is null',
			);

			// Check the calculated scheduled time matches the expected time
			expect(
				new Date(task.is_scheduled_to_execute_on__time).getTime(),
			).to.equal(expectedSchedule.getTime());
		});

		it('should not immediately execute tasks scheduled to execute in the future', async () => {
			// Create a task to create a new device record in 3s
			const name = randomUUID();
			const task = await createTask(pineTest, apikey, {
				is_executed_by__handler: 'create_device',
				is_executed_with__parameter_set: {
					name,
					type: randomUUID(),
				},
				is_scheduled_to_execute_on__time: new Date(Date.now() + 30000),
			});

			// Wait a few seconds to ensure the task is not executed immediately
			await setTimeout(3000);

			// Assert the task record was not updated
			await expectTask(pineTest, task.id, {
				status: 'pending',
				error_message: null,
				started_on__time: null,
				ended_on__time: null,
				attempt_count: 0,
			});

			// Assert the scheduled device creation has not yet occurred
			const { body: devices } = await pineTest
				.get({
					apiPrefix: 'example/',
					resource: 'device',
					options: {
						$filter: {
							name,
						},
					},
				})
				.expect(200);
			expect(devices.length).to.equal(0);
		});

		it('should retry tasks on failure when attempt limit exceeds count', async () => {
			// Create a task with retries
			const attemptLimit = 2;
			const task = await createTask(pineTest, apikey, {
				is_executed_by__handler: 'will_fail',
				attempt_limit: attemptLimit,
			});

			// Assert the task handler created the expected device record
			await waitFor(async () => {
				const { body: updatedTask } = (await pineTest
					.get({
						resource: 'task',
						id: task.id,
						options: {
							$select: ['status', 'error_message', 'attempt_count'],
						},
					})
					.expect(200)) as {
					body: Pick<Task, 'status' | 'error_message' | 'attempt_count'>;
				};
				return (
					updatedTask.status === 'failed' &&
					updatedTask.error_message === 'This task is supposed to fail' &&
					updatedTask.attempt_count === attemptLimit
				);
			});
		});

		it('should create new tasks for completed tasks with a cron string', async () => {
			const cron = '0 0 10 1 1 *';

			// Test both success and failure cases
			['success', 'failed'].forEach(async (status) => {
				const handler = status === 'success' ? 'create_device' : 'will_fail';
				const name = randomUUID();
				await createTask(pineTest, apikey, {
					is_executed_by__handler: handler,
					is_scheduled_with__cron_expression: cron,
					is_scheduled_to_execute_on__time: new Date(Date.now() + 3000),
					is_executed_with__parameter_set: {
						name,
					},
				});

				const nextExecutionDate = cronParser
					.parseExpression(cron)
					.next()
					.toDate();
				await waitFor(async () => {
					const { body: tasks } = (await pineTest
						.get({
							resource: 'task',
							options: {
								$select: ['status', 'is_scheduled_to_execute_on__time'],
								$filter: {
									is_scheduled_with__cron_expression: cron,
									is_executed_with__parameter_set: {
										name,
									},
								},
							},
						})
						.expect(200)) as {
						body: Array<
							Pick<Task, 'status' | 'is_scheduled_to_execute_on__time'>
						>;
					};
					const pendingTask = tasks.find((t) => t.status === 'pending');
					const completedTask = tasks.find((t) => t.status === status);
					return (
						tasks.length === 2 &&
						completedTask != null &&
						pendingTask != null &&
						pendingTask.is_scheduled_to_execute_on__time === nextExecutionDate
					);
				});
			});
		});

		it('should not allow tasks with invalid handler params', async () => {
			// Handler requires 'name' and 'type' params, but passing 'foo' param
			await pineTest
				.post({
					resource: 'task',
					body: {
						key: randomUUID(),
						is_executed_with__api_prefix: '/example/',
						apikey,
						is_executed_by__handler: 'create_device',
						is_executed_with__parameter_set: {
							foo: 'bar',
						},
					},
				})
				.expect(
					400,
					`"Invalid parameter set: data must have required property 'name'"`,
				);
		});
	});
});
