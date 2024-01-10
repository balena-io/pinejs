import * as supertest from 'supertest';
import { expect } from 'chai';
const configPath = __dirname + '/fixtures/07-permissions/config';
import { testInit, testDeInit, testLocalServer } from './lib/test-init';

describe('07 permissions tests', function () {
	let pineServer: Awaited<ReturnType<typeof testInit>>;
	before(async () => {
		pineServer = await testInit({
			configPath,
			deleteDb: true,
			withLoginRoute: true,
		});
	});

	after(async () => {
		testDeInit(pineServer);
	});

	describe('university vocabulary with admin permissions', () => {
		let adminCookie: string;
		before(async () => {
			const res = await supertest(testLocalServer).post('/login').send({
				username: 'admin',
				password: 'admin',
			});
			adminCookie = res.headers['set-cookie'];
		});

		it('should be able to create a student', async () => {
			await supertest(testLocalServer)
				.post('/university/student')
				.set('Cookie', adminCookie)
				.send({
					matrix_number: 1,
					name: 'John',
					lastname: 'Doe',
					birthday: new Date(),
					semester_credits: 10,
				})
				.expect(201);
		});

		it('should get the student', async () => {
			const res = await supertest(testLocalServer)
				.get('/university/student(1)')
				.set('Cookie', adminCookie)
				.expect(200);

			expect(res.body)
				.to.be.an('object')
				.that.has.ownProperty('d')
				.to.be.an('array');
			expect(res.body.d.length).to.be.eq(1);
		});

		it('should have access to create-student action', async () => {
			await supertest(testLocalServer)
				.post('/university/student(1)/canAccess')
				.set('Cookie', adminCookie)
				.send({
					action: 'create-student',
				})
				.expect(200);
		});
	});

	describe('university vocabulary with guest permissions', () => {
		it('should be able to read from /university/student', async () => {
			const res = await supertest(testLocalServer)
				.get('/university/student')
				.expect(200);
			expect(res.body)
				.to.be.an('object')
				.that.has.ownProperty('d')
				.to.be.an('array');
			expect(res.body.d.length).to.be.eq(1);
		});

		it('should fail to create create a student with 401', async () => {
			await supertest(testLocalServer)
				.post('/university/student')
				.send({
					matrix_number: 1,
					name: 'John',
					lastname: 'Doe',
					birthday: new Date(),
					semester_credits: 10,
				})
				.expect(401);
		});

		it('should not have access to create-student action', async () => {
			await supertest(testLocalServer)
				.post('/university/student(1)/canAccess')
				.send({
					action: 'create-student',
				})
				.expect(401);
		});
	});
});
