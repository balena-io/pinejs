import type { Tx } from '../../database-layer/db.js';
import type {
	ODataActionArgs,
	ODataActionRequest,
} from '../../sbvr-api/actions.js';
import {
	BadRequestError,
	NotImplementedError,
	UnauthorizedError,
} from '../../sbvr-api/errors.js';
import type { Response } from '../../sbvr-api/sbvr-utils.js';
import { api } from '../../sbvr-api/sbvr-utils.js';
import { permissions } from '../../server-glue/module.js';
import { getMultipartUploadHandler } from '../multipartUpload.js';
import z from 'zod';

const commitUploadPayloadSchema = z.compile(
	z.strictObject({
		uuid: z.uuid(),
		// The contents are provider specific, so the provider validates them
		providerCommitData: z.record(z.string(), z.unknown()).optional(),
	}),
);

const commitUploadAction = async ({
	request,
	tx,
	id,
	api: applicationApi,
}: ODataActionArgs): Promise<Response> => {
	if (typeof id !== 'number') {
		throw new NotImplementedError(
			'multipart upload do not yet support non-numeric ids',
		);
	}

	const multipartUpload = await getOngoingUpload(request, id, tx);
	const handler = getMultipartUploadHandler();

	const webresource = await handler.multipartUpload.commit({
		fileKey: multipartUpload.fileKey,
		uploadId: multipartUpload.uploadId,
		filename: multipartUpload.filename,
		providerCommitData: multipartUpload.providerCommitData,
	});

	await Promise.all([
		api.webresource.patch({
			resource: 'multipart_upload',
			body: {
				status: 'completed',
			},
			id: {
				uuid: multipartUpload.uuid,
			},
			passthrough: {
				tx: tx,
				req: permissions.root,
			},
		}),
		applicationApi.patch({
			resource: request.resourceName,
			id,
			body: {
				[multipartUpload.fieldName]: webresource,
			},
			passthrough: {
				tx: tx,
				// Root is needed as, if you are not root, you are not allowed to directly modify the actual metadata
				req: permissions.root,
			},
		}),
	]);

	const body = await handler.onPreRespond(webresource);

	return {
		body,
		statusCode: 200,
	};
};

const getOngoingUpload = async (
	request: ODataActionRequest,
	affectedId: number,
	tx: Tx,
) => {
	const result = commitUploadPayloadSchema.safeParse(request.values);
	if (!result.success) {
		throw new BadRequestError('Invalid commit upload payload');
	}
	const { uuid, providerCommitData } = result.data;

	const multipartUpload = await api.webresource.get({
		resource: 'multipart_upload',
		id: {
			uuid,
		},
		options: {
			$select: ['id', 'file_key', 'upload_id', 'field_name', 'filename'],
			$filter: {
				status: 'pending',
				expiry_date: { $gt: { $now: {} } },
				resource_name: request.resourceName,
				resource_id: affectedId,
			},
		},
		passthrough: {
			tx,
			req: permissions.rootRead,
		},
	});

	if (multipartUpload == null) {
		throw new UnauthorizedError();
	}

	return {
		uuid,
		providerCommitData,
		fileKey: multipartUpload.file_key,
		uploadId: multipartUpload.upload_id,
		filename: multipartUpload.filename,
		fieldName: multipartUpload.field_name,
	};
};

export default commitUploadAction;
