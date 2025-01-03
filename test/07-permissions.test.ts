import supertest from 'supertest';
import { expect } from 'chai';
const configPath = __dirname + '/fixtures/07-permissions/config.js';
import { testInit, testDeInit, testLocalServer } from './lib/test-init';
import { sbvrUtils, permissions } from '../out/server-glue/module';
import type UserModel from '../out/sbvr-api/user';

describe('07 permissions tests', function () {
	let pineServer: Awaited<ReturnType<typeof testInit>>;
	let userPineClient: sbvrUtils.PinejsClient<UserModel>;
	before(async () => {
		pineServer = await testInit({
			configPath,
			deleteDb: true,
			withLoginRoute: true,
		});
		userPineClient = new sbvrUtils.PinejsClient<UserModel>('dummy');
	});

	after(() => {
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

	describe('compile auth', () => {
		it('should compile auth for resource', () => {
			const auth = userPineClient.compileAuth({
				modelName: 'auth',
				resource: 'user',
				access: 'read',
			});
			expect(auth).to.be.eq('auth.user.read');
		});

		it('should compile auth for resource with $filter', () => {
			const auth = userPineClient.compileAuth({
				modelName: 'auth',
				resource: 'user',
				access: 'read',
				options: {
					$filter: { id: 1 },
				},
			});
			expect(auth).to.be.eq('auth.user.read?id eq 1');
		});

		it('should compile auth for resource with complex $filter', () => {
			const auth = userPineClient.compileAuth({
				modelName: 'auth',
				resource: 'permission',
				access: 'write',
				options: {
					$filter: {
						$or: [
							{
								is_of__user: {
									$any: {
										$alias: 'u',
										$expr: {
											u: {
												actor: {
													'@': '__ACTOR',
												},
											},
										},
									},
								},
							},
							{
								is_of__role: {
									$any: {
										$alias: 'r',
										$expr: {
											r: {
												user__has__role: {
													$any: {
														$alias: 'ur',
														$expr: {
															ur: {
																is_of__user: {
																	$any: {
																		$alias: 'u',
																		$expr: {
																			u: {
																				actor: {
																					'@': '__ACTOR',
																				},
																			},
																		},
																	},
																},
															},
														},
													},
												},
											},
										},
									},
								},
							},
						],
					},
				},
			});
			expect(auth).to.be.eq(
				'auth.permission.write?(is_of__user/any(u:u/actor eq @__ACTOR)) or (is_of__role/any(r:r/user__has__role/any(ur:ur/is_of__user/any(u:u/actor eq @__ACTOR))))',
			);
		});

		it('should compile auth with canAccess in simple filter', () => {
			const auth = userPineClient.compileAuth({
				modelName: 'auth',
				resource: 'user',
				access: 'delete',
				options: {
					$filter: {
						actor: permissions.canAccess,
					},
				},
			});
			expect(auth).to.be.eq('auth.user.delete?actor/canAccess()');
		});

		it('should compile auth with canAccess and complex $filter', () => {
			const auth = userPineClient.compileAuth({
				modelName: 'auth',
				resource: 'user',
				access: 'read',
				options: {
					$filter: {
						$or: [
							{
								actor: permissions.canAccess,
							},
							{
								$and: {
									username: 'someuser',
									user__has__role: {
										$any: {
											$alias: 'uhr',
											$expr: {
												uhr: {
													user: permissions.canAccess,
												},
											},
										},
									},
								},
							},
						],
					},
				},
			});
			expect(auth).to.be.eq(
				"auth.user.read?(actor/canAccess()) or ((username eq 'someuser') and (user__has__role/any(uhr:uhr/user/canAccess())))",
			);
		});
	});
});
