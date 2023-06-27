import { expect } from 'chai';
const configPath = __dirname + '/fixtures/05-request-cancellation/config';
const hooksPath = __dirname + '/fixtures/05-request-cancellation/hooks';
import { testInit, testDeInit, testLocalServer } from './lib/test-init';
import { PineTest } from 'pinejs-client-supertest';
import * as request from 'request';
import { setTimeout } from 'timers/promises';

const requestAsync = (
	opts:
		| (request.UriOptions & request.CoreOptions)
		| (request.UrlOptions & request.CoreOptions),
) => {
	let req: ReturnType<typeof request>;
	const promise = new Promise((resolve, reject) => {
		req = request(opts, (err, response) => {
			if (err) {
				reject(err);
				return;
			}
			resolve(response);
		});
	}) as Promise<request.Response> & { req: ReturnType<typeof request> };
	promise.req = req!;
	return promise;
};

async function expectLogs(pineTest: PineTest, expectedLogs: string[]) {
	const { body: logs } = await pineTest
		.get<Array<{ content: string }>>({
			apiPrefix: 'example/',
			resource: 'log',
			options: {
				$select: 'content',
				$orderby: 'created_at asc',
			},
		})
		.expect(200);

	expect(logs.map((l) => l.content)).to.deep.equal(expectedLogs);
}

describe('05 request cancellation tests', function () {
	let pineTest: PineTest;
	let pineServer: Awaited<ReturnType<typeof testInit>>;

	before(async () => {
		pineServer = await testInit({ configPath, hooksPath });
		pineTest = new PineTest({}, { app: testLocalServer });
		await pineTest
			.delete({
				apiPrefix: 'example/',
				resource: 'slow_resource',
			})
			.expect(200);
	});

	beforeEach(async function () {
		await pineTest
			.delete({
				apiPrefix: 'example/',
				resource: 'log',
			})
			.expect(200);
	});

	after(async () => {
		await testDeInit(pineServer);
	});

	describe('OData requests', function () {
		it('should stop & rollback the transaction when a request is aborted', async () => {
			const { req } = requestAsync({
				url: `${testLocalServer}/example/slow_resource`,
				method: 'POST',
				body: {
					name: 'TestOData',
				},
				json: true,
			});

			await setTimeout(100);
			req.abort();
			await setTimeout(500);

			const { body } = await pineTest
				.get({
					apiPrefix: 'example/',
					resource: 'slow_resource',
					options: {
						$filter: {
							name: 'TestOData',
						},
					},
				})
				.expect(200);
			expect(body).to.have.lengthOf(0);

			await expectLogs(pineTest, [
				'POST slow_resource POSTRUN started',
				'POST slow_resource POSTRUN updated the note once',
				'POST slow_resource POSTRUN spent some time waiting',
				'POST slow_resource POSTRUN-ERROR',
			]);
		});

		it('should be able to create a slow resource entry using a request', async () => {
			const res = await requestAsync({
				url: `${testLocalServer}/example/slow_resource`,
				method: 'POST',
				body: {
					name: 'TestOData',
				},
				json: true,
			});
			expect(res).to.have.property('statusCode', 201);

			const { body } = await pineTest
				.get({
					apiPrefix: 'example/',
					resource: 'slow_resource',
					options: {
						$filter: {
							name: 'TestOData',
						},
					},
				})
				.expect(200);
			expect(body).to.have.lengthOf(1);
			expect(body[0]).to.have.property(
				'note',
				'I got updated twice after the slow POSTRUN',
			);

			await expectLogs(pineTest, [
				'POST slow_resource POSTRUN started',
				'POST slow_resource POSTRUN updated the note once',
				'POST slow_resource POSTRUN spent some time waiting',
				'POST slow_resource POSTRUN updated the note again',
				'POST slow_resource POSTRUN finished',
				'POST slow_resource PRERESPOND',
			]);
		});
	});
});
