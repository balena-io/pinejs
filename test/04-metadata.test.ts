import * as fs from 'fs';
import { expect } from 'chai';
import * as supertest from 'supertest';
import { testInit, testDeInit, testLocalServer } from './lib/test-init';

describe('04 metadata', function () {
	describe('Full model access specification', async function () {
		const fixturePath = __dirname + '/fixtures/04-metadata/config-full-access';
		let pineServer: Awaited<ReturnType<typeof testInit>>;
		before(async () => {
			pineServer = await testInit(fixturePath, true);
		});

		after(async () => {
			await testDeInit(pineServer);
		});

		it('should send OData CSDL JSON on /$metadata', async () => {
			const res = await supertest(testLocalServer)
				.get('/example/$metadata')
				.expect(200);
			expect(res.body).to.be.an('object');
		});

		it('should send OpenAPI spec JSON on /$metadata', async () => {
			const res = await supertest(testLocalServer)
				.get('/example/openapi.json')
				.expect(200);
			expect(res.body).to.be.an('object');
		});

		it('OpenAPI spec should contain all paths and actions on resources', async () => {
			// full CRUD access for device resource
			const res = await supertest(testLocalServer)
				.get('/example/openapi.json')
				.expect(200);
			expect(res.body).to.be.an('object');

			fs.writeFileSync('./openapiSpec.json', JSON.stringify(res.body, null, 2));

			for (const value of Object.values(res.body.paths)) {
				console.log(`value:${JSON.stringify(value, null, 2)}`);
				expect(value).to.have.keys(['get', 'patch', 'delete', 'post']);
			}
		});
	});
});
