import { api, type Response } from '../../sbvr-api/sbvr-utils.js';
import type { MultipartUploadHandler } from '../multipartUpload.js';
import { getMultipartUploadHandler } from '../multipartUpload.js';
import type { BeginMultipartUploadPayload, UploadPart } from '../index.js';
import { getWebResourceFields } from '../index.js';
import { BadRequestError, NotImplementedError } from '../../sbvr-api/errors.js';
import { permissions, sbvrUtils } from '../../server-glue/module.js';
import { randomUUID } from 'crypto';
import type { WebResourceType as WebResource } from '@balena/sbvr-types';
import type {
	ODataActionArgs,
	ODataActionRequest,
} from '../../sbvr-api/actions.js';
import { ajv } from '../../tasks/common.js';
import type { FromSchema } from 'json-schema-to-ts';

type FakeWebResourcePatch = {
	[key: string]: Omit<WebResource, 'href'> & {
		href: 'fake_patch';
	};
};

const beginUploadPayloadSchema = {
	type: 'object',
	minProperties: 1,
	maxProperties: 1,
	additionalProperties: {
		type: 'object',
		properties: {
			filename: { type: 'string' },
			content_type: { type: 'string' },
			size: { type: 'number' },
			chunk_size: { type: 'number' },
		},
		required: ['filename', 'content_type', 'size'],
		additionalProperties: false,
	},
} as const;

const validateBeginUpload = ajv.compile<
	FromSchema<typeof beginUploadPayloadSchema>
>(beginUploadPayloadSchema);

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
	const { fieldName, beginUploadPayload } = parseBeginUpload(request, handler);

	await runFakeDbPatch(request, {
		[fieldName]: { ...beginUploadPayload, href: 'fake_patch' },
	});

	const { fileKey, uploadId, uploadParts } =
		await handler.multipartUpload.begin(fieldName, beginUploadPayload);
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
			...beginUploadPayload,
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
	const { values } = request;
	const isValid = validateBeginUpload(values);
	if (!isValid) {
		throw new BadRequestError('Invalid begin upload payload');
	}

	// This is ensured to be an object with exactly one key
	// as the validator has minProperties: 1 and maxProperties: 1
	const fieldName = Object.keys(values)[0];

	const webResourceFields = getWebResourceFields(request, false);
	if (!webResourceFields.includes(fieldName)) {
		throw new BadRequestError(
			`The provided field '${fieldName}' is not a valid webresource`,
		);
	}
	const beginUploadPayload = {
		...values[fieldName],
		chunk_size:
			values[fieldName].chunk_size ??
			webResourceHandler.multipartUpload.getDefaultPartSize(),
	} satisfies BeginMultipartUploadPayload;

	if (
		beginUploadPayload.chunk_size <
		webResourceHandler.multipartUpload.getMinimumPartSize()
	) {
		throw new BadRequestError('Chunk size is too small');
	}

	return {
		beginUploadPayload,
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
