import { expect } from 'chai';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { PineTest } from 'pinejs-client-supertest';
import { testInit, testDeInit, testLocalServer } from './lib/test-init';
import { tasks as tasksEnv } from '../src/config-loader/env';

const configPath = __dirname + '/fixtures/07-tasks/config';
const taskHandlersPath = __dirname + '/fixtures/07-tasks/task-handlers';

// Wait for a condition to be true, or throw an error if it doesn't happen in time.
async function waitFor(checkFn: () => Promise<boolean>): Promise<void> {
	const maxCount = 10;
	for (let i = 1; i <= maxCount; i++) {
		console.log(`Waiting (${i}/${maxCount})...`);
		await setTimeout(tasksEnv.pollIntervalMS);
		if (await checkFn()) {
			return;
		}
	}
	throw new Error('waitFor timed out');
}

// Calculate number of milliseconds in the future to schedule a task.
function getFutureMS(): number {
	return tasksEnv.pollIntervalMS + tasksEnv.pollIntervalMS / 10;
}

describe('07 task tests', function () {
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
					is_of__actor: 1,
					permissions: [],
				},
			})
			.expect(201);
	});

	after(async () => {
		testDeInit(pineServer);
	});

	describe('tasks', () => {
		it('should execute with specified handler and parameters', async () => {
			// Create a task to create a new device record in 500ms.
			const name = randomUUID();
			const { body: task } = await pineTest
				.post({
					resource: 'task',
					body: {
						is_for__model_name: 'example',
						key: randomUUID(),
						is_executed_by__handler: 'create_device',
						is_executed_with__parameter_set: {
							name,
							type: randomUUID(),
						},
						start_time: new Date(new Date().getTime() + getFutureMS()),
						apikey,
					},
				})
				.expect(201);

			// Assert the expected record was created.
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

			// Assert the expected task_run record exists.
			const { body: taskRuns } = await pineTest.get({
				resource: 'task_run',
				options: {
					$select: ['end_time', 'error', 'start_time', 'status'],
					$filter: {
						is_for__task: task.id,
					},
				},
			});
			expect(taskRuns.length).to.equal(1);
			expect(new Date(taskRuns[0].end_time).getTime()).to.be.greaterThan(
				new Date(taskRuns[0].start_time).getTime(),
			);
			expect(taskRuns[0].error).to.equal(null);
			expect(taskRuns[0].status).to.equal('success');

			// Assert the task record was updated as expected.
			const { body: updatedTask } = await pineTest
				.get({
					resource: 'task',
					id: task.id,
					options: {
						$select: [
							'error_count',
							'is_scheduled_by__actor',
							'last_error',
							'run_count',
							'start_time',
							'is_complete',
						],
					},
				})
				.expect(200);
			expect(new Date(updatedTask.start_time)).to.be.instanceOf(Date);
			expect(updatedTask.error_count).to.equal(0);
			expect(updatedTask.is_scheduled_by__actor).to.equal(1);
			expect(updatedTask.last_error).to.equal(null);
			expect(updatedTask.run_count).to.equal(1);
			expect(updatedTask.is_complete).to.equal(true);
		});

		it('should cancel scheduled execution on deletion', async () => {
			// Create a task to create a record in a few seconds, but delete the task before it executes.
			const futureMS = getFutureMS();
			const name = randomUUID();
			const { body: task } = await pineTest
				.post({
					resource: 'task',
					body: {
						is_for__model_name: 'example',
						key: randomUUID(),
						is_executed_by__handler: 'create_device',
						is_executed_with__parameter_set: {
							name,
							type: randomUUID(),
						},
						start_time: new Date(new Date().getTime() + futureMS),
						apikey,
					},
				})
				.expect(201);

			// Delete the task.
			await pineTest
				.delete({
					resource: 'task',
					id: task.id,
				})
				.expect(200);

			// Wait until when the task should have executed if it wasn't deleted,
			// and check that the device record wasn't created.
			await setTimeout(futureMS * 2);
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
			expect(devices).to.deep.equal([]);

			// Assert no task_run records exist for this task.
			const { body: taskRuns } = await pineTest.get({
				resource: 'task_run',
				options: {
					$select: ['id'],
					$filter: {
						is_for__task: task.id,
					},
				},
			});
			expect(taskRuns.length).to.equal(0);
		});

		it('should retry on execution failures', async () => {
			const { body: task } = await pineTest
				.post({
					resource: 'task',
					body: {
						is_for__model_name: 'example',
						key: randomUUID(),
						is_executed_by__handler: 'throw_error',
						retry_limit: 1,
						start_time: new Date(new Date().getTime() + getFutureMS()),
						apikey,
					},
				})
				.expect(201);

			// Wait until when the task should have executed a couple of times.
			// Assert the task retried a couple of times and ultimately failed.
			await waitFor(async () => {
				const { body: updatedTask } = await pineTest
					.get({
						resource: 'task',
						id: task.id,
						options: {
							$select: [
								'error_count',
								'last_error',
								'run_count',
								'is_complete',
							],
						},
					})
					.expect(200);
				return (
					updatedTask.error_count === 1 &&
					updatedTask.last_error !== null &&
					updatedTask.run_count === 1 &&
					updatedTask.is_complete === true
				);
			});

			// Assert the expected task_run exists.
			const { body: taskRuns } = await pineTest.get({
				resource: 'task_run',
				options: {
					$select: ['end_time', 'error', 'start_time', 'status'],
					$filter: {
						is_for__task: task.id,
					},
				},
			});
			expect(taskRuns.length).to.equal(1);
			expect(new Date(taskRuns[0].end_time).getTime()).to.be.greaterThan(
				new Date(taskRuns[0].start_time).getTime(),
			);
			expect(taskRuns[0].error).to.equal('From throw_error task handler');
			expect(taskRuns[0].status).to.equal('failed');
		});
	});
});
