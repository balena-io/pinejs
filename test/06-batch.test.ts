const configPath = __dirname + '/fixtures/06-batch/config';
const hooksPath = __dirname + '/fixtures/06-batch/translations/hooks';
import { testInit, testDeInit, testLocalServer } from './lib/test-init';
import { faker } from '@faker-js/faker';
import { expect } from 'chai';
import * as supertest from 'supertest';

const validBatchMethods = ['PUT', 'POST', 'PATCH', 'DELETE', 'GET'];

// TODO: figure out how to not persist the results across describes
describe('06 batch tests', function () {
	let pineServer: Awaited<ReturnType<typeof testInit>>;
	before(async () => {
		pineServer = await testInit({
			configPath,
			hooksPath,
			deleteDb: true,
		});
		// setup faker so that test date uniqueness is set for all test cases
		faker.seed();
	});

	after(async () => {
		testDeInit(pineServer);
	});

	describe('Basic', () => {
		it('check /ping route is OK', async () => {
			await supertest(testLocalServer).get('/ping').expect(200, 'OK');
		});
	});

	describe('test non-atomic batch requests', () => {
		it('should create two students', async () => {
			await supertest(testLocalServer)
				.post('/university/$batch')
				.send({
					requests: [
						{
							id: '0',
							method: 'POST',
							url: '/university/student',
							body: {
								matrix_number: 100000,
								name: faker.name.firstName(),
								last_name: faker.name.lastName(),
								studies_at__campus: 'foo',
							},
						},
						{
							id: '1',
							method: 'POST',
							url: '/university/student',
							body: {
								matrix_number: 100001,
								name: faker.name.firstName(),
								last_name: faker.name.lastName(),
								studies_at__campus: 'bar',
							},
						},
					],
				})
				.expect(200);
			const res = await supertest(testLocalServer)
				.get('/university/student')
				.expect(200);
			expect(res.body)
				.to.be.an('object')
				.that.has.ownProperty('d')
				.to.be.an('array')
				.of.length(2);
		});

		it('successful request should have `responses` in its body', async () => {
			const id = Math.random().toString();
			const res = await supertest(testLocalServer)
				.post('/university/$batch')
				.send({
					requests: [
						{
							id,
							method: 'GET',
							url: '/university/student',
						},
					],
				})
				.expect(200);
			expect(res.body)
				.to.be.an('object')
				.that.has.ownProperty('responses')
				.to.be.an('array')
				.of.length(1);
			expect(res.body.responses[0].body)
				.to.be.an('object')
				.that.has.ownProperty('d')
				.to.be.an('array')
				.of.length(2);
			expect(res.body.responses[0].id).to.equal(id);
		});

		it('should fail if the body does not have a valid "requests" property', async () => {
			await supertest(testLocalServer)
				.post('/university/$batch')
				.send({})
				.expect(
					400,
					'"Batch requests must include an array of requests in the body via the \\"requests\\" property"',
				);
			await supertest(testLocalServer)
				.post('/university/$batch')
				.send({ requests: 'test' })
				.expect(
					400,
					'"Batch requests must include an array of requests in the body via the \\"requests\\" property"',
				);
		});

		// TODO: Seems we have default `continue-on-error` = `false`, but the docs specify `true`. Do we want to continue like this?
		it('should not complete following requests if an earlier request fails', async () => {
			await supertest(testLocalServer)
				.post('/university/$batch')
				.send({
					requests: [
						{
							id: '0',
							method: 'POST',
							url: '/university/student',
							body: {
								matrix_number: null,
								name: faker.name.firstName(),
								last_name: faker.name.lastName(),
								studies_at__campus: 'foo',
							},
						},
						{
							id: '1',
							method: 'POST',
							url: '/university/student',
							body: {
								matrix_number: 100003,
								name: faker.name.firstName(),
								last_name: faker.name.lastName(),
								studies_at__campus: 'bar',
							},
						},
					],
				})
				.expect(200);
			const res = await supertest(testLocalServer)
				.get('/university/student')
				.expect(200);
			expect(res.body)
				.to.be.an('object')
				.that.has.ownProperty('d')
				.to.be.an('array')
				.of.length(2);
		});

		it('should fail if any request does not have a string id', async () => {
			await supertest(testLocalServer)
				.post('/university/$batch')
				.send({
					requests: [
						{
							id: '0',
							method: 'POST',
							url: '/university/student',
							body: {
								matrix_number: 100003,
								name: faker.name.firstName(),
								last_name: faker.name.lastName(),
								studies_at__campus: 'foo',
							},
						},
						{
							method: 'POST',
							url: '/university/student',
							body: {
								matrix_number: 100004,
								name: faker.name.firstName(),
								last_name: faker.name.lastName(),
								studies_at__campus: 'bar',
							},
						},
					],
				})
				.expect(
					400,
					'"All requests in a batch request must have unique string ids"',
				);
			await supertest(testLocalServer)
				.post('/university/$batch')
				.send({
					requests: [
						{
							id: 0,
							method: 'POST',
							url: '/university/student',
							body: {
								matrix_number: 100003,
								name: faker.name.firstName(),
								last_name: faker.name.lastName(),
								studies_at__campus: 'foo',
							},
						},
						{
							id: 'hello',
							method: 'POST',
							url: '/university/student',
							body: {
								matrix_number: 100004,
								name: faker.name.firstName(),
								last_name: faker.name.lastName(),
								studies_at__campus: 'bar',
							},
						},
					],
				})
				.expect(
					400,
					'"All requests in a batch request must have unique string ids"',
				);
		});

		it('should fail if not all requests have a unique id', async () => {
			await supertest(testLocalServer)
				.post('/university/$batch')
				.send({
					requests: [
						{
							id: '0',
							method: 'POST',
							url: '/university/student',
							body: {
								matrix_number: 100003,
								name: faker.name.firstName(),
								last_name: faker.name.lastName(),
								studies_at__campus: 'foo',
							},
						},
						{
							id: '0',
							method: 'POST',
							url: '/university/student',
							body: {
								matrix_number: 100004,
								name: faker.name.firstName(),
								last_name: faker.name.lastName(),
								studies_at__campus: 'bar',
							},
						},
					],
				})
				.expect(
					400,
					'"All requests in a batch request must have unique string ids"',
				);
		});

		it('should fail if any of the requests is a batch request', async () => {
			await supertest(testLocalServer)
				.post('/university/$batch')
				.send({
					requests: [
						{
							id: '0',
							method: 'POST',
							url: '/university/$batch',
							body: {
								matrix_number: 100003,
								name: faker.name.firstName(),
								last_name: faker.name.lastName(),
								studies_at__campus: 'foo',
							},
						},
						{
							id: '1',
							method: 'POST',
							url: '/university/student',
							body: {
								matrix_number: 100004,
								name: faker.name.firstName(),
								last_name: faker.name.lastName(),
								studies_at__campus: 'bar',
							},
						},
					],
				})
				.expect(400, '"Batch requests cannot contain batch requests"');
		});

		it('should fail if any of the requests does not have a url property', async () => {
			await supertest(testLocalServer)
				.post('/university/$batch')
				.send({
					requests: [
						{
							id: '0',
							method: 'POST',
							body: {
								matrix_number: 100003,
								name: faker.name.firstName(),
								last_name: faker.name.lastName(),
								studies_at__campus: 'foo',
							},
						},
						{
							id: '1',
							method: 'POST',
							url: '/university/student',
							body: {
								matrix_number: 100004,
								name: faker.name.firstName(),
								last_name: faker.name.lastName(),
								studies_at__campus: 'bar',
							},
						},
					],
				})
				.expect(400, '"Requests of a batch request must have a \\"url\\""');
		});

		it('should fail if any of the requests does not have a valid value for method', async () => {
			await supertest(testLocalServer)
				.post('/university/$batch')
				.send({
					requests: [
						{
							id: '0',
							url: '/university/student',
							body: {
								matrix_number: 100003,
								name: faker.name.firstName(),
								last_name: faker.name.lastName(),
								studies_at__campus: 'foo',
							},
						},
						{
							id: '1',
							method: 'POST',
							url: '/university/student',
							body: {
								matrix_number: 100004,
								name: faker.name.firstName(),
								last_name: faker.name.lastName(),
								studies_at__campus: 'bar',
							},
						},
					],
				})
				.expect(400, '"Requests of a batch request must have a \\"method\\""');
			await supertest(testLocalServer)
				.post('/university/$batch')
				.send({
					requests: [
						{
							id: '0',
							method: 'MERGE',
							url: '/university/student',
							body: {
								matrix_number: 100003,
								name: faker.name.firstName(),
								last_name: faker.name.lastName(),
								studies_at__campus: 'foo',
							},
						},
						{
							id: '1',
							method: 'POST',
							url: '/university/student',
							body: {
								matrix_number: 100004,
								name: faker.name.firstName(),
								last_name: faker.name.lastName(),
								studies_at__campus: 'bar',
							},
						},
					],
				})
				.expect(
					400,
					`"Requests of a batch request must have a method matching one of the following: ${validBatchMethods.join(
						', ',
					)}"`,
				);
		});

		it('should fail if any of the requests have method GET or DELETE and have a body', async () => {
			await supertest(testLocalServer)
				.post('/university/$batch')
				.send({
					requests: [
						{
							id: '0',
							method: 'POST',
							url: '/university/student',
							body: {
								matrix_number: 100003,
								name: faker.name.firstName(),
								last_name: faker.name.lastName(),
								studies_at__campus: 'foo',
							},
						},
						{
							id: '1',
							method: 'GET',
							url: '/university/student',
							body: {
								matrix_number: 100004,
								name: faker.name.firstName(),
								last_name: faker.name.lastName(),
								studies_at__campus: 'bar',
							},
						},
					],
				})
				.expect(
					400,
					'"GET and DELETE requests of a batch request must not have a body"',
				);
			await supertest(testLocalServer)
				.post('/university/$batch')
				.send({
					requests: [
						{
							id: '0',
							method: 'POST',
							url: '/university/student',
							body: {
								matrix_number: 100003,
								name: faker.name.firstName(),
								last_name: faker.name.lastName(),
								studies_at__campus: 'foo',
							},
						},
						{
							id: '1',
							method: 'DELETE',
							url: '/university/student',
							body: {
								matrix_number: 100004,
								name: faker.name.firstName(),
								last_name: faker.name.lastName(),
								studies_at__campus: 'bar',
							},
						},
					],
				})
				.expect(
					400,
					'"GET and DELETE requests of a batch request must not have a body"',
				);
		});

		it('should fail if trying to query cross-model in one batch', async () => {
			await supertest(testLocalServer)
				.post('/university/$batch')
				.send({
					requests: [
						{
							id: '0',
							method: 'POST',
							url: '/v1/student',
							body: {
								matrix_number: 100003,
								name: faker.name.firstName(),
								last_name: faker.name.lastName(),
								studies_at__campus: 'foo',
							},
						},
						{
							id: '1',
							method: 'POST',
							url: '/university/student',
							body: {
								matrix_number: 100004,
								name: faker.name.firstName(),
								last_name: faker.name.lastName(),
								studies_at__campus: 'bar',
							},
						},
					],
				})
				.expect(
					400,
					'"Batch requests must consist of requests for only one model"',
				);
		});

		it('Should error if any authorization is passed in a request in the requests array', async () => {
			await supertest(testLocalServer)
				.post('/university/$batch')
				.send({
					requests: [
						{
							id: '0',
							method: 'POST',
							url: '/v1/student?apikey=some_key',
							body: {
								matrix_number: 100004,
								name: faker.name.firstName(),
								last_name: faker.name.lastName(),
								studies_at__campus: 'foo',
							},
						},
					],
				})
				.expect(
					400,
					'"Authorization may only be passed to the main batch request"',
				);

			await supertest(testLocalServer)
				.post('/university/$batch')
				.send({
					requests: [
						{
							id: '0',
							method: 'POST',
							url: '/v1/student',
							headers: { authorization: 'Bearer test' },
							body: {
								matrix_number: 100004,
								name: faker.name.firstName(),
								last_name: faker.name.lastName(),
								studies_at__campus: 'foo',
							},
						},
					],
				})
				.expect(
					400,
					'"Authorization may only be passed to the main batch request"',
				);
		});
	});
});
