import supertest from 'supertest';
import { expect } from 'chai';
import { testInit, testDeInit, testLocalServer } from './lib/test-init.ts';

const configPath = import.meta.dirname + '/fixtures/12-credentials/config.ts';

const getAuthResource = async (
	resource: 'user' | 'api_key',
	id: number,
	$select: string,
) => {
	const res = await supertest(testLocalServer)
		.get(`/Auth/${resource}(${id})?$select=${$select}`)
		.expect(200);
	return res.body.d[0];
};

describe('12 credentials', function () {
	let pineServer: Awaited<ReturnType<typeof testInit>>;
	before(async () => {
		pineServer = await testInit({ configPath, deleteDb: true });
	});

	after(() => {
		testDeInit(pineServer);
	});

	let user: { actor: { __id: number }; credential: { __id: number } };
	it('should create a credential for a new user', async () => {
		const res = await supertest(testLocalServer)
			.post('/Auth/user')
			.send({
				username: 'credential-user',
				password: 'password',
			})
			.expect(201);
		user = await getAuthResource('user', res.body.id, 'actor,credential');
		expect(user.credential).to.have.property('__id').that.is.a('number');
	});

	it('should create a credential for a new api key, ignoring one in the body', async () => {
		const res = await supertest(testLocalServer)
			.post('/Auth/api_key')
			.send({
				key: 'credential-api-key',
				is_of__actor: user.actor.__id,
				credential: user.credential.__id,
			})
			.expect(201);
		const apiKey = await getAuthResource('api_key', res.body.id, 'credential');
		expect(apiKey.credential)
			.to.have.property('__id')
			.that.is.a('number')
			.and.does.not.equal(user.credential.__id);
	});
});
