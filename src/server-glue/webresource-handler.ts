import type * as Express from 'express';
import * as multer from 'multer';
import { intVar, optionalVar } from '@balena/env-parsing';
import * as multerS3 from '@balena/open-multer-s3';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';

// initialization of multerPinejs, a multer instance used on pine models.
const S3_STORAGE_ADAPTER_DEFAULT_BUCKET = 'balena-pine-web-resources';

const bucket = optionalVar(
	'S3_STORAGE_ADAPTER_BUCKET',
	S3_STORAGE_ADAPTER_DEFAULT_BUCKET,
);

const s3ClientConfig = getS3ClientConfig();
const s3Client = new S3Client(s3ClientConfig);

// Stream input directly to S3 by using multerS3
const storage = multerS3({
	s3: s3Client,
	bucket,
	key(_req, file, cb) {
		const key = `${file.fieldname}_${uuidv4()}_${file.originalname}`;
		cb(null, key);
	},
	metadata(_req, file, cb) {
		cb(null, { fieldName: file.fieldname });
	},
	acl: 'public-read',
	contentType: multerS3.AUTO_CONTENT_TYPE,
});

export const maxFileSize = intVar('PINEJS_MAX_FILE_SIZE', 1024 * 1024 * 512);

export const multerPinejs = multer({
	limits: {
		fileSize: maxFileSize,
	},
	storage,
})
	// Accepts all files that comes over the wire. An array of files will be stored in req.files.
	.any();

/**
 * Express Handler that converts files created by multer to properties on the body
 *
 * @param app Express app
 */
export const handleMultipartRequest: Express.RequestHandler = async (
	// err,
	req,
	_res,
	next,
) => {
	if (req.files && Array.isArray(req.files)) {
		for (const file of req.files) {
			// Workaround for https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/61014
			const multerS3File: MulterS3File = file as unknown as MulterS3File;
			const s3ObjectUrl: string = s3ClientConfig.endpoint
				? `${s3ClientConfig.endpoint}/${multerS3File.bucket}/${multerS3File.key}`
				: `https://${multerS3File.bucket}.s3.${s3ClientConfig.region}.amazonaws.com/${multerS3File.key}`;

			req.body[file.fieldname] = {
				filename: file.originalname,
				contentType: multerS3File.contentType,
				contentDisposition: multerS3File.contentDisposition,
				size: file.size,
				href: s3ObjectUrl,
			};
		}
	}
	next();
};

type MulterS3File = {
	bucket: string;
	key: string;
	acl: string;
	contentType: string;
	contentDisposition: null;
	storageClass: string;
	serverSideEncryption: null;
	metadata: any;
	location: string;
	etag: string;
};

function getS3ClientConfig(): S3ClientConfig {
	const S3_STORAGE_ADAPTER_DEFAULT_REGION = 'us-east-1';

	const config: S3ClientConfig = {
		region: optionalVar(
			'S3_STORAGE_ADAPTER_REGION',
			S3_STORAGE_ADAPTER_DEFAULT_REGION,
		),
	};

	if (process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY) {
		config.credentials = {
			accessKeyId: process.env.S3_ACCESS_KEY,
			secretAccessKey: process.env.S3_SECRET_KEY,
		};
	}
	if (process.env.S3_ENDPOINT) {
		config.endpoint = process.env.S3_ENDPOINT;
		config.forcePathStyle = true;
	}
	return config;
}
