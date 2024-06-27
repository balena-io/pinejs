import supertest from 'supertest';
import { expect } from 'chai';
const configPath = __dirname + '/fixtures/08-sbvrApi/config.js';
import { testInit, testDeInit, testLocalServer } from './lib/test-init';
import { PineTest } from 'pinejs-client-supertest';
import type { AnyObject } from 'pinejs-client-core';

describe('08 sbvrApi', function () {
	let pineServer: Awaited<ReturnType<typeof testInit>>;
	let pineTest: PineTest;
	before(async () => {
		pineServer = await testInit({
			configPath,
			deleteDb: true,
			exposeAuthEndpoints: true,
		});
		pineTest = new PineTest({}, { app: testLocalServer });
	});

	after(async () => {
		testDeInit(pineServer);
	});

	describe('permissions.getUserPermissionsForRole', () => {
		let guestId: number;
		const testPermissions = ['test.permission1', 'test.permission2'];
		before(async () => {
			guestId = await getUserId('guest');
			const permissionIds = await createPermissions(testPermissions);
			const roleId = await createRole('test', permissionIds);
			await grantRoleToUser(roleId, guestId);
		});

		it(`should be able to get a specific user permissions`, async () => {
			// pine API only exists on the process it is currently running.
			// We use custom endpoints to expose the specific funcionality being tested
			const response = await supertest(testLocalServer)
				.get('/auth-test/getUserPermissionsForRole')
				.send({ userId: guestId });
			expect(response.body).to.deep.equal([...testPermissions, 'resource.all']);
		});

		it(`should be an empty array if user does not exist`, async () => {
			const response = await supertest(testLocalServer)
				.get('/auth-test/getUserPermissions')
				.send({ userId: 4242 });
			expect(response.body).to.deep.equal([]);
		});
	});

	const getUserId = async (username: string): Promise<number> => {
		const {
			d: [{ id }],
		} = await doAuthRequest('GET', 'user', { username });
		return id;
	};

	const createPermissions = async (
		permissionNames: string[],
	): Promise<number[]> => {
		return (
			await Promise.all(
				permissionNames.map(async (permissionName) =>
					doAuthRequest('POST', 'permission', { name: permissionName }),
				),
			)
		).map((response) => response.id);
	};

	const createRole = async (
		roleName: string,
		permissionIds: number[],
	): Promise<number> => {
		const { id: roleId } = await doAuthRequest('POST', 'role', {
			name: roleName,
		});
		await Promise.all(
			permissionIds.map(async (permissionId) =>
				doAuthRequest('POST', 'role__has__permission', {
					role: roleId,
					permission: permissionId,
				}),
			),
		);

		return roleId;
	};

	const grantRoleToUser = async (role: number, user: number) => {
		await doAuthRequest('POST', 'user__has__role', { role, user });
	};

	const doAuthRequest = async (
		method: 'GET' | 'POST',
		resource: string,
		body: AnyObject,
	) => {
		return (
			await pineTest.request({
				apiPrefix: 'Auth/',
				method,
				resource,
				body,
				options: { returnResource: false },
			})
		).body;
	};
});
