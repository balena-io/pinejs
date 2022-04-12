import * as supertest from 'supertest';
import { expect } from 'chai';
const fixturePath = __dirname + '/fixtures/01-basic/config';
import { testInit, testDeInit, testLocalServer } from './lib/testInit';

describe('basic tests 01', function () {
	before(async () => {
		await testInit(fixturePath);
	});

	describe('Basic', () => {
		it('check /ping route is OK', async () => {
			const res = await supertest(testLocalServer).get('/ping').expect(200);
			expect(res.text).to.equal('OK');
		});
	});

	describe('university vocabular', () => {
		it('check /university/student is served by pinejs', async () => {
			const res = await supertest(testLocalServer)
				.get('/university/student')
				.expect(200);
			expect(res.body)
				.to.be.an('object')
				.has.ownProperty('d')
				.to.be.an('array');
		});

		it('create a student', async () => {
			const res = await supertest(testLocalServer)
				.post('/university/student')
				.send({
					name: 'John',
					lastname: 'Doe',
					birthday: new Date('13.3.2007'),
					semester_credits: 2,
				})
				.expect(201);
			// expect(res.body).to.be.an('object').has.ownProperty('d').to.be.an('array');
			console.log(JSON.stringify(res.body));
		});
	});

	after(async () => {
		await testDeInit();
	});
});
