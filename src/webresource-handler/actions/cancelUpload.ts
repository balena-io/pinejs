import type {
	ODataActionArgs,
	ODataActionRequest,
} from '../../sbvr-api/actions.js';
import type { Tx } from '../../database-layer/db.js';
import {
	BadRequestError,
	NotImplementedError,
	UnauthorizedError,
} from '../../sbvr-api/errors.js';
import { api, type Response } from '../../sbvr-api/sbvr-utils.js';
import { permissions } from '../../server-glue/module.js';
import { getMultipartUploadHandler } from '../multipartUpload.js';

const cancelUploadAction = async ({
	request,
	tx,
	id: resourceId,
}: ODataActionArgs): Promise<Response> => {
	if (typeof resourceId !== 'number') {
		throw new NotImplementedError(
			'multipart upload do not yet support non-numeric ids',
		);
	}
	const { id, fileKey, uploadId } = await getOngoingUpload(
		request,
		resourceId,
		tx,
	);
	const handler = getMultipartUploadHandler();

	await api.webresource.patch({
		resource: 'multipart_upload',
		body: {
			status: 'cancelled',
		},
		id,
		passthrough: {
			tx: tx,
			req: permissions.root,
		},
	});

	// Note that different then beginUpload/commitUpload where we first do the action on the external service
	// and then reflect it on the DB, for cancel upload it is the other way around
	// as the worst case scenario is having a canceled upload which is marked on the DB as something else
	await handler.multipartUpload.cancel({ fileKey, uploadId });

	return {
		statusCode: 204,
	};
};

const getOngoingUpload = async (
	request: ODataActionRequest,
	affectedId: number,
	tx: Tx,
) => {
	const { uuid } = request.values;
	if (uuid == null || typeof uuid !== 'string') {
		throw new BadRequestError('Invalid uuid type');
	}

	const multipartUpload = await api.webresource.get({
		resource: 'multipart_upload',
		id: {
			uuid,
		},
		options: {
			$select: ['id', 'file_key', 'upload_id'],
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
		id: multipartUpload.id,
		fileKey: multipartUpload.file_key,
		uploadId: multipartUpload.upload_id,
	};
};

export default cancelUploadAction;
