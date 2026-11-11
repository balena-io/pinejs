import { api, type Response } from '../../sbvr-api/sbvr-utils.js';
import type { MultipartUploadHandler } from '../multipartUpload.js';
import { getMultipartUploadHandler } from '../multipartUpload.js';
import type { UploadPart } from '../index.js';
import { getWebResourceFields } from '../index.js';
import { BadRequestError, NotImplementedError } from '../../sbvr-api/errors.js';
import { permissions, sbvrUtils } from '../../server-glue/module.js';
import { randomUUID } from 'crypto';
import type { WebResourceType as WebResource } from '@balena/sbvr-types';
import type {
	ODataActionArgs,
	ODataActionRequest,
} from '../../sbvr-api/actions.js';
import z from 'zod';

type FakeWebResourcePatch = {
	[key: string]: Omit<WebResource, 'href'> & {
		href: 'fake_patch';
	};
};

const beginUploadPayloadSchema = z.compile(
	z
		.record(
			z.string(),
			z.strictObject({
				// Bounded by the `multipart_upload` columns, so that an oversized value
				// is rejected before the multipart upload is started on the provider
				filename: z.string().max(255), // Short Text
				content_type: z.string().max(255), // Short Text
				size: z.int().nonnegative(), // Big Integer
				chunk_size: z.int32().positive().optional(), // Integer
			}),
		)
		.refine((payload) => Object.keys(payload).length === 1),
);

export type BeginMultipartUploadResponse = {
	[key: string]: {
		uuid: string;
		uploadParts: UploadPart[];
	};
};

const beginUploadAction = async ({
	request,
	tx,
	id,
	req,
}: ODataActionArgs): Promise<Response> => {
	if (typeof id !== 'number') {
		throw new NotImplementedError(
			'multipart upload do not yet support non-numeric ids',
		);
	}

	const handler = getMultipartUploadHandler();
	const { fieldName, payload, chunkSize } = parseBeginUpload(request, handler);

	await runFakeDbPatch(request, {
		[fieldName]: { ...payload, href: 'fake_patch' },
	});

	const { fileKey, uploadId, uploadParts } =
		await handler.multipartUpload.begin(fieldName, {
			...payload,
			chunk_size: chunkSize,
		});
	const uuid = randomUUID();
	await api.webresource.post({
		resource: 'multipart_upload',
		body: {
			uuid,
			resource_name: request.resourceName,
			field_name: fieldName,
			resource_id: id,
			upload_id: uploadId,
			file_key: fileKey,
			status: 'pending',
			...payload,
			chunk_size: chunkSize,
			expiry_date: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days in ms
			is_created_by__actor: req.user?.actor,
		},
		passthrough: {
			req: permissions.root,
			tx,
		},
	});

	return {
		body: {
			[fieldName]: { uuid, uploadParts },
		} satisfies BeginMultipartUploadResponse,
		statusCode: 200,
	};
};

const parseBeginUpload = (
	request: ODataActionRequest,
	webResourceHandler: MultipartUploadHandler,
) => {
	const result = beginUploadPayloadSchema.safeParse(request.values);
	// zod drops a `__proto__` key when building a record, so the refine never
	// sees it: count the raw keys too, to reject `{"__proto__": ..., "a": ...}`
	if (!result.success || Object.keys(request.values).length !== 1) {
		throw new BadRequestError('Invalid begin upload payload');
	}
	const values = result.data;

	// This is ensured to be an object with exactly one key
	// as the validator refines it to exactly one property
	const fieldName = Object.keys(values)[0];

	const webResourceFields = getWebResourceFields(request, false);
	if (!webResourceFields.includes(fieldName)) {
		throw new BadRequestError(
			`The provided field '${fieldName}' is not a valid webresource`,
		);
	}

	const { chunk_size: requestedChunkSize, ...payload } = values[fieldName];

	const chunkSize =
		requestedChunkSize ??
		webResourceHandler.multipartUpload.getDefaultPartSize();
	if (chunkSize < webResourceHandler.multipartUpload.getMinimumPartSize()) {
		throw new BadRequestError('Chunk size is too small');
	}

	return {
		payload,
		chunkSize,
		fieldName,
	};
};

// We want beginUpload to fail if the initial payload would already break any constraint/hooks/rule
// this serves as both an optimization and a better client experience as it avoids succeding a beginUpload
// (which could allow for potentially very large PartUploads) only for it to fail on commitUpload
// The current approach to try to achieve this behavior creates this fake database patch:
// It first tries to patch the file metadata (on a separate tx) to something similar to what it would look like
// and if it breaks any constraint, then it throws and fail to even start the upload
// Note that because the href is only generated at commitUpload time, we need to fake it for the time being
// This could potentially be a problem if an application code has a constraint on the href property
// However, because this is a internal (pine managed) property we assumed that application code won't do so
const runFakeDbPatch = async (
	request: ODataActionRequest,
	fakeDbPatch: FakeWebResourcePatch,
) => {
	const fakeTx = await sbvrUtils.db.transaction();
	try {
		const newUrl = request.url
			.slice(1)
			.split('?', 1)[0]
			.replace(/\/beginUpload$/, '');

		await api[request.vocabulary].request({
			method: 'PATCH',
			url: newUrl,
			body: fakeDbPatch,
			// it needs root as otherwise it would always fail as non-root users
			// are not allowed to directly patch webresource metadata, onnly upload files
			passthrough: { tx: fakeTx, req: permissions.root },
		});
	} finally {
		if (!fakeTx.isClosed()) {
			await fakeTx.rollback();
		}
	}
};

export default beginUploadAction;
