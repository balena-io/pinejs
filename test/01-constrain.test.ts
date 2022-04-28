import * as supertest from 'supertest';
import { expect } from 'chai';
const fixturePath = __dirname + '/fixtures/01-constrain/config';
import { testInit, testDeInit, testLocalServer } from './lib/test-init';

describe('01 basic constrain tests', function () {
	let pineServer: Awaited<ReturnType<typeof testInit>>;
	before(async () => {
		pineServer = await testInit(fixturePath, true);
	});

	after(async () => {
		await testDeInit(pineServer);
	});

	describe('Basic', () => {
		it('check /ping route is OK', async () => {
			await supertest(testLocalServer).get('/ping').expect(200, 'OK');
		});
	});

	describe('university vocabular', () => {
		it('check /university/student is served by pinejs', async () => {
			const res = await supertest(testLocalServer)
				.get('/university/student')
				.expect(200);
			expect(res.body)
				.to.be.an('object')
				.that.has.ownProperty('d')
				.to.be.an('array');
		});

		it('create a student', async () => {
			await supertest(testLocalServer)
				.post('/university/student')
				.send({
					matrix_number: 1,
					name: 'John',
					lastname: 'Doe',
					birthday: new Date(),
					semester_credits: 10,
				})
				.expect(201);
		});

		it('should fail to create a student with same matrix number ', async () => {
			await supertest(testLocalServer)
				.post('/university/student')
				.send({
					matrix_number: 1,
					name: 'John',
					lastname: 'Doe',
					birthday: new Date(),
					semester_credits: 10,
				})
				.expect(409);
		});

		it('should fail to create a student with too few semester credits ', async () => {
			const res = await supertest(testLocalServer)
				.post('/university/student')
				.send({
					matrix_number: 2,
					name: 'Jenny',
					lastname: 'Dea',
					birthday: new Date(),
					semester_credits: 2,
				})
				.expect(400);
			expect(res.body)
				.to.be.a('string')
				.that.equals(
					'It is necessary that each student that has a semester credits, has a semester credits that is greater than or equal to 4 and is less than or equal to 16.',
				);
		});
	});
});
