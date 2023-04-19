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

async function executeModelBeforeMigrations(
	modelFixturePath = fixturesBasePath + '00-execute-model',
) {
	// start pine instace with a configuration without migrations to execute the model in the DB once.
	// model has an initSqlPath declared so that the database gets filled first
	const executeModelsOnceBeforeTesting: ChildProcess = await testInit({
		configPath: modelFixturePath,
		deleteDb: true,
	});
	await testDeInit(executeModelsOnceBeforeTesting);
}

describe('02 Sync Migrations', async function () {
	this.timeout(30000);

	describe('Execute model and migrations should run', () => {
		let pineTestInstance: ChildProcess;
		before(async () => {
			await executeModelBeforeMigrations();
			pineTestInstance = await testInit({
				configPath: fixturesBasePath + '01-migrations',
				deleteDb: false,
			});
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
				pineErrorInstace = await testInit({
					configPath: fixturesBasePath + '02-migrations-error',
					deleteDb: false,
					listenPort: 1338,
				});
			} catch (err: any) {
				expect(err).to.equal('exit');
			}
		});

		it('Check that failed migrations did not manipulated data', async () => {
			// get a pineInstance without data manipulations to check data
			pineTestInstance = await testInit({
				configPath: fixturesBasePath + '00-execute-model',
				deleteDb: false,
			});

			const res = await supertest(testLocalServer)
				.get('/example/device')
				.expect(200);
			expect(res?.body?.d).to.have.length(10);
			res.body.d.map((device: TestDevice) => {
				expect(device.note).to.not.exist;
			});
		});
	});

	describe('Should not execute migrations for new executed model but run initSql', () => {
		let pineTestInstance: ChildProcess;
		before(async () => {
			pineTestInstance = await testInit({
				configPath: fixturesBasePath + '04-new-model-with-init',
				deleteDb: true,
			});
		});

		after(async () => {
			await testDeInit(pineTestInstance);
		});

		it('check that model migration was loaded and set executed', async () => {
			const migs = await supertest(testLocalServer)
				.get(`/migrations/migration?$filter=model_name eq 'example'`)
				.expect(200);
			expect(migs?.body?.d?.[0]?.model_name).to.eql('example');
			expect(migs?.body?.d?.[0]?.executed_migrations).to.have.ordered.members([
				'0001',
			]);
		});

		it('Check that /example/device data has not additionally migrated', async () => {
			const res = await supertest(testLocalServer)
				.get('/example/device')
				.expect(200);
			expect(res?.body?.d).to.have.length(1);
		});
	});

	describe('Should execute no mixed category migrations loaded from model.migrationsPath and model.migrations', () => {
		let pineErrorInstance: ChildProcess;
		it('should fail to start pine instance with mixed migration categories', async function () {
			try {
				await executeModelBeforeMigrations();
				pineErrorInstance = await testInit({
					configPath: fixturesBasePath + '03-exclusive-category',
					deleteDb: false,
				});
				expect(pineErrorInstance).to.not.exist;
			} catch (err: any) {
				expect(err).to.equal('exit');
			}
		});
	});
});
