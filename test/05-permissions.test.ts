import * as supertest from 'supertest';
const fixturePath = __dirname + '/fixtures/05-permissions/config';
import { testInit, testDeInit, testLocalServer } from './lib/test-init';

const basicStudentAuthHeaderBase64 =
	Buffer.from('student;student').toString('base64');
const basicAdminAuthHeaderBase64 =
	Buffer.from('admin;admin').toString('base64');

const differentUsers = [
	{ name: 'student', basicBase64: basicStudentAuthHeaderBase64 },
	{ name: 'admin', basicBase64: basicAdminAuthHeaderBase64 },
];

describe('05 basic permission tests', function () {
	let pineServer: Awaited<ReturnType<typeof testInit>>;
	let request: any;
	before(async () => {
		pineServer = await testInit({ configPath: fixturePath, deleteDb: true });
	});

	beforeEach(async () => {
		request = supertest.agent(testLocalServer);
	});

	after(async () => {
		await testDeInit(pineServer);
	});

	for (const [idx, user] of differentUsers.entries()) {
		it(`should create a student as ${user.name} `, async () => {
			await request
				.set('Authorization', 'Basic ' + user.basicBase64)
				.post('/university/student')
				.send({
					matrix_number: idx,
					name: 'John',
					lastname: user.name,
					birthday: new Date(),
					semester_credits: 10,
				})
				.expect(201);
		});

		it(`should read all students as ${user.name} `, async () => {
			await request
				.set('Authorization', 'Basic ' + user.basicBase64)
				.get('/university/student(1)')
				.expect(200);
		});

		it(`should update a student as ${user.name} `, async () => {
			await request
				.set('Authorization', 'Basic ' + user.basicBase64)
				.patch('/university/student(1)')
				.send({
					name: 'Johnny',
				})
				.expect(200);
		});
	}

	it(`should not allow to get students as guest `, async () => {
		await request.get('/university/student').expect(401);
	});

	it('should not allow to delete a student as student', async () => {
		await request
			.set('Authorization', 'Basic ' + basicStudentAuthHeaderBase64)
			.delete('/university/student(1)')
			.expect(401);
	});

	it('should not allow to create a faculty as student', async () => {
		await request
			.set('Authorization', 'Basic ' + basicStudentAuthHeaderBase64)
			.post('/university/faculty')
			.send({
				name: 'physics',
			})
			.expect(401);
	});

	it('should allow to create a faculty as admin', async () => {
		await request
			.set('Authorization', 'Basic ' + basicAdminAuthHeaderBase64)
			.post('/university/faculty')
			.send({
				name: 'physics',
			})
			.expect(201);
	});

	it('should allow to delete a student as admin', async () => {
		await request
			.set('Authorization', 'Basic ' + basicStudentAuthHeaderBase64)
			.delete('/university/student(1)')
			.expect(401);
	});

	it(`should allow to get faculties as guest `, async () => {
		await request.get('/university/faculty').expect(200);
	});
});
