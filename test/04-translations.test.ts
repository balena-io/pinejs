import * as supertest from 'supertest';
const configPath = __dirname + '/fixtures/04-translations/config';
const hooksPath = __dirname + '/fixtures/04-translations/translations/hooks';
import { testInit, testDeInit, testLocalServer } from './lib/test-init';
import { AnyObject } from 'pinejs-client-core';

describe('04 native translation tests', function () {
	let pineServer: Awaited<ReturnType<typeof testInit>>;
	before(async () => {
		pineServer = await testInit({
			configPath,
			hooksPath,
			deleteDb: true,
		});
	});

	after(async () => {
		await testDeInit(pineServer);
	});

	describe('university native (no translation)', () => {
		it('should create a faculty and student for /university apiRoot', async () => {
			const { body: createdFaculty } = await supertest(testLocalServer)
				.post('/university/faculty')
				.send({
					name: 'physics',
				})
				.expect(201);

			await supertest(testLocalServer)
				.post('/university/student')
				.send({
					matrix_number: 1,
					name: 'John',
					last_name: 'Doe',
					studies_at__faculty: createdFaculty?.id,
				})
				.expect(201);
		});
	});
	describe('university v3 translation', () => {
		let campus: AnyObject;
		it('should create a campus for /v3 apiRoot', async () => {
			const { body: createdCampus } = await supertest(testLocalServer)
				.post('/v3/campus')
				.send({
					name: 'computer science',
				})
				.expect(201);

			campus = createdCampus;
		});

		it('should create a student for /v3 apiRoot', async () => {
			await supertest(testLocalServer)
				.post('/v3/student')
				.send({
					matrix_number: 2,
					name: 'Jane',
					last_name: 'Edo',
					studies_at__campus: campus?.id,
				})
				.expect(201);
		});
	});

	describe('university v2 translation', () => {
		it('should create a student for physics campus for /v2 apiRoot', async () => {
			await supertest(testLocalServer)
				.post('/v2/student')
				.send({
					matrix_number: 3,
					name: 'Jena',
					last_name: 'Eod',
					studies_at__campus: 'physics',
				})
				.expect(201);
		});
	});

	describe('university v1 translation', () => {
		it('should create a student for physics campus for /v1 apiRoot', async () => {
			await supertest(testLocalServer)
				.post('/v1/student')
				.send({
					matrix_number: 4,
					name: 'Hugo',
					lastname: 'Oguh',
					studies_at__campus: 'physics',
				})
				.expect(201);
		});

		it('should read all students for physics campus from /v1 apiRoot', async () => {
			await supertest(testLocalServer)
				.get(`/v1/student?$filter=studies_at__campus eq 'physics'`)
				.expect(200);
		});
	});
});
