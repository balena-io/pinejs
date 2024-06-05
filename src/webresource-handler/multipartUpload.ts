import type { WebResourceType as WebResource } from '@balena/sbvr-types';
import { randomUUID } from 'node:crypto';
import type { AnyObject } from 'pinejs-client-core';
import type { WebResourceHandler } from '.';
import { getWebResourceFields } from '.';
import { api } from '../sbvr-api/sbvr-utils';
import type { ODataRequest } from '../sbvr-api/uri-parser';
import { errors, permissions, sbvrUtils } from '../server-glue/module';

export interface BeginUploadPayload {
	filename: string;
	content_type: string;
	size: number;
	chunk_size: number;
}

type BeginUploadDbCheck = BeginUploadPayload & WebResource;

export interface UploadUrl {
	url: string;
	chunkSize: number;
	partNumber: number;
}

export interface BeginUploadHandlerResponse {
	uploadUrls: UploadUrl[];
	fileKey: string;
	uploadId: string;
}

export interface PendingUpload extends BeginUploadPayload {
	fieldName: string;
	fileKey: string;
	uploadId: string;
}

export interface BeginUploadResponse {
	[fieldName: string]: {
		key: string;
		uploadUrls: UploadUrl[];
	};
}
export interface CommitUploadHandlerPayload {
	fileKey: string;
	uploadId: string;
	filename: string;
	multipartUploadChecksums?: AnyObject;
}

const MB = 1024 * 1024;

export const multipartUploadHooks = (
	webResourceHandler: WebResourceHandler,
): sbvrUtils.Hooks => {
	return {
		POSTPARSE: async ({ req, request, tx, api: vocabularyApi }) => {
			if (request.odataQuery.property?.resource === 'beginUpload') {
				const uploadParams = parseBeginUpload(request);

				await vocabularyApi.post({
					url: request.url.substring(1).replace('beginUpload', 'canAccess'),
					body: { method: 'PATCH' },
				});

				// This transaction is necessary because beginUpload requests
				// will rollback the transaction (in order to first validate)
				// The metadata requested. If we don't pass any transaction
				// It will use the default transaction handler which will error out
				// on any rollback.
				tx = await sbvrUtils.db.transaction();
				req.tx = tx;
				request.tx = tx;

				request.method = 'PATCH';
				request.values = uploadParams;
				request.odataQuery.resource = request.resourceName;
				delete request.odataQuery.property;
				request.custom.isAction = 'beginUpload';
			} else if (request.odataQuery.property?.resource === 'commitUpload') {
				const commitPayload = await parseCommitUpload(request);

				await vocabularyApi.post({
					url: request.url.substring(1).replace('commitUpload', 'canAccess'),
					body: { method: 'PATCH' },
				});

				const webresource = await webResourceHandler.commitUpload({
					fileKey: commitPayload.metadata.fileKey,
					uploadId: commitPayload.metadata.uploadId,
					filename: commitPayload.metadata.filename,
					multipartUploadChecksums: commitPayload.additionalCommitInfo,
				});

				await api.webresource.patch({
					resource: 'multipart_upload',
					body: {
						status: 'completed',
					},
					options: {
						$filter: {
							uuid: commitPayload.key,
						},
					},
					passthrough: {
						req: permissions.root,
						tx: tx,
					},
				});

				request.method = 'PATCH';
				request.values = {
					[commitPayload.metadata.fieldName]: webresource,
				};
				request.odataQuery.resource = request.resourceName;
				delete request.odataQuery.property;
				request.custom.isAction = 'commitUpload';
				request.custom.commitUploadPayload = webresource;
			}
		},
		PRERESPOND: async ({ req, request, response, tx }) => {
			if (request.custom.isAction === 'beginUpload') {
				await tx.rollback();

				response.statusCode = 200;
				response.body = await beginUpload(
					webResourceHandler,
					request,
					req.user?.actor,
				);
			} else if (request.custom.isAction === 'commitUpload') {
				response.body = await webResourceHandler.onPreRespond(
					request.custom.commitUploadPayload,
				);
			}
		},
	};
};

export const beginUpload = async (
	webResourceHandler: WebResourceHandler,
	odataRequest: ODataRequest,
	actorId?: number,
): Promise<BeginUploadResponse> => {
	const payload = odataRequest.values as { [x: string]: BeginUploadPayload };
	const fieldName = Object.keys(payload)[0];
	const metadata = payload[fieldName];

	const { fileKey, uploadId, uploadUrls } =
		await webResourceHandler.beginUpload(fieldName, metadata);
	const uuid = randomUUID();

	try {
		await api.webresource.post({
			resource: 'multipart_upload',
			body: {
				uuid,
				resource_name: odataRequest.resourceName,
				field_name: fieldName,
				resource_id: odataRequest.affectedIds?.[0],
				upload_id: uploadId,
				file_key: fileKey,
				status: 'pending',
				filename: metadata.filename,
				content_type: metadata.content_type,
				size: metadata.size,
				chunk_size: metadata.chunk_size,
				expiry_date: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days in ms
				is_created_by__actor: actorId,
			},
			passthrough: {
				req: permissions.root,
			},
		});
	} catch (err) {
		console.error('failed to start multipart upload', err);
		throw new errors.BadRequestError('Failed to start multipart upload');
	}

	return { [fieldName]: { key: uuid, uploadUrls } };
};

const parseBeginUpload = (request: ODataRequest) => {
	if (request.odataQuery.key == null) {
		throw new errors.BadRequestError();
	}

	const fieldNames = Object.keys(request.values);
	if (fieldNames.length !== 1) {
		throw new errors.BadRequestError(
			'You can only get upload url for one field at a time',
		);
	}

	const [fieldName] = fieldNames;
	const webResourceFields = getWebResourceFields(request, false);
	if (!webResourceFields.includes(fieldName)) {
		throw new errors.BadRequestError(
			`You must provide a valid webresource field from: ${JSON.stringify(webResourceFields)}`,
		);
	}

	const beginUploadPayload = parseBeginUploadPayload(request.values[fieldName]);
	if (beginUploadPayload == null) {
		throw new errors.BadRequestError('Invalid file metadata');
	}

	const uploadMetadataCheck: BeginUploadDbCheck = {
		...beginUploadPayload,
		href: 'metadata_check',
	};

	return { [fieldName]: uploadMetadataCheck };
};

const parseBeginUploadPayload = (
	payload: AnyObject,
): BeginUploadPayload | null => {
	if (typeof payload !== 'object') {
		return null;
	}

	let { filename, content_type, size, chunk_size } = payload;
	if (
		typeof filename !== 'string' ||
		typeof content_type !== 'string' ||
		typeof size !== 'number' ||
		(chunk_size != null && typeof chunk_size !== 'number') ||
		(chunk_size != null && chunk_size < 5 * MB)
	) {
		return null;
	}

	if (chunk_size == null) {
		chunk_size = 5 * MB;
	}
	return { filename, content_type, size, chunk_size };
};

const parseCommitUpload = async (request: ODataRequest) => {
	if (request.odataQuery.key == null) {
		throw new errors.BadRequestError();
	}

	const { key, additionalCommitInfo } = request.values;
	if (typeof key !== 'string') {
		throw new errors.BadRequestError('Invalid key type');
	}

	// TODO: actor permissions
	const [multipartUpload] = (await api.webresource.get({
		resource: 'multipart_upload',
		options: {
			$select: ['id', 'file_key', 'upload_id', 'field_name', 'filename'],
			$filter: {
				uuid: key,
				status: 'pending',
				expiry_date: { $gt: { $now: {} } },
			},
		},
		passthrough: {
			req: permissions.root,
			tx: request.tx,
		},
	})) as [
		{
			id: number;
			file_key: string;
			upload_id: string;
			field_name: string;
			filename: string;
		}?,
	];

	if (multipartUpload == null) {
		throw new errors.BadRequestError(`Invalid upload for key ${key}`);
	}

	const metadata = {
		fileKey: multipartUpload.file_key,
		uploadId: multipartUpload.upload_id,
		filename: multipartUpload.filename,
		fieldName: multipartUpload.field_name,
	};

	return { key, additionalCommitInfo, metadata };
};
