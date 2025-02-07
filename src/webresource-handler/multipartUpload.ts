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
import { api, getAffectedIds, getIdField } from '../sbvr-api/sbvr-utils.js';
import { type ODataRequest } from '../sbvr-api/uri-parser.js';
import { errors, sbvrUtils } from '../server-glue/module.js';
import { webResource as webResourceEnv } from '../config-loader/env.js';
import * as permissions from '../sbvr-api/permissions.js';
import { TransactionClosedError, type Tx } from '../database-layer/db.js';
import { UnauthorizedError } from '../sbvr-api/errors.js';

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
		POSTPARSE: async ({ request, tx, api: applicationApi }) => {
			if (request.odataQuery.property?.resource === 'beginUpload') {
				const uploadParams = await validateBeginUpload(
					request,
					applicationApi,
					webResourceHandler,
				);

				request.method = 'GET';
				request.odataQuery.resource = request.resourceName;
				delete request.odataQuery.property;
				request.custom.isAction = 'beginUpload';
				request.custom.uploadProbeParams = uploadParams;
			} else if (request.odataQuery.property?.resource === 'commitUpload') {
				const commitPayload = await validateCommitUpload(
					request,
					applicationApi,
				);

				request.method = 'PATCH';
				request.values = {
					// Set so that bindings are there but only actually set the correct value in prerun
					[commitPayload.metadata.fieldName]: undefined,
				};
				request.odataQuery.resource = request.resourceName;

				delete request.odataQuery.property;
				request.custom.isAction = 'commitUpload';
				request.custom.commitPayload = commitPayload;
				request.custom.fieldName = commitPayload.metadata.fieldName;
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
			const { api: applicationApi, request, tx } = args;

			if (request.custom.isAction === 'beginUpload') {
				try {
					await sbvrUtils.db.transaction(async (probeTx) => {
						const newUrl = request.url
							.slice(1)
							.replace(/(\/beginUpload|\/commitUpload|\/cancelUpload)$/, '');
						await applicationApi.request({
							method: 'PATCH',
							url: newUrl,
							body: request.custom.uploadProbeParams,
							passthrough: { tx: probeTx, req: permissions.root },
						});
						await probeTx.rollback();
					});
				} catch (e) {
					if (
						!(
							e instanceof TransactionClosedError &&
							e.message === 'Transaction has been rolled back.'
						)
					) {
						throw e;
					}
				}
			} else if (request.custom.isAction === 'commitUpload') {
				args.request.url = args.request.url.replace(
					/(\/beginUpload|\/commitUpload|\/cancelUpload)$/,
					'',
				);
				const ids = await getAffectedIds(args);
				if (ids.length !== 1) {
					throw new UnauthorizedError();
				}

				if (ids[0] !== request.custom.commitPayload.metadata.resourceId) {
					throw new UnauthorizedError();
				}

				const webresource = await webResourceHandler.multipartUpload.commit({
					fileKey: request.custom.commitPayload.metadata.fileKey,
					uploadId: request.custom.commitPayload.metadata.uploadId,
					filename: request.custom.commitPayload.metadata.filename,
					providerCommitData: request.custom.commitPayload.providerCommitData,
				});

				request.values[request.custom.fieldName] = webresource;

				await api.webresource.patch({
					resource: 'multipart_upload',
					body: {
						status: 'completed',
					},
					options: {
						$filter: {
							uuid: request.custom.commitPayload.uuid,
						},
					},
					passthrough: {
						tx: tx,
						req: permissions.root,
					},
				});
				request.custom.commitUploadPayload = webresource;
			}
		},
		PRERESPOND: async ({ request, response, req, tx }) => {
			if (request.custom.isAction === 'beginUpload') {
				if (!response.body || typeof response.body === 'string') {
					throw new UnauthorizedError();
				}
				const idField = getIdField(request);
				const resourceId = response.body?.d?.[0]?.[idField];
				if (!resourceId) {
					throw new UnauthorizedError();
				}

				response.statusCode = 200;
				response.body = await beginUpload(
					{
						webResourceHandler,
						odataRequest: request,
						actorId: req.user?.actor,
						resourceId,
					},
					tx,
				);
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

const beginUpload = async (
	{
		webResourceHandler,
		odataRequest,
		actorId,
		resourceId,
	}: {
		webResourceHandler: MultipartUploadHandler;
		odataRequest: ODataRequest;
		actorId?: number;
		resourceId: number;
	},
	tx: Tx,
): Promise<BeginUploadResponse> => {
	const payload = odataRequest.values as {
		[x: string]: BeginMultipartUploadPayload;
	};
	const fieldName = Object.keys(payload)[0];
	const metadata = payload[fieldName];
	const { fileKey, uploadId, uploadParts } =
		await webResourceHandler.multipartUpload.begin(fieldName, metadata);
	const uuid = randomUUID();

	await api.webresource.post({
		resource: 'multipart_upload',
		body: {
			uuid,
			resource_name: odataRequest.resourceName,
			field_name: fieldName,
			resource_id: resourceId,
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
			tx,
		},
	});
	return { [fieldName]: { uuid, uploadParts } };
};

const validateBeginUpload = async (
	request: ODataRequest,
	applicationApi: PinejsClient,
	webResourceHandler: MultipartUploadHandler,
) => {
	await canAccess(request, applicationApi);

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
			$select: [
				'id',
				'file_key',
				'upload_id',
				'field_name',
				'filename',
				'resource_id',
				'resource_name',
			],
			$filter: {
				uuid,
				status: 'pending',
				expiry_date: { $gt: { $now: {} } },
				resource_name: request.resourceName,
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
		resourceName: multipartUpload.resource_name,
		resourceId: multipartUpload.resource_id,
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
