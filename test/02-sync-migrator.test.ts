import * as supertest from 'supertest';
import { ChildProcess } from 'child_process';
import { expect } from 'chai';
import { testInit, testDeInit, testLocalServer } from './lib/test-init';

const fixturesBasePath = __dirname + '/fixtures/02-sync-migrator/';

type TestDevice = {
	created_at: Date;
	modified_at: Date;
	id: number;
	name: string;
	note: string;
	type: string;
};

async function executeModelBeforeMigrations() {
	// start pine instace with a configuration without migrations to execute the model in the DB once.
	// model has an initSqlPath declared so that the database gets filled first
	const executeModelsOnceBeforeTesting: ChildProcess = await testInit(
		fixturesBasePath + '00-execute-model',
		true,
	);
	await testDeInit(executeModelsOnceBeforeTesting);
}

describe('02 Sync Migrations', async function () {
	this.timeout(30000);

	describe('Execute model and migrations should run', () => {
		let pineTestInstance: ChildProcess;
		before(async () => {
			await executeModelBeforeMigrations();
			pineTestInstance = await testInit(
				fixturesBasePath + '01-migrations',
				false,
			);
		});
		after(async () => {
			await testDeInit(pineTestInstance);
		});

		it('check /example/device data has been migrated', async () => {
			const res = await supertest(testLocalServer)
				.get('/example/device')
				.expect(200);
			expect(res.body)
				.to.be.an('object')
				.that.has.ownProperty('d')
				.to.be.an('array');
			expect(res.body.d).to.have.length(20);
			res.body.d.map((device: TestDevice) => {
				expect(device.note).to.contain('#migrated');
			});
		});
	});

	describe('Should fail to executed migrations', () => {
		let pineErrorInstace: ChildProcess;
		let pineTestInstance: ChildProcess;
		before(async () => {
			await executeModelBeforeMigrations();
		});
		after(async () => {
			await testDeInit(pineErrorInstace);
			await testDeInit(pineTestInstance);
		});

		it('Starting pine should fail when migrations fail', async () => {
			try {
				pineErrorInstace = await testInit(
					fixturesBasePath + '02-migrations-error',
					false,
					1338,
				);
			} catch (err: any) {
				expect(err).to.equal('exit');
			}
		});

		it('Check that failed migrations did not manipulated data', async () => {
			// get a pineInstance without data manipulations to check data
			pineTestInstance = await testInit(
				fixturesBasePath + '00-execute-model',
				false,
			);

			const res = await supertest(testLocalServer)
				.get('/example/device')
				.expect(200);
			expect(res?.body?.d).to.have.length(10);
			res.body.d.map((device: TestDevice) => {
				expect(device.note).to.not.exist;
			});
		});
	});

	describe('Should execute only migrations loaded from migrationsPath files', () => {
		let pineTestInstance: ChildProcess;
		before(async () => {
			await executeModelBeforeMigrations();
			pineTestInstance = await testInit(
				fixturesBasePath + '03-compatible-migrations',
				false,
			);
		});
		after(async () => {
			await testDeInit(pineTestInstance);
		});

		it('check that only migrations from migrationsPath files have been executed', async () => {
			const migs = await supertest(testLocalServer)
				.get(`/migrations/migration?$filter=model_name eq 'example'`)
				.expect(200);
			expect(migs?.body?.d?.[0]?.model_name).to.eql('example');
			expect(migs?.body?.d?.[0]?.executed_migrations).to.have.ordered.members([
				'0001',
				'0002',
			]);
		});

		it('Check that /example/device data has been migrated correctly', async () => {
			const res = await supertest(testLocalServer)
				.get('/example/device')
				.expect(200);
			expect(res?.body?.d).to.have.length(20);
			res.body.d.map((device: TestDevice) => {
				expect(device.note).to.exist.to.contain('#migrated');
			});
		});
	});
});
