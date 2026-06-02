import supertest from 'supertest';
import { expect } from 'chai';
import { testInit, testDeInit, testLocalServer } from './lib/test-init.js';

const configPath = import.meta.dirname + '/fixtures/11-extra-binds/config.js';
const routesPath = import.meta.dirname + '/fixtures/11-extra-binds/routes.js';

const names = (body: Array<{ name: string }>) => body.map((s) => s.name);

describe('11 extra binds', function () {
	let pineServer: Awaited<ReturnType<typeof testInit>>;
	before(async () => {
		pineServer = await testInit({ configPath, routesPath, deleteDb: true });
		await supertest(testLocalServer).post('/seed').expect(201);
	});

	after(() => {
		testDeInit(pineServer);
	});

	describe('a caller-supplied named bind is resolved into the permission rule', () => {
		it('Real bind: filters on the integer semester_credits column', async () => {
			const res = await supertest(testLocalServer)
				.get('/by-credits?credits=10')
				.expect(200);
			expect(names(res.body)).to.deep.equal(['student-1', 'student-2']);
		});

		it('Real bind: a different value reuses the same (shared) permission rule', async () => {
			const res = await supertest(testLocalServer)
				.get('/by-credits?credits=12')
				.expect(200);
			expect(names(res.body)).to.deep.equal(['student-3']);
		});

		it('Text bind: filters on the text name column', async () => {
			const res = await supertest(testLocalServer)
				.get('/by-name?name=student-3')
				.expect(200);
			expect(names(res.body)).to.deep.equal(['student-3']);
		});

		it('Date bind: filters chronologically on the date-time birthday column', async () => {
			const res = await supertest(testLocalServer)
				.get('/born-after?since=2000-06-01T00:00:00.000Z')
				.expect(200);
			// student-1 (born 2000-01) is excluded; a Text comparison would not order these correctly.
			expect(names(res.body)).to.deep.equal(['student-2', 'student-3']);
		});

		it('mixed bind types resolve together in a single rule', async () => {
			const res = await supertest(testLocalServer)
				.get(
					'/combined?credits=10&name=student-1&since=1999-01-01T00:00:00.000Z',
				)
				.expect(200);
			expect(names(res.body)).to.deep.equal(['student-1']);
		});
	});

	describe('safety', () => {
		it('fails closed when a referenced bind is not supplied', async () => {
			const res = await supertest(testLocalServer)
				.get('/missing-bind')
				.expect(400);
			expect(res.body).to.not.be.an('array');
			expect(res.body).to.have.property('error');
		});

		it('rejects overriding the reserved @__ACTOR_ID bind', async () => {
			const res = await supertest(testLocalServer).get('/reserved').expect(400);
			expect(res.body).to.not.be.an('array');
			expect(res.body).to.have.property('error');
		});

		it('rejects a bind key that does not use the reserved @__ prefix', async () => {
			const res = await supertest(testLocalServer)
				.get('/unprefixed-bind')
				.expect(400);
			expect(res.body).to.not.be.an('array');
			expect(res.body).to.have.property('error');
		});
	});
});
