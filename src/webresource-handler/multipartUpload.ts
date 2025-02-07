import type { WebResourceType as WebResource } from '@balena/sbvr-types';
import { randomUUID } from 'node:crypto';
import type { AnyObject } from 'pinejs-client-core';
import type {
	BeginMultipartUploadPayload,
	UploadPart,
	WebResourceHandler,
} from './index.js';
import { getWebResourceFields } from './index.js';
import type { PinejsClient } from '../sbvr-api/sbvr-utils.js';
import { api } from '../sbvr-api/sbvr-utils.js';
import { type ODataRequest } from '../sbvr-api/uri-parser.js';
import { errors, sbvrUtils } from '../server-glue/module.js';
import { webResource as webResourceEnv } from '../config-loader/env.js';
import * as permissions from '../sbvr-api/permissions.js';
import { TransactionClosedError } from '../database-layer/db.js';

type BeginUploadDbCheck = BeginMultipartUploadPayload & WebResource;

export interface BeginUploadResponse {
	[fieldName: string]: {
		uuid: string;
		uploadParts: UploadPart[];
	};
}

// Is WebResourceHandler but with beginMultipartUpload and commitMultipartUpload as not optional
type MultipartUploadHandler = WebResourceHandler &
	Required<Pick<WebResourceHandler, 'multipartUpload'>>;

export const isMultipartUploadAvailable = (
	webResourceHandler: WebResourceHandler,
): webResourceHandler is MultipartUploadHandler => {
	return (
		webResourceEnv.multipartUploadEnabled &&
		webResourceHandler.multipartUpload != null
	);
};

export const multipartUploadHooks = (
	webResourceHandler: MultipartUploadHandler,
): sbvrUtils.Hooks => {
	return {
		POSTPARSE: async ({ request, tx, api: applicationApi, req }) => {
			if (request.odataQuery.property?.resource === 'beginUpload') {
				await validateBeginUpload(
					request,
					webResourceHandler,
				);

				const fieldName = Object.keys(request.values)[0];

				permissions.convertToCanAccess(request);
				// @ts-expect-error add
				request.permissionType = 'update';
				request.values[fieldName].href = 'probe';
				request.custom.isAction = 'canAccess';
				request.custom.multiPartUploadAction = 'beginUpload';
				await permissions.addPermissions(req, request);


			} else if (request.odataQuery.property?.resource === 'commitUpload') {
				const commitPayload = await validateCommitUpload(
					request,
					applicationApi,
				);

				const webresource = await webResourceHandler.multipartUpload.commit({
					fileKey: commitPayload.metadata.fileKey,
					uploadId: commitPayload.metadata.uploadId,
					filename: commitPayload.metadata.filename,
					providerCommitData: commitPayload.providerCommitData,
				});

				await api.webresource.patch({
					resource: 'multipart_upload',
					body: {
						status: 'completed',
					},
					options: {
						$filter: {
							uuid: commitPayload.uuid,
						},
					},
					passthrough: {
						tx: tx,
						req: permissions.root,
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
			} else if (request.odataQuery.property?.resource === 'cancelUpload') {
				const { uuid, fileKey, uploadId } = await validateCancelPayload(
					request,
					applicationApi,
				);

				await webResourceHandler.multipartUpload.cancel({ fileKey, uploadId });

				await api.webresource.patch({
					resource: 'multipart_upload',
					body: {
						status: 'cancelled',
					},
					options: {
						$filter: { uuid },
					},
					passthrough: {
						tx: tx,
						req: permissions.root,
					},
				});

				request.method = 'GET';
				request.odataQuery.resource = request.resourceName;
				delete request.odataQuery.property;
				request.custom.isAction = 'cancelUpload';
			}
		},
		PRERUN: async (args) => {
			if (args.request.custom.multiPartUploadAction === 'beginUpload') {
				const { api: applicationApi, request, req, tx } = args;
				const payload = request.values as {
					[x: string]: BeginMultipartUploadPayload;
				};
				const fieldName = Object.keys(payload)[0];

				try {
					await sbvrUtils.db.transaction(async (probeTx) => {
						const newUrl = request.url
							.slice(1)
							.replace(/(\/beginUpload|\/commitUpload|\/cancelUpload)$/, '');
						await applicationApi.request({
							method: 'PATCH',
							url: newUrl,
							body: { [fieldName]: { ...payload[fieldName], href: 'db_probe' } },
							passthrough: { tx: probeTx, permissions: permissions.root }

						});
						await probeTx.rollback();
					});
				} catch (e) {
					if (!(e instanceof TransactionClosedError && e.message === 'Transaction has been rolled back.')) {
						throw e;
					}
				}

				const metadata = payload[fieldName];
				const { fileKey, uploadId, uploadParts } = await webResourceHandler.multipartUpload.begin(fieldName, metadata);

				const uuid = randomUUID();
				await api.webresource.post({
					resource: 'multipart_upload',
					body: {
						uuid,
						resource_name: request.resourceName,
						field_name: fieldName,
						// TODO wrong
						resource_id: request.affectedIds?.[0] ?? 0,
						upload_id: uploadId,
						file_key: fileKey,
						status: 'pending',
						filename: payload[fieldName].filename,
						content_type: payload[fieldName].content_type,
						size: payload[fieldName].size,
						chunk_size: payload[fieldName].chunk_size,
						expiry_date: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days in ms
						is_created_by__actor: req.user?.actor,
					},
					passthrough: {
						req: permissions.root,
						tx,
					},
				});

				request.custom.beginUploadResponse = { [fieldName]: { uuid, uploadParts } };
			}
		},
		PRERESPOND: async ({ request, response }) => {
			if (request.custom.multiPartUploadAction === 'beginUpload') {
				response.statusCode = 200;
				response.body = request.custom.beginUploadResponse;

			} else if (request.custom.isAction === 'commitUpload') {
				response.body = await webResourceHandler.onPreRespond(
					request.custom.commitUploadPayload,
				);
			} else if (request.custom.isAction === 'cancelUpload') {
				response.statusCode = 204;
				delete response.body;
			}
		},
	};
};

const validateBeginUpload = async (
	request: ODataRequest,
	webResourceHandler: MultipartUploadHandler,
) => {
	const fieldNames = Object.keys(request.values);
	if (fieldNames.length !== 1) {
		throw new errors.BadRequestError(
			'You can only get upload url for one field at a time',
		);
	}

	const [fieldName] = fieldNames;
	const webResourceFields = getWebResourceFields(request);
	if (!webResourceFields.includes(fieldName)) {
		throw new errors.BadRequestError(
			`The provided field '${fieldName}' is not a valid webresource`,
		);
	}

	const beginUploadPayload = parseBeginUploadPayload(
		request.values[fieldName],
		webResourceHandler,
	);
	if (beginUploadPayload == null) {
		throw new errors.BadRequestError('Invalid file metadata');
	}

	const uploadMetadataCheck: BeginUploadDbCheck = {
		...beginUploadPayload,
		// This is "probe" request. We don't actually store anything on the application table yet
		// We just avoid creating the application record if it would fail anyway for some other db constraint
		href: 'metadata_check_probe',
	};

	return { [fieldName]: uploadMetadataCheck };
};

const parseBeginUploadPayload = (
	payload: AnyObject,
	webResourceHandler: MultipartUploadHandler,
): BeginMultipartUploadPayload | null => {
	if (payload == null || typeof payload !== 'object') {
		return null;
	}

	let { filename, content_type, size, chunk_size } = payload;
	if (
		typeof filename !== 'string' ||
		typeof content_type !== 'string' ||
		typeof size !== 'number' ||
		(chunk_size != null && typeof chunk_size !== 'number') ||
		(chunk_size != null &&
			chunk_size < webResourceHandler.multipartUpload.getMinimumPartSize())
	) {
		return null;
	}

	chunk_size ??= webResourceHandler.multipartUpload.getDefaultPartSize();

	return { filename, content_type, size, chunk_size };
};

const validateCommitUpload = async (
	request: ODataRequest,
	applicationApi: PinejsClient,
) => {
	await canAccess(request, applicationApi);

	const { uuid, providerCommitData } = request.values;
	if (typeof uuid !== 'string') {
		throw new errors.BadRequestError('Invalid uuid type');
	}

	const [multipartUpload] = await api.webresource.get({
		resource: 'multipart_upload',
		options: {
			$select: ['id', 'file_key', 'upload_id', 'field_name', 'filename'],
			$filter: {
				uuid,
				status: 'pending',
				expiry_date: { $gt: { $now: {} } },
			},
		},
		passthrough: {
			tx: request.tx,
			req: permissions.rootRead,
		},
	});

	if (multipartUpload == null) {
		throw new errors.BadRequestError(`Invalid upload for uuid ${uuid}`);
	}

	const metadata = {
		fileKey: multipartUpload.file_key,
		uploadId: multipartUpload.upload_id,
		filename: multipartUpload.filename,
		fieldName: multipartUpload.field_name,
	};

	return { uuid, providerCommitData, metadata };
};

const validateCancelPayload = async (
	request: ODataRequest,
	applicationApi: PinejsClient,
) => {
	await canAccess(request, applicationApi);

	const { uuid } = request.values;
	if (typeof uuid !== 'string') {
		throw new errors.BadRequestError('Invalid uuid type');
	}

	const [multipartUpload] = await api.webresource.get({
		resource: 'multipart_upload',
		options: {
			$select: ['id', 'file_key', 'upload_id'],
			$filter: {
				uuid,
				status: 'pending',
				expiry_date: { $gt: { $now: {} } },
			},
		},
		passthrough: {
			tx: request.tx,
			req: permissions.rootRead,
		},
	});

	if (multipartUpload == null) {
		throw new errors.BadRequestError(`Invalid upload for uuid ${uuid}`);
	}

	return {
		uuid,
		fileKey: multipartUpload.file_key,
		uploadId: multipartUpload.upload_id,
	};
};

const canAccess = async (
	request: ODataRequest,
	applicationApi: PinejsClient,
) => {
	if (request.odataQuery.key == null) {
		throw new errors.BadRequestError();
	}

	const canAccessUrl = request.url
		.slice(1)
		.replace(/(beginUpload|commitUpload|cancelUpload)$/, 'canAccess');

	await applicationApi.request({
		method: 'POST',
		url: canAccessUrl,
		body: { method: 'PATCH' },
	});
};
