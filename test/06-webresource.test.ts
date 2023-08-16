import * as supertest from 'supertest';
import { expect } from 'chai';
const configPath = __dirname + '/fixtures/06-webresource/config';
const hooksPath = __dirname + '/fixtures/06-webresource/translations/hooks';
const testResourcePath = __dirname + '/fixtures/06-webresource/resources/';

import * as fsBase from 'fs';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline as pipelineRaw, Readable } from 'stream';
import * as util from 'util';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import * as path from 'path';
import { testInit, testDeInit, testLocalServer } from './lib/test-init';
import {
	ListObjectsV2Command,
	S3Client,
	DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { intVar, requiredVar } from '@balena/env-parsing';

const pipeline = util.promisify(pipelineRaw);
const fs = fsBase.promises;

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

					await expectToExist(organization[resourcePath].filename);
					await expectImageEquals(
						organization[resourcePath].href,
						filePath,
						fileSize,
					);
				});

				it(`does not store ${resourcePath} if is bigger than PINEJS_WEBRESOURCE_MAXFILESIZE`, async () => {
					const uniqueFilename = `${randomUUID()}_${filename}`;
					const { largeStream } = await getLargeFileStream(
						intVar('PINEJS_WEBRESOURCE_MAXFILESIZE') + 10 * 1024 * 1024,
						filePath,
					);
					const res = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.attach(resourcePath, largeStream, {
							filename: uniqueFilename,
							contentType,
						})
						.expect(400);

					expect(res.body).to.include('File size exceeded');
					expect(await isEventuallyDeleted(uniqueFilename)).to.be.true;
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

					await expectToExist(organization[resourcePath].filename);
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

					const fileKey = getStoredFileNameFromHref(
						res.body[resourcePath].href,
					);

					await supertest(testLocalServer)
						.delete(`/${resourceName}/organization(${res.body.id})`)
						.expect(200);

					expect(await isEventuallyDeleted(fileKey)).to.be.true;
				});

				it(`removes uploaded file if patch on ${resourcePath} fails`, async () => {
					const uniqueFilename = `${randomUUID()}_${filename}`;
					const otherUniqueFilename = `${randomUUID()}_other-image.png`;

					const { body: org } = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.attach(resourcePath, filePath, {
							filename: uniqueFilename,
							contentType,
						})
						.expect(201);

					const { body: res } = await supertest(testLocalServer)
						.patch(`/${resourceName}/organization(${org.id})`)
						.field('name', 'too long name')
						.attach(resourcePath, newFilePath, {
							filename: otherUniqueFilename,
							contentType,
						})
						.expect(400);

					expect(res).to.be.eq(
						'It is necessary that each organization that has a name, has a name that has a Length (Type) that is greater than 0 and is less than or equal to 5',
					);

					await expectToExist(uniqueFilename);
					expect(await isEventuallyDeleted(otherUniqueFilename)).to.be.true;
				});

				it(`fails to update multiple entities with same ${resourcePath}`, async () => {
					const uniqueFilename = `${randomUUID()}_other-image.png`;

					const res = await supertest(testLocalServer)
						.patch(`/${resourceName}/organization`)
						.attach(resourcePath, newFilePath, {
							filename: uniqueFilename,
							contentType,
						})
						.expect(400);

					expect(res.body)
						.to.be.a('string')
						.that.equals(
							'WebResources can only be updated when providing a resource key.',
						);

					expect(await isEventuallyDeleted(uniqueFilename)).to.be.true;
				});

				it(`deletes multiple rows with a ${resourcePath}`, async () => {
					const uniqueFilename = `${randomUUID()}_${filename}`;
					const otherUniqueFilename = `${randomUUID()}_other-image.png`;

					const { body: org1 } = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.attach(resourcePath, filePath, {
							filename: uniqueFilename,
							contentType,
						})
						.expect(201);

					const { body: org2 } = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.attach(resourcePath, newFilePath, {
							filename: otherUniqueFilename,
							contentType,
						})
						.expect(201);

					await supertest(testLocalServer)
						.delete(`/${resourceName}/organization`)
						.expect(200);

					const { body: org1res } = await supertest(testLocalServer).get(
						`/${resourceName}/organization(${org1.id})`,
					);
					const { body: org2res } = await supertest(testLocalServer).get(
						`/${resourceName}/organization(${org2.id})`,
					);

					expect(org1res.d.length).to.be.eq(0);
					expect(org2res.d.length).to.be.eq(0);

					expect(await isEventuallyDeleted(uniqueFilename)).to.be.true;
					expect(await isEventuallyDeleted(otherUniqueFilename)).to.be.true;
				});

				it(`deletes old resource in storage engine after updating ${resourcePath}`, async () => {
					const { body: organization } = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.attach(resourcePath, filePath, { filename, contentType })
						.expect(201);

					const fileKey = organization[resourcePath].href
						.split('/')
						.slice(-1)[0];
					const newFileName = 'other-image.png';

					await supertest(testLocalServer)
						.patch(`/${resourceName}/organization(${organization.id})`)
						.attach(resourcePath, newFilePath, {
							filename: newFileName,
							contentType,
						});

					const getRes = await supertest(testLocalServer)
						.get(`/${resourceName}/organization(${organization.id})`)
						.expect(200);

					await expectImageEquals(
						getRes.body.d[0][resourcePath].href,
						newFilePath,
						newFileSize,
					);

					await expectToExist(newFileName);
					expect(await isEventuallyDeleted(fileKey)).to.be.true;
				});

				it(`should not create an ${resourcePath} when content type is not an image`, async () => {
					const uniqueFilename = `${randomUUID()}_${filename}`;

					await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.attach(resourcePath, filePath, {
							filename: uniqueFilename,
							contentType: 'text/csv',
						})
						.expect(400);

					expect(await isEventuallyDeleted(uniqueFilename)).to.be.true;
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

				it(`deletes ${resourcePath} if transaction size rule is not respected`, async () => {
					const uniqueFilename = `${randomUUID()}_${filename}`;
					const { largeStream } = await getLargeFileStream(
						1024 * 1024 * 600,
						filePath,
					);
					const res = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.attach(resourcePath, largeStream, {
							filename: uniqueFilename,
							contentType,
						})
						.expect(400);

					expect(res.body).to.equal(
						`It is necessary that each organization that has a ${sbvrTranslatedResource}, has a ${sbvrTranslatedResource} that has a Content Type (Type) that is equal to "image/png" or "image/jpg" or "image/jpeg" and has a Size (Type) that is less than 540000000.`,
					);
					expect(await isEventuallyDeleted(uniqueFilename)).to.be.true;
				});

				it(`deletes ${resourcePath} if content type rule is not respected`, async () => {
					const uniqueFilename = `${randomUUID()}_${filename}`;

					const res = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.attach(resourcePath, filePath, {
							filename: uniqueFilename,
							contentType: 'text/csv',
						})
						.expect(400);

					expect(res.body).to.equal(
						`It is necessary that each organization that has a ${sbvrTranslatedResource}, has a ${sbvrTranslatedResource} that has a Content Type (Type) that is equal to "image/png" or "image/jpg" or "image/jpeg" and has a Size (Type) that is less than 540000000.`,
					);
					expect(await isEventuallyDeleted(uniqueFilename)).to.be.true;
				});

				it('ignores files if they are not in a valid resource field', async () => {
					const uniqueFilename = `${randomUUID()}_${filename}`;
					await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.attach('another_logo_image', filePath, {
							filename: uniqueFilename,
							contentType,
						});
					expect(await isEventuallyDeleted(uniqueFilename)).to.be.true;
				});

				it('does not fail to serve if S3 resource is deleted but entry exists', async () => {
					// This tests the current behavior, but we might want to change it in the future
					// because the current behavior allows for a dangling reference to exist
					const { body: organization } = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.attach(resourcePath, filePath, { filename, contentType })
						.expect(201);

					const createdFilename = removesSigning(
						getStoredFileNameFromHref(organization[resourcePath].href),
					);

					await deleteFileInS3(createdFilename);
					expect(await isEventuallyDeleted(createdFilename)).to.be.true;

					const getRes = await supertest(testLocalServer)
						.get(`/${resourceName}/organization(${organization.id})`)
						.expect(200);

					const responseFilename = removesSigning(
						getStoredFileNameFromHref(getRes.body['d'][0][resourcePath].href),
					);
					expect(responseFilename).to.equals(createdFilename);
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
				let uniqueFilename = `${randomUUID()}_${filename}`;
				let otherUniqueFilename = `${randomUUID()}_other-image.png`;
				let organization: { [key: string]: { filename: string } | number };

				it('creates an organization', async () => {
					const { body } = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.attach(firstResourcePath, filePath, {
							filename: uniqueFilename,
							contentType,
						})
						.attach(secondResourcePath, otherFilePath, {
							filename: otherUniqueFilename,
							contentType,
						})
						.expect(201);

					organization = body;

					await expectToExist(
						(organization[firstResourcePath] as { filename: string }).filename,
					);
					await expectToExist(
						(organization[firstResourcePath] as { filename: string }).filename,
					);
				});

				it('can patch a single web resource on the same organization', async () => {
					const newOtherUniqueFilename = `${randomUUID()}_other-image.png`;
					await supertest(testLocalServer)
						.patch(`/${resourceName}/organization(${organization.id})`)
						.attach(secondResourcePath, otherFilePath, {
							filename: newOtherUniqueFilename,
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

					expect(org[secondResourcePath].filename).to.be.eq(
						newOtherUniqueFilename,
					);
					await expectToExist(newOtherUniqueFilename);
					expect(await isEventuallyDeleted(otherUniqueFilename)).to.be.true;
					otherUniqueFilename = newOtherUniqueFilename;
				});

				it('can patch multiple web resources on the same organization', async () => {
					const newUniqueFilename = `${randomUUID()}_${filename}`;
					const newOtherUniqueFilename = `${randomUUID()}_other-image.png`;
					await supertest(testLocalServer)
						.patch(`/${resourceName}/organization(${organization.id})`)
						.attach(firstResourcePath, filePath, {
							filename: newUniqueFilename,
							contentType,
						})
						.attach(secondResourcePath, otherFilePath, {
							filename: newOtherUniqueFilename,
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

					expect(org[firstResourcePath].filename).to.be.eq(newUniqueFilename);
					expect(org[secondResourcePath].filename).to.be.eq(
						newOtherUniqueFilename,
					);

					await expectToExist(newUniqueFilename);
					await expectToExist(newOtherUniqueFilename);

					expect(await isEventuallyDeleted(uniqueFilename)).to.be.true;
					expect(await isEventuallyDeleted(otherUniqueFilename)).to.be.true;

					uniqueFilename = newUniqueFilename;
					otherUniqueFilename = newOtherUniqueFilename;
				});

				it('deletes both web resources when delete organization', async () => {
					await expectToExist(uniqueFilename);
					await expectToExist(otherUniqueFilename);

					await supertest(testLocalServer)
						.delete(`/${resourceName}/organization(${organization.id})`)
						.expect(200);

					expect(await isEventuallyDeleted(uniqueFilename)).to.be.true;
					expect(await isEventuallyDeleted(otherUniqueFilename)).to.be.true;
				});

				it('deletes both web resources when deleting all organizations', async () => {
					uniqueFilename = `${randomUUID()}_${filename}`;
					otherUniqueFilename = `${randomUUID()}_other-image.png`;

					const otherOrgUniqueFilename = `${randomUUID()}_${filename}`;
					const otherOrgOtherUniqueFilename = `${randomUUID()}_other-image.png`;

					const [{ body: org1 }, { body: org2 }] = await Promise.all([
						supertest(testLocalServer)
							.post(`/${resourceName}/organization`)
							.field('name', 'John')
							.attach(firstResourcePath, filePath, {
								filename: uniqueFilename,
								contentType,
							})
							.attach(secondResourcePath, otherFilePath, {
								filename: otherUniqueFilename,
								contentType,
							})
							.expect(201),
						supertest(testLocalServer)
							.post(`/${resourceName}/organization`)
							.field('name', 'John')
							.attach(firstResourcePath, filePath, {
								filename: otherOrgUniqueFilename,
								contentType,
							})
							.attach(secondResourcePath, otherFilePath, {
								filename: otherOrgOtherUniqueFilename,
								contentType,
							})
							.expect(201),
					]);

					await expectToExist(org1[firstResourcePath].filename);
					await expectToExist(org1[secondResourcePath].filename);
					await expectToExist(org2[firstResourcePath].filename);
					await expectToExist(org2[secondResourcePath].filename);

					await supertest(testLocalServer)
						.delete(`/${resourceName}/organization`)
						.expect(200);

					expect(await isEventuallyDeleted(org1[firstResourcePath].filename)).to
						.be.true;
					expect(await isEventuallyDeleted(org1[secondResourcePath].filename))
						.to.be.true;
					expect(await isEventuallyDeleted(org2[firstResourcePath].filename)).to
						.be.true;
					expect(await isEventuallyDeleted(org2[secondResourcePath].filename))
						.to.be.true;
				});
			});
		},
	);

	const oneToManyRelashionships = [
		{
			resourceName: 'example',
			publicArtifacts: 'organization__releases__public_artifacts',
			privateArtifacts: 'organization__has__private_artifacts',
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
				let organization: { [key: string]: { filename: string } | number };
				let publicArtifactsFilenames: string[];
				let privateArtifactsFilenames: string[];

				const expectToInsertFile = async (
					createFilename: string,
					createPath: string,
					field: string,
				) => {
					const { body } = await supertest(testLocalServer)
						.post(createPath)
						.field('organization', `${organization.id}`)
						.attach(field, filePath, {
							filename: createFilename,
							contentType,
						})
						.expect(201);

					await Promise.all([
						expectToExist(body[field].filename),
						expectImageEquals(body[field].href, filePath, fileSize),
					]);
				};

				it('creates an organization with several resources', async () => {
					const { body } = await supertest(testLocalServer)
						.post(`/${resourceName}/organization`)
						.field('name', 'John')
						.expect(201);

					organization = body;

					publicArtifactsFilenames = generateFilenames(3);
					privateArtifactsFilenames = generateFilenames(3);

					await Promise.all([
						...publicArtifactsFilenames.map((file) =>
							expectToInsertFile(
								file,
								`/${resourceName}/${publicArtifacts}`,
								publicField,
							),
						),
						...privateArtifactsFilenames.map((file) =>
							expectToInsertFile(
								file,
								`/${resourceName}/${privateArtifacts}`,
								privateField,
							),
						),
					]);
				});

				it('is able to get an organization with all its resources', async () => {
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

					expect(artifactsPublic.d.length).to.be.eq(3);
					expect(artifactsPrivate.d.length).to.be.eq(3);

					// Also asserts that file is reachable with presigned url
					const promises: Array<Promise<void>> = [];
					for (const artifact of artifactsPublic.d) {
						promises.push(expectToExist(artifact[publicField].filename));
						promises.push(
							expectImageEquals(artifact[publicField].href, filePath, fileSize),
						);
					}

					for (const artifact of artifactsPrivate.d) {
						promises.push(expectToExist(artifact[privateField].filename));
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

					const [newPublicArtifactName, newPrivateArtifactName] =
						generateFilenames(2);

					await Promise.all([
						supertest(testLocalServer)
							.patch(
								`/${resourceName}/${publicArtifacts}(${oldPublicArtifact.id})`,
							)
							.attach(publicField, newFilePath, {
								filename: newPublicArtifactName,
								contentType,
							})
							.expect(200),

						supertest(testLocalServer)
							.patch(
								`/${resourceName}/${privateArtifacts}(${oldPrivateArtifact.id})`,
							)
							.attach(privateField, newFilePath, {
								filename: newPrivateArtifactName,
								contentType,
							})
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
						expectToExist(newPublicArtifactName),
						expectToExist(newPrivateArtifactName),
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

					expect(
						await isEventuallyDeleted(oldPublicArtifact[publicField].filename),
					).to.be.true;
					expect(
						await isEventuallyDeleted(
							oldPrivateArtifact[privateField].filename,
						),
					).to.be.true;
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

					expect(artifactsPublic.d.length).to.be.eq(2);
					expect(artifactsPrivate.d.length).to.be.eq(2);

					expect(
						await isEventuallyDeleted(oldPublicArtifact[publicField].filename),
					).to.be.true;
					expect(
						await isEventuallyDeleted(
							oldPrivateArtifact[privateField].filename,
						),
					).to.be.true;

					await Promise.all([
						expectToBeUnreachable(oldPublicArtifact[publicField].href),
						expectToBeUnreachable(oldPrivateArtifact[privateField].href),
					]);
				});
			});
		},
	);
});

const removesSigning = (href: string): string => {
	return href.split('?')[0];
};

const getStoredFileNameFromHref = (href: string): string => {
	const splittedHref = href.split('/');
	return splittedHref[splittedHref.length - 1];
};

const generateFilenames = (count: number): string[] => {
	return Array.from({ length: count }, () => `${randomUUID()}_filename`);
};

const isEventuallyDeleted = async (
	filename: string,
	attempts = 3,
	retryDelay = 1000,
): Promise<boolean> => {
	// File deletion happens in background so it might need
	// a few attempts until the file is actually deleted
	const sleep = (ms: number) =>
		new Promise((resolve) => setTimeout(resolve, ms));

	for (let attempt = 0; attempt < attempts; attempt++) {
		const fileExists = await bucketContainsFile(filename);
		if (!fileExists) {
			return true;
		}
		await sleep(retryDelay);
	}

	return false; // File was not deleted after all attempts
};

const bucketContainsFile = async (filename: string): Promise<boolean> => {
	// Inspects minio bucket to ensure file with this uuid_filename exists

	const files = await listAllFilesInBucket(
		requiredVar('S3_STORAGE_ADAPTER_BUCKET'),
	);

	for (const file of files) {
		if (file.includes(filename)) {
			return true;
		}
	}

	return false;
};

const expectToExist = async (filename: string) => {
	expect(await bucketContainsFile(filename)).to.be.true;
};

const expectImageEquals = async (
	href: string,
	filePath: string,
	fileSize: number,
) => {
	const { body: photoRes } = await supertest(href)
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
	const diff = realImage.compare(photoRes);
	expect(diff).to.be.eq(0);
};

const expectToBeUnreachable = async (href: string) => {
	await supertest(href)
		.get('')
		.set({
			responseType: 'arraybuffer',
			headers: {
				Accept: '*/*',
			},
		})
		.expect(404);
};

const deleteFileInS3 = async (
	filename: string,
	bucket: string = 'balena-pine-web-resources',
) => {
	const s3client = getS3Client(bucket);
	const deleteCommand = new DeleteObjectCommand({
		Bucket: bucket,
		Key: filename,
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
	bucket: string = 'balena-pine-web-resources',
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
