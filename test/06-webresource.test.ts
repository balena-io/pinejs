import supertest from 'supertest';
import { expect } from 'chai';
const configPath = import.meta.dirname + '/fixtures/06-webresource/config.js';
const hooksPath =
	import.meta.dirname + '/fixtures/06-webresource/translations/hooks.js';
const testResourcePath =
	import.meta.dirname + '/fixtures/06-webresource/resources/';

import { promises as fs } from 'fs';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline as pipelineRaw, Readable } from 'stream';
import util from 'util';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import path from 'path';
import { testInit, testDeInit, testLocalServer } from './lib/test-init.js';
import {
	ListObjectsV2Command,
	S3Client,
	DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { intVar, requiredVar } from '@balena/env-parsing';
import { assertExists } from './lib/common.js';
import type { BeginUploadResponse } from '../out/webresource-handler/multipartUpload.js';

const pipeline = util.promisify(pipelineRaw);

describe('06 webresources tests', function () {
	let pineServer: Awaited<ReturnType<typeof testInit>>;

	const filePath = `${testResourcePath}/avatar-profile.png`;
	const newFilePath = `${testResourcePath}/other-image.png`;

	const filename = filePath.split('/').pop();
	const contentType = 'image/png';
	let fileSize: number;
	let newFileSize: number;

	before(async () => {
		pineServer = await testInit({
			configPath,
			hooksPath,
			deleteDb: true,
		});
		const fileInfo = await fs.stat(filePath);
		fileSize = fileInfo.size;
		const newFileInfo = await fs.stat(newFilePath);
		newFileSize = newFileInfo.size;
	});

	after(async () => {
		await clearBucket();
		testDeInit(pineServer);
	});

	const transalations = [
		{
			resourcePath: 'logo_image',
			resourceName: 'example',
			sbvrTranslatedResource: 'logo image',
		},
		{
			resourcePath: 'other_image',
			resourceName: 'v1',
			sbvrTranslatedResource: 'logo image',
		},
		{
			resourcePath: 'not_translated_webresource',
			resourceName: 'example',
			sbvrTranslatedResource: 'not translated webresource',
		},
		{
			resourcePath: 'not_translated_webresource',
			resourceName: 'v1',
			sbvrTranslatedResource: 'not translated webresource',
		},
	];

	transalations.forEach(
		({ resourcePath, resourceName, sbvrTranslatedResource }) => {
			describe(`webresource ${resourcePath} - ${resourceName}`, () => {
				beforeEach(async () => {
					await clearBucket();
				});
				it(`creates an organization with a ${resourcePath}`, async () => {
					const { body: organization, headers } = await supertest(
						testLocalServer,
					)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.attach(resourcePath, filePath, { filename, contentType })
						.expect(201);

					expect(organization[resourcePath].size).to.equals(fileSize);
					expect(organization[resourcePath].filename).to.equals(filename);
					expect(organization[resourcePath].content_type).to.equals(
						contentType,
					);

					const getRes = await supertest(testLocalServer)
						.get(headers.location)
						.expect(200);

					expect(getRes.body.d[0]).to.deep.equal(organization);

					await expectToExist(organization[resourcePath].href);
					await expectImageEquals(
						organization[resourcePath].href,
						filePath,
						fileSize,
					);
				});

				it(`does not store ${resourcePath} if is bigger than PINEJS_WEBRESOURCE_MAXFILESIZE`, async () => {
					const { largeStream } = await getLargeFileStream(
						intVar('PINEJS_WEBRESOURCE_MAXFILESIZE') + 10 * 1024 * 1024,
						filePath,
					);
					const res = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.attach(resourcePath, largeStream, { filename, contentType })
						.expect(400);

					expect(res.body).to.include('File size exceeded');
					expect(await isBucketEventuallyEmpty()).to.be.true;
				});

				it(`creates a organization with a large ${resourcePath}`, async () => {
					// Create a large file by using an image at the head ( so that filetype can identify it as an image ),
					// and then appending a large chunk
					const { largeStream, largeFileSize } = await getLargeFileStream(
						1024 * 1024 * 512 - fileSize,
						filePath,
					);

					const { body: organization } = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.attach(resourcePath, largeStream, { filename, contentType })
						.expect(201);

					await expectToExist(organization[resourcePath].href);
					expect(organization[resourcePath].size).to.equals(largeFileSize);
					expect(organization[resourcePath].filename).to.equals(filename);
					expect(organization[resourcePath].content_type).to.equals(
						contentType,
					);

					const getRes = await supertest(testLocalServer)
						.get(`/${resourceName}/organization(${organization.id})`)
						.expect(200);

					expect(getRes.body.d[0].id).to.deep.equal(organization.id);
					expect(getRes.body.d[0][resourcePath].size).to.deep.equal(
						organization[resourcePath].size,
					);
					expect(getRes.body.d[0][resourcePath].content_type).to.deep.equal(
						organization[resourcePath].content_type,
					);
					expect(getRes.body.d[0][resourcePath].filename).to.deep.equal(
						organization[resourcePath].filename,
					);

					expect(removesSigning(getRes.body.d[0][resourcePath].href)).to.equal(
						removesSigning(organization[resourcePath].href),
					);
				});

				it(`deletes a ${resourcePath} in storage engine after deleting in the DB`, async () => {
					const res = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.attach(resourcePath, filePath, { filename, contentType })
						.expect(201);

					await supertest(testLocalServer)
						.delete(`/${resourceName}/organization(${res.body.id})`)
						.expect(200);

					expect(await isEventuallyDeleted(res.body[resourcePath].href)).to.be
						.true;
				});

				it(`removes uploaded file if patch on ${resourcePath} fails`, async () => {
					const { body: org } = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.attach(resourcePath, filePath, {
							filename,
							contentType,
						})
						.expect(201);

					const { body: res } = await supertest(testLocalServer)
						.patch(`/${resourceName}/organization(${org.id})`)
						.field('name', 'too long name')
						.attach(resourcePath, newFilePath, { filename, contentType })
						.expect(400);

					expect(res).to.equal(
						'It is necessary that each organization that has a name, has a name that has a Length (Type) that is greater than 0 and is less than or equal to 5',
					);

					expect(await listAllFilesInBucket()).to.deep.equal([
						getKeyFromHref(org[resourcePath].href),
					]);
				});

				it(`removes uploaded file if patch on ${resourcePath} has no affected ids`, async () => {
					await supertest(testLocalServer)
						.patch(`/${resourceName}/organization(4242)`)
						.field('name', 'john')
						.attach(resourcePath, newFilePath, { filename, contentType })
						.expect(200);

					expect(await isBucketEventuallyEmpty()).to.be.true;
				});

				it(`does not fail if delete on ${resourcePath} has no affected ids`, async () => {
					await supertest(testLocalServer)
						.delete(`/${resourceName}/organization(4242)`)
						.expect(200);
				});

				it(`does not fail to patch on ${resourcePath} has no affected ids`, async () => {
					await supertest(testLocalServer)
						.patch(`/${resourceName}/organization(4242)`)
						.field('name', 'peter')
						.expect(200);
				});

				it(`fails to post on ${resourcePath} if invalid rule and no webresource with correct error`, async () => {
					const res = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'longname')
						.expect(400);
					expect(res.body).to.equal(
						`It is necessary that each organization that has a name, has a name that has a Length (Type) that is greater than 0 and is less than or equal to 5`,
					);
				});

				it(`it should be able to patch multiple keys on ${resourcePath} without any webresource`, async () => {
					const { body: org1 } = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'john')
						.attach(resourcePath, filePath, { filename, contentType })
						.expect(201);

					const { body: org2 } = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'peter')
						.attach(resourcePath, filePath, { filename, contentType })
						.expect(201);

					// Patching the name of all orgs
					await supertest(testLocalServer)
						.patch(`/${resourceName}/organization`)
						.field('name', 'test')
						.expect(200);

					const { body: patchedOrg1 } = await supertest(testLocalServer).get(
						`/${resourceName}/organization(${org1.id})`,
					);

					const { body: patchedOrg2 } = await supertest(testLocalServer).get(
						`/${resourceName}/organization(${org2.id})`,
					);

					expect(patchedOrg1.d[0].name).to.equals('test');
					await expectImageEquals(
						patchedOrg1.d[0][resourcePath].href,
						filePath,
						fileSize,
					);
					expect(patchedOrg2.d[0].name).to.equals('test');
					await expectImageEquals(
						patchedOrg2.d[0][resourcePath].href,
						filePath,
						fileSize,
					);

					expect(patchedOrg1.d[0][resourcePath].href).not.to.equal(
						patchedOrg2.d[0][resourcePath].href,
					);
				});

				it(`fails to update multiple entities with same ${resourcePath}`, async () => {
					const res = await supertest(testLocalServer)
						.patch(`/${resourceName}/organization`)
						.attach(resourcePath, newFilePath, { filename, contentType })
						.expect(400);

					expect(res.body)
						.to.be.a('string')
						.that.equals(
							'WebResources can only be updated when providing a resource key.',
						);

					expect(await isBucketEventuallyEmpty()).to.be.true;
				});

				it(`deletes multiple rows with a ${resourcePath}`, async () => {
					const { body: org1 } = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.attach(resourcePath, filePath, { filename, contentType })
						.expect(201);

					const { body: org2 } = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.attach(resourcePath, newFilePath, { filename, contentType })
						.expect(201);

					expect((await listAllFilesInBucket()).length).to.equal(2);

					await supertest(testLocalServer)
						.delete(`/${resourceName}/organization`)
						.expect(200);

					const { body: org1res } = await supertest(testLocalServer).get(
						`/${resourceName}/organization(${org1.id})`,
					);
					const { body: org2res } = await supertest(testLocalServer).get(
						`/${resourceName}/organization(${org2.id})`,
					);

					expect(org1res.d.length).to.equal(0);
					expect(org2res.d.length).to.equal(0);
					expect(await isBucketEventuallyEmpty()).to.be.true;
				});

				it(`deletes old resource in storage engine after updating ${resourcePath}`, async () => {
					const { body: organization } = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.attach(resourcePath, filePath, { filename, contentType })
						.expect(201);

					await supertest(testLocalServer)
						.patch(`/${resourceName}/organization(${organization.id})`)
						.attach(resourcePath, newFilePath, { filename, contentType });

					const { body } = await supertest(testLocalServer)
						.get(`/${resourceName}/organization(${organization.id})`)
						.expect(200);

					const href = body.d[0][resourcePath].href;
					await expectImageEquals(href, newFilePath, newFileSize);
					expect(await listAllFilesInBucket()).to.deep.equal([
						getKeyFromHref(href),
					]);
				});

				it(`should not create an ${resourcePath} when content type is not an image`, async () => {
					await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.attach(resourcePath, filePath, {
							filename,
							contentType: 'text/csv',
						})
						.expect(400);
					expect(await isBucketEventuallyEmpty()).to.be.true;
				});

				it(`does not change old ${resourcePath} in storage updating other field that is not webresource`, async () => {
					const { body: organization } = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.attach(resourcePath, filePath, { filename, contentType })
						.expect(201);

					await supertest(testLocalServer)
						.patch(`/${resourceName}/organization(${organization.id})`)
						.field('name', 'Peter')
						.expect(200);

					const getRes = await supertest(testLocalServer)
						.get(`/${resourceName}/organization(${organization.id})`)
						.expect(200);

					expect(getRes.body.d[0].name).to.equals('Peter');
					await expectImageEquals(
						getRes.body.d[0][resourcePath].href,
						filePath,
						fileSize,
					);
				});

				it(`deletes ${resourcePath} if transaction size rule is not respected on post`, async () => {
					const { largeStream } = await getLargeFileStream(
						1024 * 1024 * 600,
						filePath,
					);
					const res = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.attach(resourcePath, largeStream, { filename, contentType })
						.expect(400);

					expect(res.body).to.equal(
						`It is necessary that each organization that has a ${sbvrTranslatedResource}, has a ${sbvrTranslatedResource} that has a Content Type (Type) that is equal to "image/png" or "image/jpg" or "image/jpeg" and has a Size (Type) that is less than 540000000.`,
					);
					expect(await isBucketEventuallyEmpty()).to.be.true;
				});

				it(`deletes ${resourcePath} if transaction size rule is not respected on patch`, async () => {
					const { largeStream } = await getLargeFileStream(
						1024 * 1024 * 600,
						filePath,
					);

					const { body: org1 } = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.attach(resourcePath, filePath, { filename, contentType })
						.expect(201);

					const res = await supertest(testLocalServer)
						.patch(`/${resourceName}/organization(${org1.id})`)
						.attach(resourcePath, largeStream, { filename, contentType })
						.expect(400);

					expect(res.body).to.equal(
						`It is necessary that each organization that has a ${sbvrTranslatedResource}, has a ${sbvrTranslatedResource} that has a Content Type (Type) that is equal to "image/png" or "image/jpg" or "image/jpeg" and has a Size (Type) that is less than 540000000.`,
					);

					expect(await listAllFilesInBucket()).to.deep.equal([
						getKeyFromHref(org1[resourcePath].href),
					]);
				});

				it(`deletes ${resourcePath} if content type rule is not respected`, async () => {
					const res = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.attach(resourcePath, filePath, {
							filename,
							contentType: 'text/csv',
						})
						.expect(400);

					expect(res.body).to.equal(
						`It is necessary that each organization that has a ${sbvrTranslatedResource}, has a ${sbvrTranslatedResource} that has a Content Type (Type) that is equal to "image/png" or "image/jpg" or "image/jpeg" and has a Size (Type) that is less than 540000000.`,
					);
					expect(await isBucketEventuallyEmpty()).to.be.true;
				});

				it('ignores files if they are not in a valid resource field', async () => {
					await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.attach('another_logo_image', filePath, { filename, contentType });
					expect(await isBucketEventuallyEmpty()).to.be.true;
				});

				it('should not accept webresource payload that is not a blob', async () => {
					const res = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.field(resourcePath, 'not a blob')
						.expect(400);

					expect(res.body).to.equal('WebResource field must be a blob.');
				});

				it('should not accept webresource payload on application/json requests', async () => {
					const res = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.send({
							name: 'John',
							[resourcePath]: {
								filename,
								content_type: contentType,
								size: fileSize,
								href: 'http://dummy/bucket/other_href',
							},
						})
						.expect(400);

					expect(res.body).to.equal('Use multipart requests to upload a file.');
				});

				it('does not modify stored file if uploading with application/json requests', async () => {
					const { body: organization } = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'john')
						.attach(resourcePath, filePath, { filename, contentType })
						.expect(201);

					const href = organization[resourcePath].href;

					await supertest(testLocalServer)
						.patch(`/${resourceName}/organization(${organization.id})`)
						.send({ name: 'test' })
						.expect(200);

					const getRes = await supertest(testLocalServer)
						.get(`/${resourceName}/organization(${organization.id})`)
						.expect(200);

					expect(getRes.body.d[0].name).to.equal('test');
					expect(getRes.body.d[0][resourcePath].href).to.equal(href);

					expect(await listAllFilesInBucket()).to.deep.equal([
						getKeyFromHref(href),
					]);
				});

				it('should delete resource in S3 when passing null in application/json request', async () => {
					const { body: organization } = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'john')
						.attach(resourcePath, filePath, {
							filename,
							contentType,
						})
						.expect(201);

					await supertest(testLocalServer)
						.patch(`/${resourceName}/organization(${organization.id})`)
						.send({ [resourcePath]: null })
						.expect(200);

					const getRes = await supertest(testLocalServer)
						.get(`/${resourceName}/organization(${organization.id})`)
						.expect(200);

					expect(getRes.body.d[0][resourcePath]).to.be.null;
					expect(await isBucketEventuallyEmpty()).to.be.true;
				});

				it('does not fail to serve if S3 resource is deleted but entry exists', async () => {
					// This tests the current behavior, but we might want to change it in the future
					// because this assumes a dangling reference exists (which should not be possible)
					const { body: organization } = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.attach(resourcePath, filePath, { filename, contentType })
						.expect(201);

					const key = getKeyFromHref(organization[resourcePath].href);

					await deleteFileInS3(key);
					expect(await isEventuallyDeleted(key)).to.be.true;

					const getRes = await supertest(testLocalServer)
						.get(`/${resourceName}/organization(${organization.id})`)
						.expect(200);

					const responseKey = getKeyFromHref(
						getRes.body['d'][0][resourcePath].href,
					);
					expect(responseKey).to.equals(key);
				});
			});
		},
	);

	const multipleResourceTests = [
		{
			resourceName: 'example',
			firstResourcePath: 'logo_image',
			secondResourcePath: 'not_translated_webresource',
		},
		{
			resourceName: 'v1',
			firstResourcePath: 'other_image',
			secondResourcePath: 'not_translated_webresource',
		},
	];

	multipleResourceTests.forEach(
		({ resourceName, firstResourcePath, secondResourcePath }) => {
			describe(`operates multiple web resources at the same time on /${resourceName}`, () => {
				const otherFilePath = `${testResourcePath}/other-image.png`;
				let hrefFirstResourceKey: string;
				let hrefSecondResourceKey: string;
				let organization: { [key: string]: { filename: string } | number };

				before(async () => {
					await clearBucket();
				});

				it('creates an organization', async () => {
					const { body } = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.attach(firstResourcePath, filePath, { filename, contentType })
						.attach(secondResourcePath, otherFilePath, {
							filename,
							contentType,
						})
						.expect(201);

					organization = body;

					await expectToExist(body[firstResourcePath].href);
					await expectToExist(body[secondResourcePath].href);

					hrefFirstResourceKey = getKeyFromHref(body[firstResourcePath].href);
					hrefSecondResourceKey = getKeyFromHref(body[secondResourcePath].href);
				});

				it('can patch a single web resource on the same organization', async () => {
					await supertest(testLocalServer)
						.patch(`/${resourceName}/organization(${organization.id})`)
						.attach(secondResourcePath, otherFilePath, {
							filename,
							contentType,
						})
						.expect(200);

					const {
						body: {
							d: [org],
						},
					} = await supertest(testLocalServer)
						.get(`/${resourceName}/organization(${organization.id})`)
						.expect(200);

					const newSecondHrefKey = getKeyFromHref(org[secondResourcePath].href);
					expect(newSecondHrefKey).to.be.not.eq(hrefSecondResourceKey);

					const allFiles = await listAllFilesInBucket();
					expect(allFiles).to.contain(hrefFirstResourceKey);
					expect(allFiles).to.contain(newSecondHrefKey);
					expect(allFiles.length).to.equal(2);

					hrefSecondResourceKey = newSecondHrefKey;
				});

				it('can patch with application/json null on one without modifying the other', async () => {
					await supertest(testLocalServer)
						.patch(`/${resourceName}/organization(${organization.id})`)
						.send({ [firstResourcePath]: null })
						.expect(200);
					const {
						body: {
							d: [org],
						},
					} = await supertest(testLocalServer)
						.get(`/${resourceName}/organization(${organization.id})`)
						.expect(200);

					expect(org[firstResourcePath]).to.be.null;
					assertExists(org[secondResourcePath].href);
					expect(await listAllFilesInBucket()).to.deep.equal([
						getKeyFromHref(org[secondResourcePath].href),
					]);
				});

				it('can patch multiple web resources on the same organization', async () => {
					await supertest(testLocalServer)
						.patch(`/${resourceName}/organization(${organization.id})`)
						.attach(firstResourcePath, filePath, { filename, contentType })
						.attach(secondResourcePath, otherFilePath, {
							filename,
							contentType,
						})
						.expect(200);

					const {
						body: {
							d: [org],
						},
					} = await supertest(testLocalServer)
						.get(`/${resourceName}/organization(${organization.id})`)
						.expect(200);

					await expectToExist(org[firstResourcePath].href);
					await expectToExist(org[secondResourcePath].href);

					hrefFirstResourceKey = getKeyFromHref(org[firstResourcePath].href);
					hrefSecondResourceKey = getKeyFromHref(org[secondResourcePath].href);

					const allFiles = await listAllFilesInBucket();
					expect(allFiles).to.contain(hrefFirstResourceKey);
					expect(allFiles).to.contain(hrefSecondResourceKey);
					expect(allFiles.length).length.to.equal(2);
				});

				it('deletes both web resources when delete organization', async () => {
					await supertest(testLocalServer)
						.delete(`/${resourceName}/organization(${organization.id})`)
						.expect(200);

					expect(await isBucketEventuallyEmpty()).to.be.true;
				});

				it('deletes both web resources when deleting all organizations', async () => {
					const [{ body: org1 }, { body: org2 }] = await Promise.all([
						supertest(testLocalServer)
							.post(`/${resourceName}/organization`)
							.field('name', 'John')
							.attach(firstResourcePath, filePath, { filename, contentType })
							.attach(secondResourcePath, otherFilePath, {
								filename,
								contentType,
							})
							.expect(201),
						supertest(testLocalServer)
							.post(`/${resourceName}/organization`)
							.field('name', 'John')
							.attach(firstResourcePath, filePath, { filename, contentType })
							.attach(secondResourcePath, otherFilePath, {
								filename,
								contentType,
							})
							.expect(201),
					]);

					await Promise.all([
						expectToExist(org1[firstResourcePath].href),
						expectToExist(org1[secondResourcePath].href),
						expectToExist(org2[firstResourcePath].href),
						expectToExist(org2[secondResourcePath].href),
					]);

					await supertest(testLocalServer)
						.delete(`/${resourceName}/organization`)
						.expect(200);

					expect(await isBucketEventuallyEmpty()).to.be.true;
				});
			});
		},
	);

	const oneToManyRelashionships = [
		{
			resourceName: 'example',
			publicArtifacts: 'organization__releases__public_artifacts',
			privateArtifacts: 'organization_private_artifacts',
			publicField: 'releases__public_artifacts',
			privateField: 'private_artifacts',
		},
	];

	oneToManyRelashionships.forEach(
		({
			resourceName,
			publicArtifacts,
			privateArtifacts,
			publicField,
			privateField,
		}) => {
			describe(`operates multiple 1-N associations on /${resourceName}`, () => {
				before(async () => {
					await clearBucket();
				});

				const expectToInsertFile = async (
					organizationId: number,
					createPath: string,
					field: string,
				) => {
					const { body } = await supertest(testLocalServer)
						.post(createPath)
						.field('organization', `${organizationId}`)
						.attach(field, filePath, { filename, contentType })
						.expect(201);

					await Promise.all([
						expectToExist(body[field].href),
						expectImageEquals(body[field].href, filePath, fileSize),
					]);
				};

				it('creates an organization with several resources', async () => {
					const { body } = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.expect(201);

					await Promise.all([
						...Array.from({ length: 3 }).map(() =>
							expectToInsertFile(
								body.id,
								`/${resourceName}/${publicArtifacts}`,
								publicField,
							),
						),
						...Array.from({ length: 3 }).map(() =>
							expectToInsertFile(
								body.id,
								`/${resourceName}/${privateArtifacts}`,
								privateField,
							),
						),
					]);

					expect((await listAllFilesInBucket()).length).to.equal(6);
				});

				it('is able to get resources with expanded organization', async () => {
					const [{ body: artifactsPublic }, { body: artifactsPrivate }] =
						await Promise.all([
							supertest(testLocalServer)
								.get(`/${resourceName}/${publicArtifacts}?$expand=organization`)
								.expect(200),
							supertest(testLocalServer)
								.get(
									`/${resourceName}/${privateArtifacts}?$expand=organization`,
								)
								.expect(200),
						]);

					expect(artifactsPublic.d.length).to.equal(3);
					expect(artifactsPrivate.d.length).to.equal(3);

					// Also asserts that file is reachable with presigned url
					const promises: Array<Promise<void>> = [];
					for (const artifact of artifactsPublic.d) {
						promises.push(expectToExist(artifact[publicField].href));
						promises.push(
							expectImageEquals(artifact[publicField].href, filePath, fileSize),
						);
					}

					for (const artifact of artifactsPrivate.d) {
						promises.push(expectToExist(artifact[privateField].href));
						promises.push(
							expectImageEquals(
								artifact[privateField].href,
								filePath,
								fileSize,
							),
						);
					}

					await Promise.all(promises);
				});

				it('is able to expand an organization with its resources', async () => {
					const {
						body: {
							d: [org],
						},
					} = await supertest(testLocalServer)
						.get(
							`/${resourceName}/organization?$expand=${publicArtifacts},${privateArtifacts}`,
						)
						.expect(200);

					expect(org[publicArtifacts].length).to.equal(3);
					expect(org[privateArtifacts].length).to.equal(3);

					// Also asserts that file is reachable with presigned url
					const promises: Array<Promise<void>> = [];
					for (const artifact of org[publicArtifacts]) {
						promises.push(expectToExist(artifact[publicField].href));
						promises.push(
							expectImageEquals(artifact[publicField].href, filePath, fileSize),
						);
					}

					for (const artifact of org[privateArtifacts]) {
						promises.push(expectToExist(artifact[privateField].href));
						promises.push(
							expectImageEquals(
								artifact[privateField].href,
								filePath,
								fileSize,
							),
						);
					}

					await Promise.all(promises);
				});

				it('is able to patch associated resources', async () => {
					const [
						{
							body: {
								d: [oldPublicArtifact],
							},
						},
						{
							body: {
								d: [oldPrivateArtifact],
							},
						},
					] = await Promise.all([
						supertest(testLocalServer)
							.get(`/${resourceName}/${publicArtifacts}(2)`)
							.expect(200),
						supertest(testLocalServer)
							.get(`/${resourceName}/${privateArtifacts}(2)`)
							.expect(200),
					]);

					await Promise.all([
						supertest(testLocalServer)
							.patch(
								`/${resourceName}/${publicArtifacts}(${oldPublicArtifact.id})`,
							)
							.attach(publicField, newFilePath, { filename, contentType })
							.expect(200),

						supertest(testLocalServer)
							.patch(
								`/${resourceName}/${privateArtifacts}(${oldPrivateArtifact.id})`,
							)
							.attach(privateField, newFilePath, { filename, contentType })
							.expect(200),
					]);

					const [
						{
							body: {
								d: [newPublicArtifact],
							},
						},
						{
							body: {
								d: [newPrivateArtifact],
							},
						},
					] = await Promise.all([
						supertest(testLocalServer)
							.get(`/${resourceName}/${publicArtifacts}(2)`)
							.expect(200),
						supertest(testLocalServer)
							.get(`/${resourceName}/${privateArtifacts}(2)`)
							.expect(200),
					]);

					await Promise.all([
						expectToExist(newPublicArtifact[publicField].href),
						expectToExist(newPrivateArtifact[privateField].href),
						expectImageEquals(
							newPublicArtifact[publicField].href,
							newFilePath,
							newFileSize,
						),
						expectImageEquals(
							newPrivateArtifact[privateField].href,
							newFilePath,
							newFileSize,
						),
					]);

					expect((await listAllFilesInBucket()).length).to.equal(6);
				});

				it('deletes the file if resource is deleted', async () => {
					const [
						{
							body: {
								d: [oldPublicArtifact],
							},
						},
						{
							body: {
								d: [oldPrivateArtifact],
							},
						},
					] = await Promise.all([
						supertest(testLocalServer)
							.get(`/${resourceName}/${publicArtifacts}(2)`)
							.expect(200),
						supertest(testLocalServer)
							.get(`/${resourceName}/${privateArtifacts}(2)`)
							.expect(200),
					]);

					await Promise.all([
						supertest(testLocalServer)
							.delete(
								`/${resourceName}/${publicArtifacts}(${oldPublicArtifact.id})`,
							)
							.expect(200),

						supertest(testLocalServer)
							.delete(
								`/${resourceName}/${privateArtifacts}(${oldPrivateArtifact.id})`,
							)
							.expect(200),
					]);

					const [{ body: artifactsPublic }, { body: artifactsPrivate }] =
						await Promise.all([
							supertest(testLocalServer)
								.get(`/${resourceName}/${publicArtifacts}?$expand=organization`)
								.expect(200),
							supertest(testLocalServer)
								.get(
									`/${resourceName}/${privateArtifacts}?$expand=organization`,
								)
								.expect(200),
						]);

					expect(artifactsPublic.d.length).to.equal(2);
					expect(artifactsPrivate.d.length).to.equal(2);

					expect(await isEventuallyDeleted(oldPublicArtifact[publicField].href))
						.to.be.true;
					expect(
						await isEventuallyDeleted(oldPrivateArtifact[privateField].href),
					).to.be.true;

					expect((await listAllFilesInBucket()).length).to.equal(4);

					await Promise.all([
						expectToBeUnreachable(oldPublicArtifact[publicField].href),
						expectToBeUnreachable(oldPrivateArtifact[privateField].href),
					]);
				});
			});
		},
	);

	describe('multipart upload', () => {
		let testOrg: { id: number };
		before(async () => {
			const { body: org } = await supertest(testLocalServer)
				.post(`/example/organization`)
				.field('name', 'mtprt')
				.expect(201);

			const { body: orgWithoutFile } = await supertest(testLocalServer)
				.get(`/example/organization(${org.id})`)
				.expect(200);

			expect(orgWithoutFile.d[0].logo_image).to.be.null;
			testOrg = org;
		});

		it('fails to generate upload URLs for multiple fields at time', async () => {
			const { body: res } = await supertest(testLocalServer)
				.post(`/example/organization(${testOrg.id})/beginUpload`)
				.send({
					logo_image: {
						filename: 'test.png',
						content_type: 'image/png',
						size: 6291456,
						chunk_size: 6000000,
					},
					not_translated_webresource: {
						filename: 'test.png',
						content_type: 'image/png',
						size: 6291456,
						chunk_size: 6000000,
					},
				})
				.expect(400);
			expect(res).to.be.eq(
				'You can only get upload url for one field at a time',
			);
		});

		transalations.forEach(
			({
				resourcePath: resource,
				resourceName: model,
				sbvrTranslatedResource,
			}) => {
				it('fails to generate upload URLs for invalid field', async () => {
					const { body: res } = await supertest(testLocalServer)
						.post(`/${model}/organization(${testOrg.id})/beginUpload`)
						.send({
							idonotexist: {
								filename: 'test.png',
								content_type: 'image/png',
								size: 6291456,
								chunk_size: 6000000,
							},
						})
						.expect(400);
					expect(res).to.be.eq(
						`The provided field 'idonotexist' is not a valid webresource`,
					);
				});

				it('failed to generate upload URLs if invalid payload', async () => {
					const { body: res } = await supertest(testLocalServer)
						.post(`/${model}/organization(${testOrg.id})/beginUpload`)
						.send({ [resource]: null })
						.expect(400);
					expect(res).to.be.eq('Invalid file metadata');

					const { body: res2 } = await supertest(testLocalServer)
						.post(`/${model}/organization(${testOrg.id})/beginUpload`)
						.send({ [resource]: {} })
						.expect(400);
					expect(res2).to.be.eq('Invalid file metadata');
				});

				it('fails to generate upload URLs with chunk size too small', async () => {
					const { body: res } = await supertest(testLocalServer)
						.post(`/${model}/organization(${testOrg.id})/beginUpload`)
						.send({
							[resource]: {
								filename: 'test.png',
								content_type: 'image/png',
								size: 6291456,
								chunk_size: 10,
							},
						})
						.expect(400);
					expect(res).to.be.eq('Invalid file metadata');
				});

				it('fails to generate upload URLs if invalid DB constraint', async () => {
					const { body: res } = await supertest(testLocalServer)
						.post(`/${model}/organization(${testOrg.id})/beginUpload`)
						.send({
							[resource]: {
								filename: 'test.png',
								content_type: 'text/csv',
								size: 6291456,
								chunk_size: 6000000,
							},
						})
						.expect(400);
					expect(res).to.be.eq(
						`It is necessary that each organization that has a ${sbvrTranslatedResource}, has a ${sbvrTranslatedResource} that has a Content Type (Type) that is equal to "image/png" or "image/jpg" or "image/jpeg" and has a Size (Type) that is less than 540000000.`,
					);
				});

				it('fails to generate upload URLs if cannot access resource', async () => {
					await supertest(testLocalServer)
						.post(`/${model}/organization(4242)/beginUpload`)
						.send({
							[resource]: {
								filename: 'test.png',
								content_type: 'text/csv',
								size: 6291456,
								chunk_size: 6000000,
							},
						})
						.expect(401);
				});

				it('uploads a file via S3 presigned URL', async () => {
					const { body: org } = await supertest(testLocalServer)
						.post(`/${model}/organization`)
						.field('name', 'John')
						.expect(201);

					const { body: orgWithoutFile } = await supertest(testLocalServer)
						.get(`/${model}/organization(${org.id})`)
						.expect(200);

					expect(orgWithoutFile.d[0][resource]).to.be.null;

					const uploadResponse = await beginBlobUpload(org.id, model, resource);

					const uuid = uploadResponse.uuid;
					const chunks = [
						new Blob([Buffer.alloc(6000000)]),
						new Blob([Buffer.alloc(291456)]),
					];

					const res = await Promise.all([
						fetch(uploadResponse.uploadParts[0].url, {
							method: 'PUT',
							body: chunks[0],
						}),
						fetch(uploadResponse.uploadParts[1].url, {
							method: 'PUT',
							body: chunks[1],
						}),
					]);

					expect(res[0].status).to.be.eq(200);
					expect(res[0].headers.get('Etag')).to.be.a('string');

					expect(res[1].status).to.be.eq(200);
					expect(res[1].headers.get('Etag')).to.be.a('string');

					const { body: commitResponse } = await supertest(testLocalServer)
						.post(`/${model}/organization(${org.id})/commitUpload`)
						.send({
							uuid,
							providerCommitData: {
								Parts: [
									{
										PartNumber: 1,
										ETag: res[0].headers.get('Etag'),
									},
									{
										PartNumber: 2,
										ETag: res[1].headers.get('Etag'),
									},
								],
							},
						})
						.expect(200);

					await expectToExist(commitResponse.filename);
					const { body: orgWithFile } = await supertest(testLocalServer)
						.get(`/${model}/organization(${org.id})`)
						.expect(200);

					expect(orgWithFile.d[0][resource].href).to.be.a('string');
					expect(orgWithFile.d[0][resource].size).to.be.eq(6291456);
				});

				it('failed to do a begin upload in one resource and then commit on another', async () => {
					const { body: org1 } = await supertest(testLocalServer)
						.post(`/${model}/organization`)
						.field('name', 'John')
						.expect(201);

					const { body: org2 } = await supertest(testLocalServer)
						.post(`/${model}/organization`)
						.field('name', 'John')
						.expect(201);

					const uploadResponse = await beginBlobUpload(
						org1.id,
						model,
						resource,
					);

					const uuid = uploadResponse.uuid;
					const chunks = [
						new Blob([Buffer.alloc(6000000)]),
						new Blob([Buffer.alloc(291456)]),
					];

					const res = await Promise.all([
						fetch(uploadResponse.uploadParts[0].url, {
							method: 'PUT',
							body: chunks[0],
						}),
						fetch(uploadResponse.uploadParts[1].url, {
							method: 'PUT',
							body: chunks[1],
						}),
					]);

					expect(res[0].status).to.be.eq(200);
					expect(res[0].headers.get('Etag')).to.be.a('string');

					expect(res[1].status).to.be.eq(200);
					expect(res[1].headers.get('Etag')).to.be.a('string');

					await supertest(testLocalServer)
						.post(`/${model}/organization(${org2.id})/commitUpload`)
						.send({
							uuid,
							providerCommitData: {
								Parts: [
									{
										PartNumber: 1,
										ETag: res[0].headers.get('Etag'),
									},
									{
										PartNumber: 2,
										ETag: res[1].headers.get('Etag'),
									},
								],
							},
						})
						.expect(401);
				});

				it('cannot upload part after canceling upload', async () => {
					const { body: org } = await supertest(testLocalServer)
						.post(`/${model}/organization`)
						.field('name', 'John')
						.expect(201);

					const { body: orgWithoutFile } = await supertest(testLocalServer)
						.get(`/${model}/organization(${org.id})`)
						.expect(200);

					expect(orgWithoutFile.d[0][resource]).to.be.null;

					const uploadResponse = await beginBlobUpload(org.id, model, resource);

					const chunks = [
						new Blob([Buffer.alloc(6000000)]),
						new Blob([Buffer.alloc(291456)]),
					];

					const res0 = await fetch(uploadResponse.uploadParts[0].url, {
						method: 'PUT',
						body: chunks[0],
					});

					expect(res0.status).to.be.eq(200);
					expect(res0.headers.get('Etag')).to.be.a('string');

					// Cancel upload
					await supertest(testLocalServer)
						.post(`/${model}/organization(${org.id})/cancelUpload`)
						.send({
							uuid: uploadResponse.uuid,
						})
						.expect(204);

					const res1 = await fetch(uploadResponse.uploadParts[1].url, {
						method: 'PUT',
						body: chunks[1],
					});

					expect(res1.status).to.be.eq(404);
				});

				it('cannot commit after canceling upload', async () => {
					const { body: org } = await supertest(testLocalServer)
						.post(`/${model}/organization`)
						.field('name', 'John')
						.expect(201);

					const { body: orgWithoutFile } = await supertest(testLocalServer)
						.get(`/${model}/organization(${org.id})`)
						.expect(200);

					expect(orgWithoutFile.d[0][resource]).to.be.null;

					const uploadResponse = await beginBlobUpload(org.id, model, resource);

					const chunks = [
						new Blob([Buffer.alloc(6000000)]),
						new Blob([Buffer.alloc(291456)]),
					];

					const res = await Promise.all([
						fetch(uploadResponse.uploadParts[0].url, {
							method: 'PUT',
							body: chunks[0],
						}),
						fetch(uploadResponse.uploadParts[1].url, {
							method: 'PUT',
							body: chunks[1],
						}),
					]);

					expect(res[0].status).to.be.eq(200);
					expect(res[0].headers.get('Etag')).to.be.a('string');

					expect(res[1].status).to.be.eq(200);
					expect(res[1].headers.get('Etag')).to.be.a('string');

					await supertest(testLocalServer)
						.post(`/${model}/organization(${org.id})/cancelUpload`)
						.send({
							uuid: uploadResponse.uuid,
						})
						.expect(204);

					const { body: commitResponse } = await supertest(testLocalServer)
						.post(`/${model}/organization(${org.id})/commitUpload`)
						.send({
							uuid: uploadResponse.uuid,
							providerCommitData: {
								Parts: [
									{
										PartNumber: 1,
										ETag: res[0].headers.get('Etag'),
									},
									{
										PartNumber: 2,
										ETag: res[1].headers.get('Etag'),
									},
								],
							},
						})
						.expect(400);

					expect(commitResponse).to.be.eq(
						`Invalid upload for uuid ${uploadResponse.uuid}`,
					);
				});
			},
		);
	});
});

const removesSigning = (href: string): string => {
	return href.split('?', 1)[0];
};

const getKeyFromHref = (href: string): string => {
	const splittedHref = removesSigning(href).split('/');
	return splittedHref[splittedHref.length - 1];
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isBucketEventuallyEmpty = async (attempts = 5, retryDelay = 1000) => {
	for (let attempt = 0; attempt < attempts; attempt++) {
		if ((await listAllFilesInBucket()).length === 0) {
			return true;
		}
		await delay(retryDelay);
	}

	return false;
};

const isEventuallyDeleted = async (
	href: string,
	attempts = 5,
	retryDelay = 1000,
): Promise<boolean> => {
	// File deletion happens in background so it might need
	// a few attempts until the file is actually deleted
	for (let attempt = 0; attempt < attempts; attempt++) {
		const fileExists = await bucketContainsFile(getKeyFromHref(href));
		if (!fileExists) {
			return true;
		}
		await delay(retryDelay);
	}

	return false;
};

const bucketContainsFile = async (key: string): Promise<boolean> => {
	const keys = await listAllFilesInBucket(
		requiredVar('S3_STORAGE_ADAPTER_BUCKET'),
	);

	return keys.includes(key);
};

const expectToExist = async (href: string) => {
	expect(await bucketContainsFile(getKeyFromHref(href))).to.be.true;
};

const expectImageEquals = async (
	href: string,
	filePath: string,
	fileSize: number,
) => {
	const { body: photoRes } = await supertest(href)
		.get('')
		.responseType('arraybuffer')
		.set('Accept', '*/*')
		.expect(200);

	const receivedSize = photoRes.length;
	expect(receivedSize).to.equals(fileSize);
	const realImage = await fs.readFile(filePath);
	const diff = realImage.compare(photoRes);
	expect(diff).to.equal(0);
};

const expectToBeUnreachable = async (href: string) => {
	await supertest(href)
		.get('')
		.responseType('arraybuffer')
		.set('Accept', '*/*')
		.expect(404);
};

const deleteFileInS3 = async (
	key: string,
	bucket = 'balena-pine-web-resources',
) => {
	const s3client = getS3Client(bucket);
	const deleteCommand = new DeleteObjectCommand({
		Bucket: bucket,
		Key: key,
	});
	await s3client.send(deleteCommand);
};

const getLargeFileStream = async (size: number, filePathToRepeat: string) => {
	// File is too large will make DB transaction fail
	const fillerSize = Math.round(size);
	const chunkSize = 10 * 1024 * 1024;
	const chunks = Math.floor(fillerSize / chunkSize);
	const filler = Buffer.alloc(chunkSize);

	async function* generate() {
		yield await fs.readFile(filePathToRepeat);
		for (let i = 0; i < chunks; i++) {
			yield filler;
		}
	}

	const tmpFileName = path.join(tmpdir(), randomUUID());
	await pipeline(Readable.from(generate()), createWriteStream(tmpFileName));

	const fileInfo = await fs.stat(tmpFileName);
	const largeFileSize = fileInfo.size;

	return {
		largeStream: createReadStream(tmpFileName),
		largeFileSize,
	};
};

const listAllFilesInBucket = async (
	bucket = 'balena-pine-web-resources',
): Promise<string[]> => {
	const s3client = getS3Client(bucket);
	const command = new ListObjectsV2Command({ Bucket: bucket });
	let isTruncated = true;

	const s3ObjectKeys: string[] = [];
	while (isTruncated) {
		const { Contents, IsTruncated, NextContinuationToken } =
			await s3client.send(command);
		if (Contents) {
			Contents.forEach((c) => c.Key && s3ObjectKeys.push(c.Key));
		}
		isTruncated = !!IsTruncated;
		command.input.ContinuationToken = NextContinuationToken;
	}
	return s3ObjectKeys;
};

const clearBucket = async (bucket = 'balena-pine-web-resources') => {
	const files = await listAllFilesInBucket(bucket);
	await Promise.all(files.map((key) => deleteFileInS3(key, bucket)));
};

const getS3Client = (bucket: string) => {
	const endpoint = `${requiredVar('S3_ENDPOINT')}/${bucket}`;
	return new S3Client({
		region: 'dummy-region',
		credentials: {
			accessKeyId: requiredVar('S3_ACCESS_KEY'),
			secretAccessKey: requiredVar('S3_SECRET_KEY'),
		},
		endpoint,
	});
};

const beginBlobUpload = async (
	orgId: number,
	modelVersion: string,
	resourceName: string,
) => {
	const uniqueFilename = `${randomUUID()}_test.png`;
	const { body } = await supertest(testLocalServer)
		.post(`/${modelVersion}/organization(${orgId})/beginUpload`)
		.send({
			[resourceName]: {
				filename: uniqueFilename,
				content_type: 'image/png',
				size: 6291456,
				chunk_size: 6000000,
			},
		})
		.expect(200);

	// There is one current known issue for the beginUpload endpoint
	// which is the response payload key is the final translated field name
	// Considering V1 only allows one field to be uploaded at a time
	// we can safely assume the first key is the one we are looking for
	const uploadResponse = Object.values(body)[0] as BeginUploadResponse[string];
	assertExists(uploadResponse);

	const { body: after } = await supertest(testLocalServer)
		.get(`/${modelVersion}/organization(${orgId})`)
		.expect(200);

	expect(after.d[0][resourceName]).to.be.null;
	expect(uploadResponse.uuid).to.be.a('string');
	expect(uploadResponse.uploadParts).to.be.an('array').that.has.length(2);
	expect(uploadResponse.uploadParts[0].chunkSize).to.be.eq(6000000);
	expect(uploadResponse.uploadParts[0].partNumber).to.be.eq(1);
	expect(uploadResponse.uploadParts[1].chunkSize).to.be.eq(291456);
	expect(uploadResponse.uploadParts[1].partNumber).to.be.eq(2);

	return uploadResponse;
};
