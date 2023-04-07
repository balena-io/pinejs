import { setTimeout } from 'node:timers/promises';
import { randomUUID } from 'node:crypto';
import { PineTest } from 'pinejs-client-supertest';
import * as supertest from 'supertest';
import { testInit, testDeInit, testLocalServer } from './lib/test-init';

const configPath = __dirname + '/fixtures/07-tasks/config';
const taskHandlersPath = __dirname + '/fixtures/07-tasks/task-handlers';

async function waitFor(checkFn: () => Promise<boolean>): Promise<void> {
	const maxCount = 10;
	for (let i = 1; i <= maxCount; i++) {
		console.log(`Waiting (${i}/${maxCount})...`);
		await setTimeout(250);
		if (await checkFn()) {
			return;
		}
	}
	throw new Error('waitFor timed out');
}

describe('07 task tests', function () {
	let pineServer: Awaited<ReturnType<typeof testInit>>;
	let pineTest: PineTest;
	let apikey: string;
	before(async () => {
		pineServer = await testInit({
			configPath,
			taskHandlersPath,
		});
		pineTest = new PineTest({}, { app: testLocalServer });

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
		it('create a task', async () => {
			// Create a task using the token.
			const name = randomUUID();
			const now = new Date();
			await pineTest
				.post({
					apiPrefix: 'tasks/',
					resource: 'task',
					body: {
						key: 'foobar-1',
						is_executed_by__handler: 'foobar',
						is_executed_with__parameter_set: {
							name,
							type: randomUUID(),
						},
						start_time: new Date(now.getTime() + 500),
						apikey,
					},
				})
				.expect(201);

			await waitFor(async () => {
				const { body } = await supertest(testLocalServer)
					.get(`/example/device?$filter=name eq '${name}'`)
					.expect(200);
				return body.d.length === 1;
			});
		});
	});
});
