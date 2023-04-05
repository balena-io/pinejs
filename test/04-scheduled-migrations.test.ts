import * as supertest from 'supertest';
import { ChildProcess } from 'child_process';
import { testInit, testDeInit, testLocalServer } from './lib/test-init';
import * as serialize from 'serialize-javascript';
import type { AsyncMigration } from '../src/migrator/utils';

const fixturesBasePath = __dirname + '/fixtures/02-sync-migrator/';

type TestDevice = {
	created_at: Date;
	modified_at: Date;
	id: number;
	name: string;
	note: string;
	type: string;
};

async function executeModelBeforeMigrations(
	modelFixturePath = fixturesBasePath + '00-execute-model',
) {
	// start pine instace with a configuration without migrations to execute the model in the DB once.
	// model has an initSqlPath declared so that the database gets filled first
	const executeModelsOnceBeforeTesting: ChildProcess = await testInit(
		modelFixturePath,
		true,
	);
	testDeInit(executeModelsOnceBeforeTesting);
}

describe('04 Scheduled Migrations', async function () {
	this.timeout(30000);

	let pineTestInstance: ChildProcess;
	before(async () => {
		await executeModelBeforeMigrations();
		pineTestInstance = await testInit(
			fixturesBasePath + '01-migrations',
			false,
		);
	});
	after(() => {
		testDeInit(pineTestInstance);
	});

	it('should be able to create scheduled migrations', async () => {
		const callback = () => {
			console.log('hello world');
		};

		const res = await supertest(testLocalServer)
			.post('/migrations/scheduled_migration')
			.send({
				migration_key: 'foobar',
				execution_time: new Date().toISOString(),
				callback: serialize(callback),
			})
			.expect(201);
		console.log('=== result:', res.body);
	});
});
