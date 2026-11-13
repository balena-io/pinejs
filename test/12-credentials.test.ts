import supertest from 'supertest';
import { expect } from 'chai';
import { testInit, testDeInit, testLocalServer } from './lib/test-init.ts';

const configPath = import.meta.dirname + '/fixtures/12-credentials/config.ts';
const routesPath = import.meta.dirname + '/fixtures/12-credentials/routes.ts';

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
		pineServer = await testInit({
			configPath,
			routesPath,
			deleteDb: true,
			withLoginRoute: true,
		});
	});

	after(() => {
		testDeInit(pineServer);
	});

	let user: { actor: { __id: number }; credential: { __id: number } };
	let apiKey: { credential: { __id: number } };
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
		apiKey = await getAuthResource('api_key', res.body.id, 'credential');
		expect(apiKey.credential)
			.to.have.property('__id')
			.that.is.a('number')
			.and.does.not.equal(user.credential.__id);
	});

	it("should authenticate a request with the api key's credential", async () => {
		const res = await supertest(testLocalServer)
			.get('/credential?apikey=credential-api-key')
			.expect(200);
		expect(res.body).to.deep.equal({
			user: null,
			apiKey: apiKey.credential.__id,
		});
	});

	it("should authenticate a logged in request with the user's credential", async () => {
		const login = await supertest(testLocalServer)
			.post('/login')
			.set('X-Requested-With', 'XMLHttpRequest')
			.send({
				username: 'credential-user',
				password: 'password',
			})
			.expect(200);
		const res = await supertest(testLocalServer)
			.get('/credential')
			.set('Cookie', login.headers['set-cookie'])
			.expect(200);
		expect(res.body).to.deep.equal({
			user: user.credential.__id,
			apiKey: null,
		});
	});
});
