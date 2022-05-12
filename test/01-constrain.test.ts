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
		const studentIds: number[] = [];

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
			const registration = await supertest(testLocalServer)
				.post('/university/registration')
				.send({
					matrix_number: 1,
					office_name: 'main',
				})
				.expect(201);

			const student = await supertest(testLocalServer)
				.post('/university/student')
				.send({
					registration: registration.body.id,
					name: 'John',
					lastname: 'Doe',
					birthday: new Date(),
					semester_credits: 10,
				})
				.expect(201);
			studentIds.push(student.body.id);
		});

		it('create a second student', async () => {
			const registration = await supertest(testLocalServer)
				.post('/university/registration')
				.send({
					matrix_number: 2,
					office_name: 'main',
				})
				.expect(201);

			const student = await supertest(testLocalServer)
				.post('/university/student')
				.send({
					registration: registration.body.id,
					name: 'Jane',
					lastname: 'Doe',
					birthday: new Date(),
					semester_credits: 11,
				})
				.expect(201);
			studentIds.push(student.body.id);
		});

		it('create faculty', async () => {
			await supertest(testLocalServer)
				.post('/university/faculty')
				.send({
					faculty_name: 'leet-faculty',
				})
				.expect(201);
		});

		it('link students to faculty', async () => {
			await Promise.all(
				studentIds.map((sId) =>
					supertest(testLocalServer)
						.post('/university/faculty__has__student')
						.send({
							faculty: 1,
							student: sId,
						})
						.expect(201),
				),
			);
		});

		it('get faculty', async () => {
			const res = await supertest(testLocalServer)
				.get('/university/faculty?$expand=faculty__has__student')
				.expect(200);
			expect(res.body.d[0].faculty__has__student)
				.to.be.an('array')
				.to.have.lengthOf(2);
		});

		it('should fail to create a registration with same matrix number ', async () => {
			await supertest(testLocalServer)
				.post('/university/registration')
				.send({
					matrix_number: 2,
					office_name: 'main',
				})
				.expect(409);
		});

		it('should fail to create a student with same registration', async () => {
			await supertest(testLocalServer)
				.post('/university/student')
				.send({
					registration: 1,
					name: 'Jane',
					lastname: 'Doe',
					birthday: new Date(),
					semester_credits: 11,
				})
				.expect(409);
		});

		it('should fail to create a student with too few semester credits ', async () => {
			const registration = await supertest(testLocalServer)
				.post('/university/registration')
				.send({
					matrix_number: 3,
					office_name: 'main',
				})
				.expect(201);
			const res = await supertest(testLocalServer)
				.post('/university/student')
				.send({
					registration: registration.body.id,
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

		it('get all students with expanded registration details', async () => {
			const res = await supertest(testLocalServer)
				.get('/university/student?$expand=registration')
				.expect(200);
			expect(res.body)
				.to.be.an('object')
				.that.has.ownProperty('d')
				.to.be.an('array')
				.to.have.lengthOf(2);
			res.body.d.map((entry: any) => {
				expect(entry).have.ownPropertyDescriptor('registration');
				expect(entry.registration).to.be.an('array').to.have.lengthOf(1);
			});
		});
	});
});
