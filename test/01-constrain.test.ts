import * as supertest from 'supertest';
import { expect } from 'chai';
const fixturePath = __dirname + '/fixtures/01-constrain/config';
import { testInit, testDeInit, testLocalServer } from './lib/test-init';
import * as fsBase from 'fs';
const fs = fsBase.promises;
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline as pipelineRaw, Readable } from 'stream';
import { tmpdir } from 'node:os';
import * as util from 'node:util';
import { v4 } from 'uuid';
const pipeline = util.promisify(pipelineRaw);
import * as path from 'path';
import { maxFileSize } from '../src/server-glue/webresource-handler';

describe('01 basic constrain tests', function () {
	let pineServer: Awaited<ReturnType<typeof testInit>>;
	before(async () => {
		pineServer = await testInit(fixturePath, true);
	});

	after(async () => {
		await testDeInit(pineServer);
	});

	describe('Basic', () => {
		it('check /ping route is OK', async () => {
			await supertest(testLocalServer).get('/ping').expect(200, 'OK');
		});
	});

	describe('university vocabular', () => {
		it('check /university/student is served by pinejs', async () => {
			const res = await supertest(testLocalServer)
				.get('/university/student')
				.expect(200);
			expect(res.body)
				.to.be.an('object')
				.that.has.ownProperty('d')
				.to.be.an('array');
		});

		it('create a student', async () => {
			await supertest(testLocalServer)
				.post('/university/student')
				.send({
					matrix_number: 1,
					name: 'John',
					lastname: 'Doe',
					birthday: new Date(),
					semester_credits: 10,
				})
				.expect(201);
		});

		it('should fail to create a student with same matrix number ', async () => {
			await supertest(testLocalServer)
				.post('/university/student')
				.send({
					matrix_number: 1,
					name: 'John',
					lastname: 'Doe',
					birthday: new Date(),
					semester_credits: 10,
				})
				.expect(409);
		});

		it('should fail to create a student with too few semester credits ', async () => {
			const res = await supertest(testLocalServer)
				.post('/university/student')
				.send({
					matrix_number: 2,
					name: 'Jenny',
					lastname: 'Dea',
					birthday: new Date(),
					semester_credits: 2,
				})
				.expect(400);
			expect(res.body)
				.to.be.a('string')
				.that.equals(
					'It is necessary that each student that has a semester credits, has a semester credits that is greater than or equal to 4 and is less than or equal to 16.',
				);
		});

		it('create a student with a picture', async () => {
			const filePath = 'test/fixtures/resources/avatar-profile.png';
			const filename = filePath.split('/').pop();
			const fileInfo = await fs.stat(filePath);
			const fileSize = fileInfo.size;

			const contentType = 'image/png';
			const res = await supertest(testLocalServer)
				.post('/university/student')
				.field('name', 'John')
				.field('lastname', 'Doe')
				.field('matrix_number', 2)
				.field('birthday', '2022-09-14')
				.field('semester_credits', 10)
				.attach('picture', filePath, { filename, contentType });
			expect(res.status).to.equals(201);
			const student = res.body;

			const res2 = await supertest(testLocalServer)
				.get(res.headers.location)
				.expect(200);
			expect(res2.body)
				.to.be.an('object')
				.that.has.ownProperty('d')
				.to.be.an('array');

			expect(student.picture.size).to.equals(fileSize);
			expect(student.picture.filename).to.equals(filename);
			expect(student.picture.contentType).to.equals(contentType);

			const { body: photoRes } = await supertest(student.picture.href)
				.get('')
				.set({
					responseType: 'arraybuffer',
					headers: {
						Accept: '*/*',
					},
				})
				.expect(200);

			const receivedSize = photoRes.length;
			expect(receivedSize).to.equals(fileSize);
			const realImage = await fs.readFile(filePath);
			const test = realImage.compare(photoRes);
			expect(test).to.be.eq(0);
		});

		it('create a student with a large picture', async () => {
			// Create a large file by using an image at the head ( so that filetype can identify it as an image ),
			// and then appending a large chunk
			const headFilePath = 'test/fixtures/resources/avatar-profile.png';
			const headFileInfo = await fs.stat(headFilePath);
			const headFileSize = headFileInfo.size;

			const filename = headFilePath.split('/').pop();
			const fillerSize = Math.round(maxFileSize - headFileSize);
			const chunkSize = 10 * 1024 * 1024;
			const chunks = Math.floor(fillerSize / chunkSize);
			const filler = Buffer.alloc(chunkSize);

			async function* generate() {
				yield await fs.readFile(headFilePath);
				for (let i = 0; i < chunks; i++) {
					yield filler;
				}
			}

			// We need to create a temp file because supertest.attach expects a fs.readStream, not a plain ReadStream
			const tmpFileName = path.join(tmpdir(), v4());
			await pipeline(Readable.from(generate()), createWriteStream(tmpFileName));

			const fileInfo = await fs.stat(tmpFileName);
			const fileSize = fileInfo.size;

			const largeStream = createReadStream(tmpFileName);

			const contentType = 'image/png';
			const res = await supertest(testLocalServer)
				.post('/university/student')
				.field('name', 'John')
				.field('lastname', 'Doe')
				.field('matrix_number', 3)
				.field('birthday', '2022-09-14')
				.field('semester_credits', 10)
				.attach('picture', largeStream, { filename, contentType });
			expect(res.status).to.equals(201);
			const student = res.body;

			const res2 = await supertest(testLocalServer)
				.get(res.headers.location)
				.expect(200);
			expect(res2.body)
				.to.be.an('object')
				.that.has.ownProperty('d')
				.to.be.an('array');

			expect(student.picture.size).to.equals(fileSize);
			expect(student.picture.filename).to.equals(filename);
			expect(student.picture.contentType).to.equals(contentType);
		});
	});
});
