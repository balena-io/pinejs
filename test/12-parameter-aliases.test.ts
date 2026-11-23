import supertest from 'supertest';
import { expect } from 'chai';
import ODataParser from '@balena/odata-parser';
import { memoizedParseOdata } from '@balena/pinejs/out/sbvr-api/uri-parser.js';
import { testInit, testDeInit, testLocalServer } from './lib/test-init.ts';

const fixturesPath = import.meta.dirname + '/fixtures/12-parameter-aliases/';

// `binds` is an array that also has `@alias` keys, which a plain deep equal ignores
const parse = (fn: () => ReturnType<typeof ODataParser.parse>) => {
	try {
		const { tree, binds } = fn();
		return { tree, binds: Object.entries(binds) };
	} catch (err) {
		return { error: err instanceof Error ? err.constructor.name : err };
	}
};

describe('12 parameter aliases', function () {
	describe('parsing', () => {
		for (const url of [
			"/a?$filter=b eq 'x%20y'&@c=1",
			"/a?$filter=b eq @c&@c='p%20q'",
			"/a?$filter=b eq 'a+b'&@c='c%2Bd'",
			"/a?$filter=b eq '%2541'&@c='%2542'",
			"/a?$filter=b eq '100%25'&@c='50%25'",
			"/a?$filter=b eq @c&@c='it''s'",
			'/a?@c=1&$filter=b eq @c and d eq 2&$top=5',
			'/a(@id)?@id=1',
			"/a(@id)?$select=b&@id='x'",
			'/a?$filter=b eq @é&@%C3%A9=1',
			'/a?$filter=b eq @%C3%A9&@%C3%A9=1',
			'/a?%40c=1&$filter=b eq 1',
			'/a?$filter=b eq @c&@c=1&@c=2',
			'/a?$filter=b eq @c&&@c=1',
			'/a?&@c=1',
			'/a?$filter=b eq @c&@c=1&',
			"/a?$filter=b eq 'x&@c=1'",
			"/a?$filter=b eq @c&@c='x&y'",
			'/a?$filter=b eq @c&@c=%27x&y%27',
		]) {
			it(`should parse ${url} the same as parsing the full url`, () => {
				expect(parse(() => memoizedParseOdata(url))).to.deep.equal(
					parse(() => ODataParser.parse(url)),
				);
			});
		}

		it('should decode text literals exactly once', () => {
			const { binds } = memoizedParseOdata(
				"/a?$filter=b eq 'x%20y' and c eq '%2541' and d eq '100%25' and e eq @f&@f='p%20q'",
			);
			expect(binds.slice()).to.deep.equal([
				['Text', 'x y'],
				['Text', '%41'],
				['Text', '100%'],
			]);
			expect(binds['@f']).to.deep.equal(['Text', 'p q']);
		});
	});

	describe('api keys', () => {
		let pineServer: Awaited<ReturnType<typeof testInit>>;
		let readActor: number;
		let spacedActor: number;
		before(async () => {
			pineServer = await testInit({
				configPath: fixturesPath + 'config.ts',
				routesPath: fixturesPath + 'routes.ts',
				deleteDb: true,
			});
			({
				body: { readActor, spacedActor },
			} = await supertest(testLocalServer).post('/seed').expect(201));
		});

		after(() => {
			testDeInit(pineServer);
		});

		it('should resolve an api key', async () => {
			const { body } = await supertest(testLocalServer)
				.post('/check-api-key')
				.send({ key: 'read-key' })
				.expect(200);
			expect(body).to.deep.equal({
				actor: readActor,
				permissions: ['example.note.read'],
			});
		});

		it('should resolve an api key containing spaces, quotes and percent signs', async () => {
			const { body } = await supertest(testLocalServer)
				.post('/check-api-key')
				.send({ key: "a key's 100% spaced" })
				.expect(200);
			expect(body).to.deep.equal({
				actor: spacedActor,
				permissions: ['example.note.create'],
			});
		});
	});
});
