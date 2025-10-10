import { expect } from 'chai';
import { setTimeout } from 'timers/promises';
const configPath =
	import.meta.dirname + '/fixtures/10-transaction-hooks/config.js';
const routesPath =
	import.meta.dirname + '/fixtures/10-transaction-hooks/routes.js';
import { testInit, testDeInit, testLocalServer } from './lib/test-init.js';
import { PineTest } from 'pinejs-client-supertest';
import supertest from 'supertest';

async function getHookLogs(
	pineTest: PineTest,
	testResourceId: number,
): Promise<string[]> {
	const { body: logs } = await pineTest
		.get<Array<{ hook_name: string }>>({
			apiPrefix: 'test/',
			resource: 'hook_log',
			options: {
				$select: 'hook_name',
				$filter: { test_resource_id: testResourceId },
				$orderby: { created_at: 'asc' },
			},
		})
		.expect(200);

	return logs.map((l) => l.hook_name);
}

describe('10 transaction hooks tests', function () {
	let pineTest: PineTest;
	let pineServer: Awaited<ReturnType<typeof testInit>>;

	before(async () => {
		pineServer = await testInit({ configPath, routesPath });
		pineTest = new PineTest({}, { app: testLocalServer });
	});

	beforeEach(async function () {
		await pineTest
			.delete({
				apiPrefix: 'test/',
				resource: 'hook_log',
			})
			.expect(200);
		await pineTest
			.delete({
				apiPrefix: 'test/',
				resource: 'test_resource',
			})
			.expect(200);
	});

	after(() => {
		testDeInit(pineServer);
	});

	describe('on("end") hook', function () {
		it('should run the end hook after a successful transaction', async () => {
			const testResourceId = 1;
			const response = await supertest(testLocalServer)
				.post('/test-tx-hooks')
				.send({
					name: 'test-end-hook',
					testResourceId,
					shouldRollback: false,
				});

			expect(response.status).to.equal(201);
			expect(response.body).to.have.property('id');

			// The hooks are completed async, so we need to wait a bit for them to run
			await setTimeout(100);

			const hookLogs = await getHookLogs(pineTest, testResourceId);
			expect(hookLogs).to.include('end');
			expect(hookLogs).to.not.include('rollback');
		});

		it('should not run the end hook when transaction is rolled back', async () => {
			const testResourceId = 5;
			const response = await supertest(testLocalServer)
				.post('/test-tx-hooks')
				.send({
					name: 'test-end-not-on-rollback',
					testResourceId,
					shouldRollback: true,
				});

			expect(response.status).to.equal(400);

			// The hooks are completed async, so we need to wait a bit for them to run
			await setTimeout(100);

			const hookLogs = await getHookLogs(pineTest, testResourceId);
			expect(hookLogs).to.not.include('end');
			expect(hookLogs).to.include('rollback');
		});

		it('should only fire end hook once per successful transaction', async () => {
			const testResourceId = 6;
			const response = await supertest(testLocalServer)
				.post('/test-tx-hooks')
				.send({
					name: 'test-end-once',
					testResourceId,
					shouldRollback: false,
				});

			expect(response.status).to.equal(201);

			// The hooks are completed async, so we need to wait a bit for them to run
			await setTimeout(100);

			const hookLogs = await getHookLogs(pineTest, testResourceId);
			const endCount = hookLogs.filter((h) => h === 'end').length;
			expect(endCount).to.equal(1);
		});

		it('should persist data when end hook runs', async () => {
			const testResourceId = 7;
			const response = await supertest(testLocalServer)
				.post('/test-tx-hooks')
				.send({
					name: 'test-end-data-persist',
					testResourceId,
					shouldRollback: false,
				});

			expect(response.status).to.equal(201);

			// The hooks are completed async, so we need to wait a bit for them to run
			await setTimeout(100);

			// Verify the test resource was created and persisted
			const { body: resources } = await pineTest
				.get({
					apiPrefix: 'test/',
					resource: 'test_resource',
					options: {
						$filter: { name: 'test-end-data-persist' },
					},
				})
				.expect(200);

			expect(resources).to.have.lengthOf(1);
			expect(resources[0]).to.have.property('name', 'test-end-data-persist');

			// And the end hook should have executed
			const hookLogs = await getHookLogs(pineTest, testResourceId);
			expect(hookLogs).to.include('end');
		});
	});

	describe('on("rollback") hook', function () {
		it('should run the rollback hook when a transaction is rolled back', async () => {
			const testResourceId = 2;
			const response = await supertest(testLocalServer)
				.post('/test-tx-hooks')
				.send({
					name: 'test-rollback-hook',
					testResourceId,
					shouldRollback: true,
				});

			expect(response.status).to.equal(400);
			expect(response.body).to.have.property('error');
			expect(response.body.error).to.equal('Transaction intentionally failed');

			// The hooks are completed async, so we need to wait a bit for them to run
			await setTimeout(100);

			const hookLogs = await getHookLogs(pineTest, testResourceId);
			expect(hookLogs).to.include('rollback');
			expect(hookLogs).to.not.include('end');
		});

		it('should not persist data when transaction is rolled back', async () => {
			const testResourceId = 3;
			const response = await supertest(testLocalServer)
				.post('/test-tx-hooks')
				.send({
					name: 'test-rollback-data',
					testResourceId,
					shouldRollback: true,
				});

			expect(response.status).to.equal(400);

			// The hooks are completed async, so we need to wait a bit for them to run
			await setTimeout(100);

			const { body: resources } = await pineTest
				.get({
					apiPrefix: 'test/',
					resource: 'test_resource',
					options: {
						$filter: { name: 'test-rollback-data' },
					},
				})
				.expect(200);

			expect(resources).to.have.lengthOf(0);

			const hookLogs = await getHookLogs(pineTest, testResourceId);
			expect(hookLogs).to.include('rollback');
		});

		it('should only fire rollback hook once per rolled back transaction', async () => {
			const testResourceId = 4;
			const response = await supertest(testLocalServer)
				.post('/test-tx-hooks')
				.send({
					name: 'test-rollback-once',
					testResourceId,
					shouldRollback: true,
				});

			expect(response.status).to.equal(400);

			// The hooks are completed async, so we need to wait a bit for them to run
			await setTimeout(100);

			const hookLogs = await getHookLogs(pineTest, testResourceId);
			const rollbackCount = hookLogs.filter((h) => h === 'rollback').length;
			expect(rollbackCount).to.equal(1);
		});
	});
});
