const configPath = import.meta.dirname + '/fixtures/09-actions/config.js';
import { testInit, testDeInit, testLocalServer } from './lib/test-init.js';
import { expect } from 'chai';
import supertest from 'supertest';

const actionsPath = import.meta.dirname + '/fixtures/09-actions/actions.js';
const hooksPath =
	import.meta.dirname + '/fixtures/09-actions/translations/hooks.js';

const translations = [
	{
		vocabulary: 'actionsUniversity',
		semesterResourceName: 'semester',
	},
	{
		vocabulary: 'v1actionsUniversity',
		semesterResourceName: 'current_semester',
	},
];

describe('09 actions tests', function () {
	let pineServer: Awaited<ReturnType<typeof testInit>>;
	before(async () => {
		pineServer = await testInit({
			configPath,
			actionsPath,
			hooksPath,
			deleteDb: true,
			withLoginRoute: true,
		});
	});

	after(() => {
		testDeInit(pineServer);
	});

	describe('university vocabulary', () => {
		let adminCookie: string;
		let teacherCookie: string;
		before(async () => {
			const [admin, teacher] = await Promise.all([
				supertest(testLocalServer).post('/login').send({
					username: 'admin',
					password: 'admin',
				}),
				supertest(testLocalServer).post('/login').send({
					username: 'teacher',
					password: 'teacher',
				}),
			]);

			adminCookie = admin.headers['set-cookie'];
			teacherCookie = teacher.headers['set-cookie'];
		});
		translations.map(({ vocabulary, semesterResourceName }) => {
			it('[admin] should be able to promote a student', async () => {
				const { body: student } = await supertest(testLocalServer)
					.post(`/${vocabulary}/student`)
					.set('Cookie', adminCookie)
					.send({
						name: `test1-${vocabulary}`,
						[semesterResourceName]: 1,
						is_repeating: false,
					})
					.expect(201);

				await supertest(testLocalServer)
					.post(`/${vocabulary}/student(${student.id})/promoteToNextSemester`)
					.set('Cookie', adminCookie)
					.send({
						grades: [10, 9, 8],
					})
					.expect(200);

				const {
					body: {
						d: [promotedStudent],
					},
				} = await supertest(testLocalServer)
					.get(`/${vocabulary}/student(${student.id})`)
					.set('Cookie', adminCookie)
					.expect(200);

				expect(promotedStudent[semesterResourceName]).to.be.eq(2);
				expect(promotedStudent.is_repeating).to.be.false;

				// The actual hooks for v1/actionsUniversity are different and the
				// one in v1 gives +1 on the final grade
				if (vocabulary === 'v1actionsUniversity') {
					expect(promotedStudent.previous_year_grade).to.be.eq('10');
				} else {
					expect(promotedStudent.previous_year_grade).to.be.eq('9');
				}
			});

			it('[admin] should be able to promote with name key', async () => {
				await supertest(testLocalServer)
					.post(`/${vocabulary}/student`)
					.set('Cookie', adminCookie)
					.send({
						name: `test2-${vocabulary}`,
						[semesterResourceName]: 1,
						is_repeating: false,
					})
					.expect(201);

				await supertest(testLocalServer)
					.post(
						`/${vocabulary}/student(name='test2-${vocabulary}')/promoteToNextSemester`,
					)
					.set('Cookie', adminCookie)
					.send({
						grades: [5, 4, 5],
					})
					.expect(200);

				const {
					body: {
						d: [promotedStudent],
					},
				} = await supertest(testLocalServer)
					.get(`/${vocabulary}/student(name='test2-${vocabulary}')`)
					.set('Cookie', adminCookie)
					.expect(200);

				expect(promotedStudent[semesterResourceName]).to.be.eq(1);
				expect(promotedStudent.is_repeating).to.be.true;

				if (vocabulary === 'v1actionsUniversity') {
					expect(promotedStudent.previous_year_grade).to.be.eq(
						'5.666666666666667',
					);
				} else {
					expect(promotedStudent.previous_year_grade).to.be.eq(
						'4.666666666666667',
					);
				}
			});

			it('[admin] transaction should rollback on action failure', async () => {
				const { body: student } = await supertest(testLocalServer)
					.post(`/${vocabulary}/student`)
					.set('Cookie', adminCookie)
					.send({
						name: `test3-${vocabulary}`,
						[semesterResourceName]: 1,
						is_repeating: false,
					})
					.expect(201);

				await supertest(testLocalServer)
					.post(`/${vocabulary}/student(${student.id})/promoteToNextSemester`)
					.set('Cookie', adminCookie)
					.send({
						// dryRun simply forces the DB to throw after doing stuff on the DB for test purposes
						dryRun: true,
						grades: [5, 4, 5],
					})
					.expect(422, '"Dry run completed"');

				const {
					body: {
						d: [promotedStudent],
					},
				} = await supertest(testLocalServer)
					.get(`/${vocabulary}/student(${student.id})`)
					.set('Cookie', adminCookie)
					.expect(200);
				expect(promotedStudent[semesterResourceName]).to.be.eq(1);
				expect(promotedStudent.is_repeating).to.be.false;
			});

			it('[admin] should ignore request parameters on actions', async () => {
				const { body: student } = await supertest(testLocalServer)
					.post(`/${vocabulary}/student`)
					.set('Cookie', adminCookie)
					.send({
						name: `test4-${vocabulary}`,
						[semesterResourceName]: 1,
						is_repeating: false,
					})
					.expect(201);

				await supertest(testLocalServer)
					.post(
						`/${vocabulary}/student(${student.id})/promoteToNextSemester?$filter=id eq 4242`,
					)
					.set('Cookie', adminCookie)
					.send({
						grades: [10, 9, 8],
					})
					.expect(200);
			});

			it('[teacher] should fail to promote student if user does not have action permission', async () => {
				const { body: student } = await supertest(testLocalServer)
					.post(`/${vocabulary}/student`)
					.set('Cookie', teacherCookie)
					.send({
						name: `test5-${vocabulary}`,
						[semesterResourceName]: 1,
						is_repeating: false,
					})
					.expect(201);

				await supertest(testLocalServer)
					.post(`/${vocabulary}/student(${student.id})/promoteToNextSemester`)
					.set('Cookie', teacherCookie)
					.send({
						grades: [5, 4, 5],
					})
					.expect(401);
			});
		});
	});
});
