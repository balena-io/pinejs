import { writeFileSync } from 'fs';
import { expect } from 'chai';
import supertest from 'supertest';
import { testInit, testDeInit, testLocalServer } from './lib/test-init';

import OpenAPIParser from '@readme/openapi-parser';

describe('08 metadata / openAPI spec', function () {
	describe('Full model access specification', async function () {
		const fixturePath =
			__dirname + '/fixtures/09-metadata/config-full-access.js';
		let pineServer: Awaited<ReturnType<typeof testInit>>;
		before(async () => {
			pineServer = await testInit({
				configPath: fixturePath,
				deleteDb: true,
			});
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

		it('should send valid OpenAPI spec JSON on /$metadata', async () => {
			const { body } = await supertest(testLocalServer)
				.get('/example/openapi.json')
				.expect(200);
			expect(body).to.be.an('object');

			const bodySpec = JSON.stringify(body, null, 2);
			await writeFileSync('openApiSpe-full.json', bodySpec);

			// validate the openAPI spec and expect no validator errors.
			try {
				const apiSpec = await OpenAPIParser.validate(JSON.parse(bodySpec));
				expect(apiSpec).to.be.an('object');
			} catch (err) {
				expect(err).to.be.undefined;
			}
		});

		it('OpenAPI spec should contain all paths and actions on resources', async () => {
			// full CRUD access for device resource
			const res = await supertest(testLocalServer)
				.get('/example/openapi.json')
				.expect(200);
			expect(res.body).to.be.an('object');

			// all collections should have get, patch, delete and post
			const singleIdPathRegEx = /\({id}\)/;
			for (const [path, value] of Object.entries(res.body.paths)) {
				if (!singleIdPathRegEx.exec(path)) {
					expect(value).to.have.keys(['get', 'patch', 'delete', 'post']);
				}
			}
		});
	});
});
