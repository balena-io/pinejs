import type { ConfigLoader } from '@balena/pinejs';
import { S3Handler } from '@balena/pinejs-webresource-s3';
import { v1AbstractSqlModel, v1Translations } from './translations/v1/index.js';
import { requiredVar, intVar } from '@balena/env-parsing';
import { fileURLToPath } from 'node:url';

const apiRoot = 'example';
const modelName = 'example';
const modelFile = import.meta.dirname + '/example.sbvr';

const s3Handler = new S3Handler({
	bucket: requiredVar('S3_STORAGE_ADAPTER_BUCKET'),
	region: requiredVar('S3_REGION'),
	accessKey: requiredVar('S3_ACCESS_KEY'),
	secretKey: requiredVar('S3_SECRET_KEY'),
	endpoint: requiredVar('S3_ENDPOINT'),
	maxSize: intVar('PINEJS_WEBRESOURCE_MAXFILESIZE'),
});

export default {
	models: [
		{
			modelName: 'webresource',
			modelFile: fileURLToPath(
				import.meta.resolve(
					'@balena/pinejs/out/webresource-handler/webresource.sbvr',
				),
			),
			apiRoot: 'webresource',
		},
		{
			modelName,
			modelFile,
			apiRoot,
		},
		{
			apiRoot: 'v1',
			modelName: 'v1',
			abstractSql: v1AbstractSqlModel,
			translateTo: 'example',
			translations: v1Translations,
		},
	],
	users: [
		{
			username: 'guest',
			password: ' ',
			permissions: ['resource.all'],
		},
	],
	webResourceHandler: s3Handler,
} as ConfigLoader.Config;
