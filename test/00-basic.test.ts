import * as supertest from 'supertest';
import { expect } from 'chai';
const fixturePath = __dirname + '/fixtures/00-basic/config';
import { testInit, testDeInit, testLocalServer } from './lib/testInit';

describe('basic tests', function () {
	before(async () => {
		await testInit(fixturePath);
	});

	describe('Basic', () => {
		it('check /ping route is OK', async () => {
			const res = await supertest(testLocalServer).get('/ping').expect(200);
			expect(res.text).to.equal('OK');
		});
	});

	describe('example vocabular', () => {
		it('check /example/device is served by pinejs', async () => {
			const res = await supertest(testLocalServer)
				.get('/example/device')
				.expect(200);
			expect(res.body)
				.to.be.an('object')
				.has.ownProperty('d')
				.to.be.an('array');
		});
	});

	after(async () => {
		await testDeInit();
	});
});
