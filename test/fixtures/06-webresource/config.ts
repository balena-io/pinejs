import type { ConfigLoader } from '../../../src/server-glue/module';
import { WebResourceHandler } from '../../../src/webresource-handler';
import { S3Handler } from '../../../src/webresource-handler/handlers/S3Handler';
import { v1AbstractSqlModel, v1Translations } from './translations/v1';
import { requiredVar, intVar } from '@balena/env-parsing';

const apiRoot = 'example';
const modelName = 'example';
const modelFile = __dirname + '/example.sbvr';

const s3Handler: WebResourceHandler = new S3Handler({
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
