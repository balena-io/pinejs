const configPath = __dirname + '/fixtures/04-translations/config.js';
const hooksPath = __dirname + '/fixtures/04-translations/translations/hooks.js';
import { testInit, testDeInit, testLocalServer } from './lib/test-init';
import { faker } from '@faker-js/faker';
import { expect } from 'chai';
import type { AnyObject } from 'pinejs-client-core';

import { PineTest } from 'pinejs-client-supertest';

function expectNotUndefined<T>(value: T | undefined): asserts value is T {
	expect(value).to.not.be.undefined;
}

describe('04 native translation tests', function () {
	let pineServer: Awaited<ReturnType<typeof testInit>>;
	let pineTest: PineTest;
	let faculty: AnyObject;
	before(async () => {
		pineServer = await testInit({
			configPath,
			hooksPath,
			deleteDb: true,
		});
		// setup faker so that test date uniqueness is set for all test cases
		faker.seed();

		pineTest = new PineTest({}, { app: testLocalServer });

		// initial faculty is needed, as translations should not create faculties just from name property.
		// expected to fail when faculty with name is not existing
		({ body: faculty } = await pineTest
			.post({
				apiPrefix: 'university/',
				resource: 'faculty',
				body: {
					name: faker.random.words(2),
				},
			})
			.expect(201));
	});

	after(async () => {
		testDeInit(pineServer);
	});

	describe('translate v1 model', () => {
		it('should create a /v1 student with campus name and old different named property, that is served with new property name or newer models', async () => {
			const { body: v1StudentCreated } = await pineTest
				.post({
					apiPrefix: 'v1/',
					resource: 'student',
					body: {
						matrix_number: faker.datatype.number({ min: 100000 }),
						name: faker.name.firstName(),
						lastname: faker.name.lastName(),
						studies_at__campus: faculty.name,
					},
				})
				.expect(201);

			const { body: v2StudentCreated } = await pineTest.get({
				apiPrefix: 'v2/',
				resource: 'student',
				id: { matrix_number: v1StudentCreated.matrix_number },
			});

			// translate the objects and test for deep equality

			v1StudentCreated.last_name = v1StudentCreated.lastname;
			delete v1StudentCreated.lastname;

			expect(v1StudentCreated.computed_field).to.equal('v1_computed_field');
			expectNotUndefined(v2StudentCreated);
			expect(v2StudentCreated.computed_field).to.equal('v2_computed_field');
			delete v1StudentCreated.computed_field;
			delete v2StudentCreated.computed_field;
			expect(v2StudentCreated).to.deep.equal(v1StudentCreated);
		});

		it('should not create a /v1 student with campus name that is not existing as entity', async () => {
			await pineTest
				.post({
					apiPrefix: 'v1/',
					resource: 'student',
					body: {
						matrix_number: faker.datatype.number({ min: 100000 }),
						name: faker.name.firstName(),
						lastname: faker.name.lastName(),
						studies_at__campus: 'does not exist',
					},
				})
				.expect(404);
		});

		it('should create a student on latest model and retrieve a /v1 compatible student object', async () => {
			const { body: vLatestStudentCreated } = await pineTest
				.post({
					apiPrefix: 'university/',
					resource: 'student',
					body: {
						matrix_number: faker.datatype.number({ min: 100000 }),
						name: faker.name.firstName(),
						last_name: faker.name.lastName(),
						studies_at__faculty: faculty.id,
					},
				})
				.expect(201);

			const { body: vLatestStudent } = await pineTest
				.get({
					apiPrefix: 'university/',
					resource: 'student',
					id: vLatestStudentCreated.id,
					options: {
						$expand: {
							studies_at__faculty: {
								$select: 'name',
							},
						},
					},
				})
				.expect(200);
			expectNotUndefined(vLatestStudent);

			const { body: v1StudentCreated } = await pineTest.get({
				apiPrefix: 'v1/',
				resource: 'student',
				id: { matrix_number: vLatestStudent.matrix_number },
			});
			expectNotUndefined(v1StudentCreated);

			// translate the objects and test for deep equality
			vLatestStudent.lastname = vLatestStudent.last_name;
			vLatestStudent.studies_at__campus =
				vLatestStudent.studies_at__faculty[0].name;
			delete vLatestStudent.studies_at__faculty;
			delete vLatestStudent.last_name;

			expect(v1StudentCreated.computed_field).to.equal('v1_computed_field');
			expect(vLatestStudent.computed_field).to.equal('latest_computed_field');
			delete v1StudentCreated.computed_field;
			delete vLatestStudent.computed_field;

			expect(v1StudentCreated).to.deep.equal(vLatestStudent);
		});
	});

	describe('translate v2 model', () => {
		it('should not create a /v2 student with campus name that is not existing as entity', async () => {
			await pineTest
				.post({
					apiPrefix: 'v2/',
					resource: 'student',
					body: {
						matrix_number: faker.datatype.number({ min: 100000 }),
						name: faker.name.firstName(),
						lastname: faker.name.lastName(),
						studies_at__campus: 'does not exist',
					},
				})
				.expect(404);
		});

		it(`should create a /v2 student with campus name as string which translates to a referenced entity 'campus'`, async () => {
			const { body: v2StudentCreated } = await pineTest
				.post({
					apiPrefix: 'v2/',
					resource: 'student',
					body: {
						matrix_number: faker.datatype.number({ min: 100000 }),
						name: faker.name.firstName(),
						last_name: faker.name.lastName(),
						studies_at__campus: faculty.name,
					},
				})
				.expect(201);

			const { body: v3StudentCreated } = await pineTest.get({
				apiPrefix: 'v3/',
				resource: 'student',
				id: { matrix_number: v2StudentCreated.matrix_number },
			});
			expectNotUndefined(v3StudentCreated);

			const { body: v3Campus } = await pineTest.get({
				apiPrefix: 'v3/',
				resource: 'campus',
				id: { name: v2StudentCreated.studies_at__campus },
			});
			expectNotUndefined(v3Campus);

			expect(v2StudentCreated.studies_at__campus).to.equal(v3Campus.name);
			expect(v3StudentCreated.studies_at__campus)
				.to.haveOwnProperty('__id')
				.to.equal(v3Campus.id);

			expect(v2StudentCreated.computed_field).to.equal('v2_computed_field');
			expect(v3StudentCreated.computed_field).to.equal('v3_computed_field');
			delete v2StudentCreated.computed_field;
			delete v3StudentCreated.computed_field;

			// translate the objects and test for deep equality
			v3StudentCreated.studies_at__campus = v3Campus.name;
			expect(v2StudentCreated).to.deep.equal(v3StudentCreated);
		});

		it('should create a student on latest model and retrieve a /v2 compatible student object', async () => {
			const { body: vLatestStudentCreated } = await pineTest
				.post({
					apiPrefix: 'university/',
					resource: 'student',
					body: {
						matrix_number: faker.datatype.number({ min: 100000 }),
						name: faker.name.firstName(),
						last_name: faker.name.lastName(),
						studies_at__faculty: faculty.id,
					},
				})
				.expect(201);

			const { body: vLatestStudent } = await pineTest
				.get({
					apiPrefix: 'university/',
					resource: 'student',
					id: vLatestStudentCreated.id,
					options: {
						$expand: {
							studies_at__faculty: {
								$select: 'name',
							},
						},
					},
				})
				.expect(200);
			expectNotUndefined(vLatestStudent);

			const { body: v2StudentCreated } = await pineTest.get({
				apiPrefix: 'v2/',
				resource: 'student',
				id: { matrix_number: vLatestStudent.matrix_number },
			});
			expectNotUndefined(v2StudentCreated);

			// translate the objects and test for deep equality
			vLatestStudent.studies_at__campus =
				vLatestStudent.studies_at__faculty[0].name;
			delete vLatestStudent.studies_at__faculty;

			expect(v2StudentCreated.computed_field).to.equal('v2_computed_field');
			expect(vLatestStudent.computed_field).to.equal('latest_computed_field');
			delete v2StudentCreated.computed_field;
			delete vLatestStudent.computed_field;

			expect(v2StudentCreated).to.deep.equal(vLatestStudent);
		});
	});

	describe('translate v3 model', () => {
		let v3CreatedCampus: AnyObject;
		let vLatestFaculty: AnyObject | undefined;
		it(`should create a campus for /v3 that is a faculty on latest model`, async () => {
			({ body: v3CreatedCampus } = await pineTest
				.post({
					apiPrefix: 'v3/',
					resource: 'campus',
					body: {
						name: faker.random.words(2),
					},
				})
				.expect(201));

			({ body: vLatestFaculty } = await pineTest.get({
				apiPrefix: 'university/',
				resource: 'faculty',
				id: { name: v3CreatedCampus.name },
			}));
			expect(v3CreatedCampus).to.deep.equal(vLatestFaculty);
		});

		it(`should create a /v3 student with old referenced field name that becomes a different referenced field name on latest model`, async () => {
			const { body: v3StudentCreated } = await pineTest
				.post({
					apiPrefix: 'v3/',
					resource: 'student',
					body: {
						matrix_number: faker.datatype.number({ min: 100000 }),
						name: faker.name.firstName(),
						last_name: faker.name.lastName(),
						studies_at__campus: v3CreatedCampus.id,
					},
				})
				.expect(201);

			const { body: v3Student } = await pineTest
				.get({
					apiPrefix: 'v3/',
					resource: 'student',
					id: v3StudentCreated.id,
					options: {
						$expand: {
							studies_at__campus: {
								$select: ['id', 'name'],
							},
						},
					},
				})
				.expect(200);
			expectNotUndefined(v3Student);

			const { body: vLatestStudentCreated } = await pineTest.get({
				apiPrefix: 'university/',
				resource: 'student',
				id: { matrix_number: v3StudentCreated.matrix_number },
				options: {
					$expand: {
						studies_at__faculty: {
							$select: ['name', 'id'],
						},
					},
				},
			});
			expectNotUndefined(vLatestStudentCreated);

			const { body: v3Campus } = await pineTest.get({
				apiPrefix: 'v3/',
				resource: 'campus',
				id: { name: v3CreatedCampus.name },
				options: {
					$select: ['id', 'name'],
				},
			});

			expect(v3Student.studies_at__campus[0]).to.deep.equal(v3Campus);
			expect(vLatestStudentCreated.studies_at__faculty[0]).to.deep.equal(
				v3Campus,
			);
			expect(v3CreatedCampus).to.deep.equal(vLatestFaculty);

			// translate the objects and test for deep equality
			v3Student.studies_at__faculty = v3Student.studies_at__campus;
			delete v3Student.studies_at__campus;

			expect(v3Student.computed_field).to.equal('v3_computed_field');
			expect(vLatestStudentCreated.computed_field).to.equal(
				'latest_computed_field',
			);
			delete v3Student.computed_field;
			delete vLatestStudentCreated.computed_field;

			expect(v3Student).to.deep.equal(vLatestStudentCreated);
		});
	});
});
