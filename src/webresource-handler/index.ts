import type * as Express from 'express';
import busboy from 'busboy';
import type * as stream from 'node:stream';
import * as uriParser from '../sbvr-api/uri-parser';
import * as sbvrUtils from '../sbvr-api/sbvr-utils';
import type { HookArgs } from '../sbvr-api/hooks';
import { getApiRoot, getModel } from '../sbvr-api/sbvr-utils';
import { checkPermissions } from '../sbvr-api/permissions';
import { NoopHandler } from './handlers/NoopHandler';
import {
	odataNameToSqlName,
	sqlNameToODataName,
} from '@balena/odata-to-abstract-sql';
import { errors, permissions } from '../server-glue/module';
import type { WebResourceType as WebResource } from '@balena/sbvr-types';
import { TypedError } from 'typed-error';
import memoize from 'memoizee';

export * from './handlers';

export interface IncomingFile {
	fieldname: string;
	originalname: string;
	encoding: string;
	mimetype: string;
	stream: stream.Readable;
}

export interface UploadResponse {
	size: number;
	filename: string;
}

export interface MultipartUploadParameters {
	vocabulary: string;
	resourceName: string;
	id: number;
	fieldName: string;
}

export interface MultipartUploadBody
	extends Pick<WebResource, 'filename' | 'content_type'> {
	size: number;
	chunkSize?: number;
}

export interface MultipartUploadTokenPayload {
	fileKey: string;
	uploadId: string;
	filename: string;
	uploadParameters: MultipartUploadParameters;
}

export interface UploadUrl {
	url: string;
	chunkSize: number;
	partNumber: number;
}

export interface MultipartUploadResponse {
	token: string;
	uploadUrls: UploadUrl[];
}

export interface WebResourceHandler {
	handleFile: (resource: IncomingFile) => Promise<UploadResponse>;
	removeFile: (fileReference: string) => Promise<void>;
	onPreRespond: (webResource: WebResource) => Promise<WebResource>;

	// These are only used for presigned multipart url uploads
	getUpload: (
		uploadParameters: MultipartUploadParameters,
		metadata: MultipartUploadBody,
	) => Promise<MultipartUploadResponse>;

	decodeUploadToken: (token: string) => Promise<MultipartUploadTokenPayload>;
	commitUpload: (
		decodedPayload: MultipartUploadTokenPayload,
		additionalCommitInfo?: any,
	) => Promise<WebResource>;
}

export class WebResourceError extends TypedError {}

export class FileSizeExceededError extends WebResourceError {
	name = 'FileSizeExceededError';
	constructor(maxSize: number) {
		super(`File size exceeded the limit of ${maxSize} bytes.`);
	}
}

type WebResourcesDbResponse = {
	[fieldname: string]: { href: string } | undefined | null;
};

const getLogger = (vocab?: string): Console => {
	if (vocab) {
		return sbvrUtils.api[vocab]?.logger ?? console;
	}
	return console;
};

let configuredWebResourceHandler: WebResourceHandler | undefined;
export const setupWebresourceHandler = (handler: WebResourceHandler): void => {
	configuredWebResourceHandler = handler;
};
export const getWebresourceHandler = (): WebResourceHandler | undefined => {
	return configuredWebResourceHandler;
};

const isFileInValidPath = async (
	fieldname: string,
	req: Express.Request,
	odataRequest: uriParser.ParsedODataRequest,
): Promise<boolean> => {
	if (req.method !== 'POST' && req.method !== 'PATCH') {
		return false;
	}

	const apiRoot = getApiRoot(req);
	if (apiRoot == null) {
		return false;
	}
	const model = getModel(apiRoot);
	const sqlResourceName = sbvrUtils.resolveSynonym(odataRequest);

	const table = model.abstractSql.tables[sqlResourceName];

	if (table == null) {
		return false;
	}

	const permission = req.method === 'POST' ? 'create' : 'update';
	const vocab = model.versions[model.versions.length - 1];

	// Checks if it has permissions on both the original resourceName or any synonym
	const hasPermissions = await checkPermissions(
		req,
		permission,
		odataRequest.resourceName,
		vocab,
	);

	if (!hasPermissions) {
		return false;
	}

	const dbFieldName = odataNameToSqlName(fieldname);
	return table.fields.some(
		(field) =>
			field.fieldName === dbFieldName && field.dataType === 'WebResource',
	);
};

export const getUploaderMiddlware = (
	handler: WebResourceHandler,
): Express.RequestHandler => {
	return async (req, res, next) => {
		if (!req.is('multipart')) {
			return next();
		}
		const uploadedFilePaths: string[] = [];
		const completeUploads: Array<Promise<void>> = [];

		const bb = busboy({ headers: req.headers });
		let isAborting = false;

		const parsedOdataRequest = uriParser.parseOData({
			url: req.url,
			method: req.method,
		});
		const webResourcesFieldNames = getWebResourceFields(
			parsedOdataRequest,
			false,
		);

		const finishFileUpload = () => {
			req.unpipe(bb);
			req.on('readable', req.read.bind(req));
			bb.removeAllListeners();
		};

		const clearFiles = async () => {
			isAborting = true;
			const deletions = uploadedFilePaths.map((file) =>
				handler.removeFile(file),
			);
			// Best effort: We try to remove all uploaded files, but if this fails, there is not much to do
			try {
				return await Promise.all(deletions);
			} catch (err) {
				getLogger(getApiRoot(req)).error('Error deleting file', err);
			}
		};

		bb.on('file', (fieldname, filestream, info) => {
			if (isAborting) {
				filestream.resume();
				return;
			}
			completeUploads.push(
				(async () => {
					try {
						if (
							!(await isFileInValidPath(fieldname, req, parsedOdataRequest))
						) {
							filestream.resume();
							return;
						}
						const file: IncomingFile = {
							originalname: info.filename,
							encoding: info.encoding,
							mimetype: info.mimeType,
							stream: filestream,
							fieldname,
						};
						const result = await handler.handleFile(file);
						req.body[fieldname] = {
							filename: info.filename,
							content_type: info.mimeType,
							content_disposition: undefined,
							size: result.size,
							href: result.filename,
						};
						uploadedFilePaths.push(result.filename);
					} catch (err: any) {
						filestream.resume();
						throw err;
					}
				})(),
			);
		});

		// multipart requests will have two main parts, the file contents and the form fields
		// This receives the form fields and transforms them into a standard JSON body
		// This is a similar behavior as previous multer library did
		bb.on('field', (name, val) => {
			if (webResourcesFieldNames.includes(name)) {
				isAborting = true;
				bb.emit(
					'error',
					new errors.BadRequestError('WebResource field must be a blob.'),
				);
				return;
			}
			req.body[name] = val;
		});

		bb.on('finish', async () => {
			try {
				await Promise.all(completeUploads);
				finishFileUpload();
				next();
			} catch (err: any) {
				await clearFiles();

				if (err instanceof FileSizeExceededError) {
					return sbvrUtils.handleHttpErrors(
						req,
						res,
						new errors.BadRequestError(err.message),
					);
				}

				getLogger(getApiRoot(req)).error('Error uploading file', err);
				next(err);
			}
		});

		bb.on('error', async (err: Error) => {
			await clearFiles();
			finishFileUpload();
			sbvrUtils.handleHttpErrors(req, res, err);
		});
		req.pipe(bb);
	};
};

const parseUploadParameters = (
	params: any,
): MultipartUploadParameters | null => {
	const { vocabulary, resourceName, id, fieldName } = params;
	if (
		typeof vocabulary !== 'string' ||
		typeof resourceName !== 'string' ||
		typeof fieldName !== 'string' ||
		isNaN(Number(id))
	) {
		return null;
	}
	const parsedId: number = Number(id);
	return {
		vocabulary,
		resourceName,
		id: parsedId,
		fieldName,
	};
};

const validateMultipartUploadBody = (body: any): MultipartUploadBody | null => {
	if (
		body == null ||
		typeof body !== 'object' ||
		typeof body.filename !== 'string' ||
		typeof body.content_type !== 'string' ||
		typeof body.size !== 'number' ||
		(body.chunkSize != null && typeof body.chunkSize !== 'number')
	) {
		return null;
	}
	return body;
};

// On purpose passing uploadParameters as individual parameters for memoization
const memoizedHasUpdatePermissions = memoize(
	async (
		resourceName: MultipartUploadParameters['resourceName'],
		vocabulary: MultipartUploadParameters['vocabulary'],
		id: MultipartUploadParameters['id'],
		fieldName: MultipartUploadParameters['fieldName'],
	): Promise<boolean> => {
		try {
			const model = getModel(vocabulary);
			if (model == null) {
				return false;
			}

			const table = model.abstractSql.tables[odataNameToSqlName(resourceName)];
			const fields = table.fields.filter(
				(f) =>
					f.dataType === 'WebResource' &&
					f.fieldName === odataNameToSqlName(fieldName),
			);

			if (fields.length < 1) {
				return false;
			}

			await sbvrUtils.api[vocabulary].post({
				url: `${resourceName}(${id})/canAccess`,
				body: { action: 'update' },
			});

			return true;
		} catch (err) {
			getLogger(vocabulary).warn(
				'Failed to validate access for',
				resourceName,
				id,
			);
			return false;
		}
	},
	{ promise: true, maxAge: 1000 * 60 * 5 },
);

const hasUploadPermissions = (uploadParameters: MultipartUploadParameters) => {
	return memoizedHasUpdatePermissions(
		uploadParameters.resourceName,
		uploadParameters.vocabulary,
		uploadParameters.id,
		uploadParameters.fieldName,
	);
};

const getUploadPartUrls: Express.RequestHandler = async (req, res, next) => {
	const handler = getWebresourceHandler();
	if (handler == null) {
		return next(
			new errors.BadRequestError('No webresource handler configured'),
		);
	}

	const uploadParameters = parseUploadParameters(req.query);
	if (uploadParameters == null) {
		return next(new errors.BadRequestError('Invalid request parameters'));
	}

	const requestBody = validateMultipartUploadBody(req.body);
	if (requestBody == null) {
		return next(new errors.BadRequestError('Invalid request body'));
	}

	const hasPermissions = await hasUploadPermissions(uploadParameters);
	if (!hasPermissions) {
		return next(new errors.ForbiddenError());
	}

	try {
		const upload = await handler.getUpload(uploadParameters, requestBody);
		return res.status(200).json(upload);
	} catch (err) {
		getLogger().warn('Failed to get upload', err);
		return next(new errors.ConflictError('Failed to get upload'));
	}
};

const commitUpload: Express.RequestHandler = async (req, res, next) => {
	const handler = getWebresourceHandler();
	if (handler == null) {
		return next(
			new errors.BadRequestError('No webresource handler configured'),
		);
	}

	const token = req.body.token;
	if (token == null) {
		return next(new errors.BadRequestError('Upload token is required'));
	}

	const additionalCommitInfo = req.body.additionalCommitInfo;

	const decodedPayload = await handler.decodeUploadToken(token);
	const hasPermissions = await hasUploadPermissions(
		decodedPayload.uploadParameters,
	);
	if (!hasPermissions) {
		return next(new errors.ForbiddenError());
	}
	// Note that this has to be done in this order, first commit on the storage and then on the DB
	// to ensure that we will only store metadata if the file is actually stored
	try {
		const webresource = await handler.commitUpload(
			decodedPayload,
			additionalCommitInfo,
		);

		await sbvrUtils.api[decodedPayload.uploadParameters.vocabulary].patch({
			passthrough: {
				req: permissions.root,
			},
			resource: decodedPayload.uploadParameters.resourceName,
			id: decodedPayload.uploadParameters.id,
			body: { [decodedPayload.uploadParameters.fieldName]: webresource },
		});
		return res.status(200).json(webresource);
	} catch (err) {
		// TODO: do we want to invalidate the MultiPartUpload if the db tx fails?
		getLogger(decodedPayload.uploadParameters.vocabulary).warn(
			'Failed to commit upload',
			err,
		);
		return next(new errors.ConflictError('Failed to commit upload'));
	}
};

export const setupWebresourceUploadRoutes = (
	app: Express.Application,
): void => {
	app.post('/v1/webresources/get_upload_urls', getUploadPartUrls);
	app.post('/v1/webresources/commit', commitUpload);
};

const getWebResourceFields = (
	request: uriParser.ODataRequest | uriParser.ParsedODataRequest,
	useTranslations = true,
): string[] => {
	// Translations will use modifyFields(translated) rather than fields(original) so we need to
	// account for it while finding if a webresrouce field was changed
	// there are cases where we need to get the original resource name (not translated)
	// therefore we can use useTranslations = false
	const resourceName = sbvrUtils.resolveSynonym(request);
	const sqlResourceName = odataNameToSqlName(resourceName);
	const model = sbvrUtils.getAbstractSqlModel(request).tables[sqlResourceName];
	const fields = useTranslations
		? model.modifyFields ?? model.fields
		: model.fields;

	return fields
		.filter((f) => f.dataType === 'WebResource')
		.map((f) => sqlNameToODataName(f.fieldName));
};

const deleteFiles = async (
	keysToDelete: string[],
	webResourceHandler: WebResourceHandler,
) => {
	const promises = keysToDelete.map((r) => webResourceHandler.removeFile(r));
	await Promise.all(promises);
};

const throwIfWebresourceNotInMultipart = (
	webResourceFields: string[],
	{ req, request }: HookArgs,
) => {
	if (
		req.user !== permissions.root.user &&
		!req.is?.('multipart') &&
		webResourceFields.some((field) => request.values[field] != null)
	) {
		throw new errors.BadRequestError(
			'Use multipart requests to upload a file.',
		);
	}
};

const getCreateWebResourceHooks = (
	webResourceHandler: WebResourceHandler,
): sbvrUtils.Hooks => {
	return {
		PRERUN: (hookArgs) => {
			const webResourceFields = getWebResourceFields(hookArgs.request);
			throwIfWebresourceNotInMultipart(webResourceFields, hookArgs);
		},
		'POSTRUN-ERROR': async ({ tx, request }) => {
			tx.on('rollback', () => {
				void deleteRollbackPendingFields(request, webResourceHandler);
			});
		},
	};
};

const isDefined = <T>(x: T | undefined | null): x is T => x != null;

const getWebResourcesHrefs = (
	webResources?: WebResourcesDbResponse[] | null,
): string[] => {
	const hrefs = (webResources ?? []).flatMap((resource) =>
		Object.values(resource ?? {})
			.filter(isDefined)
			.map((resourceKey) => normalizeHref(resourceKey.href)),
	);
	return hrefs;
};

export const normalizeHref = (href: string) => {
	return href.split('?')[0];
};

const getWebResourcesKeysFromRequest = (
	webResourceFields: string[],
	{ values }: uriParser.ODataRequest,
): string[] => {
	return webResourceFields
		.map((field) => values[field]?.href)
		.filter(isDefined);
};

const getRemoveWebResourceHooks = (
	webResourceHandler: WebResourceHandler,
): sbvrUtils.Hooks => {
	return {
		PRERUN: async (args) => {
			const { api, request, tx } = args;
			let webResourceFields = getWebResourceFields(request);

			throwIfWebresourceNotInMultipart(webResourceFields, args);

			// Request failed on DB roundtrip (e.g. DB constraint) and pending files need to be deleted
			tx.on('rollback', () => {
				void deleteRollbackPendingFields(request, webResourceHandler);
			});

			if (request.method === 'PATCH') {
				webResourceFields = Object.entries(request.values)
					.filter(
						([key, value]) =>
							value !== undefined && webResourceFields.includes(key),
					)
					.map(([key]) => key);
			}

			if (webResourceFields.length === 0) {
				// No need to delete anything as no file is in the wire
				// As there are no webresource fields in this request
				return;
			}

			// This can only be validated here because we need to first ensure the
			// request is actually modifying a webresource before erroring out
			if (request.method === 'PATCH' && request.odataQuery?.key == null) {
				// When we get here, files have already been uploaded. We need to mark them for deletion.
				const keysToDelete = getWebResourcesKeysFromRequest(
					webResourceFields,
					request,
				);

				// Set deletion of files on the wire as request will throw
				tx.on('end', () => {
					deletePendingFiles(keysToDelete, request, webResourceHandler);
				});

				throw new errors.BadRequestError(
					'WebResources can only be updated when providing a resource key.',
				);
			}

			// This can be > 1 in both DELETE requests or PATCH requests to not accessible IDs.
			const ids = await sbvrUtils.getAffectedIds(args);
			if (ids.length === 0) {
				// Set deletion of files on the wire as no resource was affected
				// Note that for DELETE requests it should not find any request on the wire
				const keysToDelete = getWebResourcesKeysFromRequest(
					webResourceFields,
					request,
				);
				deletePendingFiles(keysToDelete, request, webResourceHandler);
				return;
			}

			const webResources = (await api.get({
				resource: request.resourceName,
				passthrough: {
					tx: args.tx,
					req: permissions.root,
				},
				options: {
					$select: webResourceFields,
					$filter: {
						id: {
							$in: ids,
						},
					},
				},
			})) as WebResourcesDbResponse[] | undefined | null;

			// Deletes previous stored resources in case they were patched or the whole entity was deleted
			tx.on('end', () => {
				deletePendingFiles(
					getWebResourcesHrefs(webResources),
					request,
					webResourceHandler,
				);
			});
		},
	};
};

const deleteRollbackPendingFields = async (
	request: uriParser.ODataRequest,
	webResourceHandler: WebResourceHandler,
) => {
	const fields = getWebResourceFields(request);

	if (fields.length === 0) {
		return;
	}

	const keysToDelete = getWebResourcesKeysFromRequest(fields, request);
	await deleteFiles(keysToDelete, webResourceHandler);
};

const deletePendingFiles = (
	keysToDelete: string[],
	request: uriParser.ODataRequest,
	webResourceHandler: WebResourceHandler,
): void => {
	// on purpose does not await for this promise to resolve
	try {
		void deleteFiles(keysToDelete, webResourceHandler);
	} catch (err) {
		getLogger(request.vocabulary).error(`Failed to delete pending files`, err);
	}
};

export const getDefaultHandler = (): WebResourceHandler => {
	return new NoopHandler();
};

export const setupUploadHooks = (
	handler: WebResourceHandler,
	apiRoot: string,
	resourceName: string,
) => {
	sbvrUtils.addPureHook(
		'DELETE',
		apiRoot,
		resourceName,
		getRemoveWebResourceHooks(handler),
	);

	sbvrUtils.addPureHook(
		'PATCH',
		apiRoot,
		resourceName,
		// PATCH also needs to remove the old resource in case a webresource was modified
		getRemoveWebResourceHooks(handler),
	);

	sbvrUtils.addPureHook(
		'POST',
		apiRoot,
		resourceName,
		getCreateWebResourceHooks(handler),
	);
};
