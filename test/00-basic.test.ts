import supertest from 'supertest';
import { expect } from 'chai';
const configPath = import.meta.dirname + '/fixtures/00-basic/config.js';
import { testInit, testDeInit, testLocalServer } from './lib/test-init.js';

describe('00 basic tests', function () {
	let pineServer: Awaited<ReturnType<typeof testInit>>;
	before(async () => {
		pineServer = await testInit({ configPath });
	});

	after(() => {
		testDeInit(pineServer);
	});

	describe('Basic', () => {
		it('check /ping route is OK', async () => {
			await supertest(testLocalServer).get('/ping').expect(200, 'OK');
		});
	});

	describe('example vocabular', () => {
		it('check /example/device is served by pinejs', async () => {
			const res = await supertest(testLocalServer)
				.get('/example/device')
				.expect(200);
			expect(res.body)
				.to.be.an('object')
				.that.has.ownProperty('d')
				.to.be.an('array');
		});
	});
});
