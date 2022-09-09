import * as supertest from 'supertest';
import { ChildProcess } from 'child_process';
import { assert, expect } from 'chai';
import { setTimeout } from 'timers';
import { dbModule } from '../src/server-glue/module';
import { testInit, testDeInit, testLocalServer } from './lib/test-init';
import { MigrationStatus } from '../src/migrator/utils';

const fixturesBasePath = __dirname + '/fixtures/03-async-migrator/';

type TestDevice = {
	created_at: Date;
	modified_at: Date;
	id: number;
	name: string;
	note: string;
	type: string;
};

async function executeModelBeforeMigrations(
	initFixturePath: string = fixturesBasePath + '00-execute-model',
) {
	// start pine instace with a configuration without migrations to execute the model in the DB once.
	// model has an initSqlPath declared so that the database gets filled first
	const executeModelsOnceBeforeTesting: ChildProcess = await testInit(
		initFixturePath,
		true,
	);
	try {
		await testDeInit(executeModelsOnceBeforeTesting);
	} catch (err: any) {
		console.log(err);
	}
}

// "@types/node" v12 backwards compatibility
function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
const getDbUnderTest = async function () {
	const initDbOptions = {
		engine:
			process.env.DATABASE_URL?.slice(
				0,
				process.env.DATABASE_URL?.indexOf(':'),
			) || 'postgres',
		params: process.env.DATABASE_URL || 'localhost',
	};
	return dbModule.connect(initDbOptions);
};

const getResourceWithOdataParams = async function (
	resource: string,
	odataParams?: string,
): Promise<TestDevice[]> {
	const res = await supertest(testLocalServer).get(
		`/example/${resource}${odataParams ? '?' + odataParams : ''}`,
	);
	return res?.body?.d || [];
};

const updateOneTableRow = async function (
	resource: string,
	id: number = 1,
	fact: string = 'name',
) {
	await supertest(testLocalServer)
		.patch(`/example/${resource}(${id})`)
		.send({
			[fact]: 'newData',
		})
		.expect(200);
};

const waitForAllDataMigrated = async function (
	resource: string,
): Promise<[TestDevice[], TestDevice[]]> {
	let result: TestDevice[] = [];
	let allResults: TestDevice[] = [];
	while (result?.length === 0 || result?.length !== allResults?.length) {
		result = await getResourceWithOdataParams(resource, '$filter=name eq note');
		allResults = await getResourceWithOdataParams(resource);
	}
	expect(result?.sort((a, b) => a.id - b.id)).to.eql(
		allResults?.sort((a, b) => a.id - b.id),
	);

	return [result, allResults];
};

const getMigrationStatus = async function (): Promise<MigrationStatus[]> {
	const res = await supertest(testLocalServer).get(
		'/migrations/migration_status',
	);
	return res?.body?.d || [];
};

describe('03 Async Migrations', async function () {
	describe('standard async migrations', function () {
		let pineFirstInstace: ChildProcess;

		before(async function () {
			await executeModelBeforeMigrations();
			const fixturePath = fixturesBasePath + '01-migrations';
			pineFirstInstace = await testInit(fixturePath, false);
		});

		after(async () => {
			await testDeInit(pineFirstInstace);
		});

		it('check /ping route is OK', async () => {
			await supertest(testLocalServer).get('/ping').expect(200, 'OK');
		});

		it('check /example/device is served by pinejs', async () => {
			const res = await supertest(testLocalServer)
				.get('/example/device')
				.expect(200);
			expect(res.body)
				.to.be.an('object')
				.that.has.ownProperty('d')
				.to.be.an('array');
		});

		it('check /migrations/migration is served by pinejs', async () => {
			const res = await supertest(testLocalServer)
				.get('/migrations/migration')
				.expect(200);
			expect(res.body)
				.to.be.an('object')
				.that.has.ownProperty('d')
				.to.be.an('array');
		});

		it('check /migrations/migration_status can be patched via pinejs', async () => {
			const res = await supertest(testLocalServer)
				.get('/migrations/migration_status')
				.expect(200);
			expect(res.body)
				.to.be.an('object')
				.that.has.ownProperty('d')
				.to.be.an('array');

			res.body.d.map(async (migration: MigrationStatus) => {
				await supertest(testLocalServer)
					.patch(`/migrations/migration_status('${migration.migration_key}')`)
					.send({
						run_count: 99,
					})
					.expect(200);
			});
		});

		it('should run one async migrator', async function () {
			let result: MigrationStatus[] = [];
			// active wait until 1 row has been migrated
			while (result.length === 0 || result[0]?.migrated_row_count < 1) {
				result = await getMigrationStatus();
			}

			const devices = await getResourceWithOdataParams('device');
			expect(devices).to.be.not.empty;
		});

		it('should complete / catch up data in one async migrator', async function () {
			// active wait to check if migrations have catched up
			let result: MigrationStatus[] = [];
			await waitForAllDataMigrated('device');
			// active wait as updating migration status after migrations have done takes some time.
			// dont want to wait for an artificial magic time delay.
			while (result.length === 0 || result[0]?.migrated_row_count !== 20) {
				result = await getMigrationStatus();
			}

			expect(result[0]?.migrated_row_count).to.equal(20);
		});

		it('should migrate future data change after first catch up', async function () {
			let result: MigrationStatus[] = [];

			const startTime = Date.now().valueOf();
			// first catch up is precondition from above test case.
			while (result.length === 0 || result[0]?.is_backing_off === false) {
				result = await getMigrationStatus();
			}
			const firstRowsMigrated = result[0]?.migrated_row_count;
			expect(firstRowsMigrated).to.be.greaterThan(0);

			await updateOneTableRow('device');
			await waitForAllDataMigrated('device');

			while (
				result.length === 0 ||
				result[0]?.migrated_row_count <= firstRowsMigrated
			) {
				// first catch up is precondition from above test case.
				result = await getMigrationStatus();
			}

			expect(result[0]?.migrated_row_count).to.be.greaterThan(0);
			expect(result[0]?.migrated_row_count - firstRowsMigrated).to.equal(1);
			expect(Date.now().valueOf() - startTime).to.be.greaterThan(4000); // backOff time from migrator
		});
	});

	describe('Init sync and async migrations for new model', function () {
		let pineFirstInstace: ChildProcess;

		before(async function () {
			const fixturePath = fixturesBasePath + '01-migrations';
			pineFirstInstace = await testInit(fixturePath, true);
		});

		after(async () => {
			await testDeInit(pineFirstInstace);
		});

		it('check /migrations/migration is served by pinejs', async () => {
			const res = await supertest(testLocalServer)
				.get('/migrations/migration')
				.expect(200);
			expect(res.body)
				.to.be.an('object')
				.that.has.ownProperty('d')
				.to.be.an('array');
			expect(res.body.d[0]?.executed_migrations)
				.to.be.an('array')
				.to.have.all.members(['0001', '0002']);
		});
	});

	describe('parallel async migrations', function () {
		let pineFirstInstace: ChildProcess;
		let pineSecondInstace: ChildProcess;
		let startTime: number;
		before(async function () {
			await executeModelBeforeMigrations();
			const fixturePath = fixturesBasePath + '/02-parallel-migrations';
			pineFirstInstace = await testInit(fixturePath, false);
			// capture time of starting the first migrations
			startTime = Date.now().valueOf();
			pineSecondInstace = await testInit(fixturePath, false, 1338); // start a parallel instance.
		});

		after(async () => {
			await testDeInit(pineFirstInstace);
			await testDeInit(pineSecondInstace);
		});

		it('should start 2 migrations competitive', async function () {
			let result: MigrationStatus[] = [];
			// active wait until 1 row has been migrated
			while (
				result.length < 2 ||
				result[0]?.migrated_row_count < 1 ||
				result[1]?.migrated_row_count < 1
			) {
				result = await getMigrationStatus();
			}

			const devices = await getResourceWithOdataParams('device');
			expect(devices?.length).to.be.greaterThan(0);

			const deviceBs = await getResourceWithOdataParams('deviceb');
			expect(deviceBs?.length).to.be.greaterThan(0);
		});

		it('should complete / catch up all data in 2 migrations competitive', async function () {
			let result: MigrationStatus[] = [];
			// active wait to check if migrations have catched up
			await waitForAllDataMigrated('device');
			await waitForAllDataMigrated('deviceb');

			// active wait as updating migration status after migrations have done takes some time.
			// dont want to wait for an artificial magic time delay.
			while (
				result.length < 2 ||
				result[0]?.migrated_row_count !== 20 ||
				result[1]?.migrated_row_count !== 20
			) {
				result = await getMigrationStatus();
				expect(result).to.be.an('array').of.length(2);
			}

			result.map((row) => {
				expect(row.migrated_row_count).to.equal(20);
			});
		});

		it('should migrate future data change after first catch up in 2 migrators', async function () {
			let result: MigrationStatus[] = [];
			while (
				result.length < 2 ||
				result[0]?.is_backing_off === false ||
				result[1]?.is_backing_off === false
			) {
				result = await getMigrationStatus();
			}
			const firstRowsMigratedA = result[0]?.migrated_row_count;
			const firstRowsMigratedB = result[1]?.migrated_row_count;

			expect(firstRowsMigratedA).to.be.greaterThan(0);
			expect(firstRowsMigratedB).to.be.greaterThan(0);

			await updateOneTableRow('device');
			await updateOneTableRow('deviceb');

			await waitForAllDataMigrated('device');
			await waitForAllDataMigrated('deviceb');

			result = [];
			while (
				result.length < 2 ||
				result[0]?.migrated_row_count <= firstRowsMigratedA ||
				result[1]?.migrated_row_count <= firstRowsMigratedB
			) {
				result = await getMigrationStatus();
			}

			expect(result).to.be.an('array').of.length(2);
			result.map((row) => {
				expect(row.migrated_row_count).to.be.greaterThan(0);
				expect(row.migrated_row_count - firstRowsMigratedA).to.equal(1);
			});
			expect(Date.now().valueOf() - startTime).to.be.greaterThan(4000); // backOff time from migrator
		});
	});

	describe('async migration finalize', function () {
		let pineFirstInstace: ChildProcess;
		before(async function () {
			await executeModelBeforeMigrations();
			const fixturePath = fixturesBasePath + '/03-finalize-async';
			pineFirstInstace = await testInit(fixturePath, false);
		});

		after(async () => {
			await testDeInit(pineFirstInstace);
		});

		it('should not run async migrations but sync migration', async function () {
			// It's meant to be a wait until we can 'surely' assume that the async migrations
			// would have run at least one iteration. Still a magic number is undesired as it's error prone
			await delay(2000); // wait for some migrations to have happened
			let result: MigrationStatus[] = [];

			result = await getMigrationStatus();
			expect(result).to.be.empty;

			const res = await supertest(testLocalServer)
				.get('/migrations/migration')
				.expect(200);
			expect(res.body)
				.to.be.an('object')
				.that.has.ownProperty('d')
				.to.be.an('array');
			const exampleMigrations = res.body.d.find(
				(migration: any) => migration.model_name === 'example',
			);
			expect(exampleMigrations)
				.to.be.an('object')
				.that.has.ownProperty('executed_migrations')
				.to.have.ordered.members(['m0001', 'm0002', 'm0003']);
		});
	});

	describe('error handling in async migrations', async function () {
		let pineFirstInstace: ChildProcess;
		before(async function () {
			await executeModelBeforeMigrations();
			const fixturePath = fixturesBasePath + '/04-migration-errors';
			pineFirstInstace = await testInit(fixturePath, false);
		});

		after(async () => {
			await testDeInit(pineFirstInstace);
		});

		it('should report error in error count', async function () {
			let rows: MigrationStatus[] = [];
			// active wait until 1 row has been migrated
			const errorMigrationKeys = ['0002', '0003'];
			while (rows.length < 2 || !rows[0]?.error_count || !rows[1]?.run_count) {
				const result = await getMigrationStatus();
				rows = result.filter((row) =>
					errorMigrationKeys.includes(row.migration_key),
				);
			}
			// it's 2 because the tables in the init SQL statement are generated AFTER the migrators have
			// been initialized. Thus ALL migrations run on 1 error as the tables not exist.
			expect(rows).to.be.an('array').of.length(2);
			rows.map((row) => {
				expect(row.run_count).to.equal(row.run_count);
				expect(row.run_count).to.be.greaterThan(0);
			});
		});

		it('should switch to backoff when exceeding error threshold and give error message', async function () {
			let rows: MigrationStatus[] = [];
			// active wait until 1 row has been migrated
			const errorMigrationKeys = ['0002', '0003'];
			while (
				rows.length < 2 ||
				rows[0]?.is_backing_off === false ||
				rows[1]?.is_backing_off === false
			) {
				const result = await getMigrationStatus();
				rows = result.filter((row) =>
					errorMigrationKeys.includes(row.migration_key),
				);
			}
			// it's 2 because the tables in the init SQL statement are generated AFTER the migrators have
			// been initialised. Thus ALL migrations run on 1 error as the tables not exist.
			expect(rows).to.be.an('array').of.length(2);
			rows.map((row) => {
				expect(row.run_count).to.equal(row.run_count);
				expect(row.run_count).to.be.greaterThanOrEqual(5);
				expect(row.is_backing_off).to.be.true;
			});
		});

		it('should remain in backoff when exceeding error threshold and give error message', async function () {
			let rows: MigrationStatus[] = [];
			// active wait until 1 row has been migrated
			const errorMigrationKeys = ['0002', '0003'];
			while (
				rows.length < 2 ||
				rows[0]?.error_count <= 5 ||
				rows[1]?.error_count <= 5
			) {
				const result = await getMigrationStatus();
				rows = result.filter((row) =>
					errorMigrationKeys.includes(row.migration_key),
				);
			}

			// it's 2 because the tables in the init SQL statement are generated AFTER the migrators have
			// been initialised. Thus ALL migrations run on 1 error as the tables not exist.
			expect(rows).to.be.an('array').of.length(2);
			rows.map((row) => {
				expect(row.run_count).to.be.greaterThanOrEqual(5);
				expect(row.run_count).to.equal(row.run_count);
				expect(row.is_backing_off).to.be.true;
			});
		});

		it('should recover from error backoff when no migration error occurs and rows get migrated', async function () {
			let rows: MigrationStatus[] = [];
			// active wait until 1 row has been migrated
			const errorMigrationKeys = ['0002'];
			while (rows.length === 0 || rows[0]?.error_count <= 5) {
				const result = await getMigrationStatus();
				rows = result.filter((row) =>
					errorMigrationKeys.includes(row.migration_key),
				);
			}

			// it's 2 because the tables in the init SQL statement are generated AFTER the migrators have
			// been initialised. Thus ALL migrations run on 1 error as the tables not exist.
			rows.map((row) => {
				expect(row.run_count).to.be.greaterThanOrEqual(5);
				expect(row.run_count).to.equal(row.run_count);
				expect(row.is_backing_off).to.be.true;
			});

			const createNonExistingTableAgain = `
			DROP TABLE IF EXISTS "device-not-exists";
			CREATE TABLE IF NOT EXISTS "device-not-exists" (
				"created at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
		,       "modified at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
		,       "id" SERIAL NOT NULL PRIMARY KEY
		,       "name" VARCHAR(255) NULL
		,       "note" TEXT NULL
		,       "type" VARCHAR(255) NOT NULL
		);

		INSERT INTO "device-not-exists" (
			"id", "name", "note", "type"
		)
		SELECT
			i as "id",
			CONCAT('a','b',trim(to_char(i,'0000000'))) as "name",
			NULL as "note",
			CONCAT('b','b',trim(to_char(i,'0000000'))) as "type"
		FROM generate_series(1, 20) s(i);
			`;

			try {
				// just use the db directly to create a new table for the test
				const dbUnderTest = await getDbUnderTest();
				await dbUnderTest.executeSql(createNonExistingTableAgain);
			} catch (err: any) {
				console.log(`err: ${err}`);
			}
			// wait for backoff to be released
			while (rows.length === 0 || rows[0]?.is_backing_off === true) {
				const result = await getMigrationStatus();
				rows = result.filter((row) =>
					errorMigrationKeys.includes(row.migration_key),
				);
			}
			rows.map((row) => {
				expect(row.is_backing_off).to.be.false;
				expect(row.migrated_row_count).to.be.greaterThan(0);
			});
		});
	});

	describe('massive data async migrations', function () {
		let pineFirstInstace: ChildProcess;
		before(async function () {
			await executeModelBeforeMigrations(
				fixturesBasePath + '/05-massive-data/00-execute-model',
			);
			const fixturePath = fixturesBasePath + '/05-massive-data';
			pineFirstInstace = await testInit(fixturePath, false);
		});

		after(async () => {
			await testDeInit(pineFirstInstace);
		});

		it('should complete / catch up massive data in one async migrator', async function () {
			let rows: MigrationStatus[] = [];

			const res = await supertest(testLocalServer)
				.get('/example/device/$count')
				.expect(200);

			const rowsToMigrate = res.body.d;

			// some random data access call, randomly selecting the rows to skip and the amount of rows to retrieve
			const apiTestCall = async () => {
				const top = Math.floor(Math.random() * (rowsToMigrate / 100));
				const skip = Math.floor(Math.random() * rowsToMigrate);
				const someRandomData = await supertest(testLocalServer)
					.get(`/example/device?$top=${top}&$skip=${skip}`)
					.expect(200);
				expect(someRandomData.body)
					.to.be.an('object')
					.that.has.ownProperty('d')
					.to.be.an('array');
			};
			// active wait to check if migrations have catched up
			while (
				!rows[0]?.migrated_row_count ||
				rows[0]?.migrated_row_count < rowsToMigrate
			) {
				const result = await getMigrationStatus();
				rows = result;
				try {
					await apiTestCall();
					await delay(50);
				} catch (err: any) {
					assert('Parallel database access should not fail');
				}
			}

			expect(rows[0]?.migrated_row_count).to.equal(rowsToMigrate);

			const devices = await getResourceWithOdataParams(
				'device',
				'$filter=name ne note',
			);

			expect(devices?.length).to.be.eql(0);
		});
	});

	describe('error handling in async migrations setup', async function () {
		let pineErrorInstance: ChildProcess;
		after(async () => {
			try {
				await testDeInit(pineErrorInstance);
			} catch {
				// will fail in good case. Calling it to stop all potential async migrators if the tests have started some.
			}
		});
		it('should fail to start pine instance with wrong async migration file definition', async function () {
			try {
				const fixturePath = fixturesBasePath + '/06-setup-errors';
				pineErrorInstance = await testInit(fixturePath, false);
				expect(pineErrorInstance).to.not.exist;
			} catch (err: any) {
				expect(err).to.equal('exit');
			}
		});

		it('should fail to start pine instance with mixed categorized and non categorized migrations', async function () {
			try {
				const fixturePath =
					fixturesBasePath + '/07-setup-error-mixed-migrations';
				pineErrorInstance = await testInit(fixturePath, true);
				expect(pineErrorInstance).to.not.exist;
			} catch (err: any) {
				expect(err).to.equal('exit');
			}
		});
	});
});
