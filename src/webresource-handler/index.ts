import type Express from 'express';
import busboy from 'busboy';
import type stream from 'node:stream';
import * as uriParser from '../sbvr-api/uri-parser.js';
import * as sbvrUtils from '../sbvr-api/sbvr-utils.js';
import type { HookArgs } from '../sbvr-api/hooks.js';
import { getApiRoot, getModel } from '../sbvr-api/sbvr-utils.js';
import { checkPermissions } from '../sbvr-api/permissions.js';
import { NoopHandler } from './handlers/NoopHandler.js';
import {
	odataNameToSqlName,
	sqlNameToODataName,
} from '@balena/odata-to-abstract-sql';
import { errors, permissions } from '../server-glue/module.js';
import type { WebResourceType as WebResource } from '@balena/sbvr-types';
import { TypedError } from 'typed-error';
import type { Resolvable } from '../sbvr-api/common-types.js';
import type { Tx } from '../database-layer/db.js';
import { isPineTasksAvailable } from '../tasks/index.js';

export * from './handlers/index.js';

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

export interface BeginMultipartUploadPayload {
	filename: string;
	content_type: string;
	size: number;
	chunk_size: number;
}

export interface UploadPart {
	url: string;
	chunkSize: number;
	partNumber: number;
}

export interface BeginMultipartUploadHandlerResponse {
	uploadParts: UploadPart[];
	fileKey: string;
	uploadId: string;
}

export interface CommitMultipartUploadPayload {
	fileKey: string;
	uploadId: string;
	filename: string;
	providerCommitData?: Record<string, any>;
}

export interface CancelMultipartUploadPayload {
	fileKey: string;
	uploadId: string;
}

export interface WebResourceHandler {
	handleFile: (resource: IncomingFile) => Promise<UploadResponse>;
	removeFile: (fileReference: string) => Promise<void>;
	onPreRespond: (webResource: WebResource) => Promise<WebResource>;
	multipartUpload?: {
		begin: (
			fieldName: string,
			payload: BeginMultipartUploadPayload,
		) => Promise<BeginMultipartUploadHandlerResponse>;
		commit: (commitInfo: CommitMultipartUploadPayload) => Promise<WebResource>;
		cancel: (cancelInfo: CancelMultipartUploadPayload) => Promise<void>;
		getMinimumPartSize: () => number;
		getDefaultPartSize: () => number;
	};
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
		return sbvrUtils.logger[vocab] ?? console;
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
const notValidUpload = () => false;

const getRequestUploadValidator = async (
	req: Express.Request,
	odataRequest: uriParser.ParsedODataRequest,
): Promise<(fieldName: string) => Resolvable<boolean>> => {
	if (req.method !== 'POST' && req.method !== 'PATCH') {
		return notValidUpload;
	}

	const apiRoot = getApiRoot(req);
	if (apiRoot == null) {
		return notValidUpload;
	}
	const model = getModel(apiRoot);
	const sqlResourceName = sbvrUtils.resolveSynonym(odataRequest);

	const table = model.abstractSql.tables[sqlResourceName];

	if (table == null) {
		return notValidUpload;
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
		return notValidUpload;
	}

	return (fieldname: string) => {
		const dbFieldName = odataNameToSqlName(fieldname);
		return table.fields.some(
			(field) =>
				field.fieldName === dbFieldName && field.dataType === 'WebResource',
		);
	};
};

export const getUploaderMiddlware = (
	handler: WebResourceHandler,
): Express.RequestHandler => {
	return async (req, res, next) => {
		if (!req.is('multipart')) {
			next();
			return;
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

		const isValidUpload = await getRequestUploadValidator(
			req,
			parsedOdataRequest,
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
						if (!(await isValidUpload(fieldname))) {
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
						bb.emit(
							'error',
							new errors.BadRequestError(err.message ?? 'Error uploading file'),
						);
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
				finishFileUpload();
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
			finishFileUpload();
			await clearFiles();

			if (err instanceof FileSizeExceededError) {
				return sbvrUtils.handleHttpErrors(
					req,
					res,
					new errors.BadRequestError(err.message),
				);
			}

			if (!sbvrUtils.handleHttpErrors(req, res, err)) {
				getLogger(getApiRoot(req)).error('Error uploading file', err);
				next(err);
			}
		});
		req.pipe(bb);
	};
};

export const getWebResourceFields = (
	request: uriParser.ParsedODataRequest,
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
		? (model.modifyFields ?? model.fields)
		: model.fields;

	return fields
		.filter((f) => f.dataType === 'WebResource')
		.map((f) => sqlNameToODataName(f.fieldName));
};

const deleteOnStorage = async (keysToDelete: string[], tx?: Tx) => {
	if (isPineTasksAvailable()) {
		await Promise.all(
			keysToDelete.map(async (fileKey) => {
				return await sbvrUtils.api.tasks.post({
					resource: 'task',
					passthrough: {
						req: permissions.root,
						tx,
					},
					body: {
						key: crypto.randomUUID(),
						is_executed_by__handler: 'delete_webresource_file',
						is_executed_with__parameter_set: {
							fileKey: fileKey,
						},
						attempt_limit: 2 ** 31 - 1,
					},
				});
			}),
		);
	} else {
		await Promise.all(
			keysToDelete.map(async (fileKey) => {
				return await configuredWebResourceHandler?.removeFile(fileKey);
			}),
		);
	}
};

const throwIfWebresourceNotInMultipart = (
	webResourceFields: string[],
	{ req, request }: HookArgs,
) => {
	if (
		!req.is?.('multipart') &&
		webResourceFields.some((field) => request.values[field] != null)
	) {
		throw new errors.BadRequestError(
			'Use multipart requests to upload a file.',
		);
	}
};

const getCreateWebResourceHooks = (): sbvrUtils.Hooks => {
	return {
		PRERUN: (hookArgs) => {
			const webResourceFields = getWebResourceFields(hookArgs.request);
			throwIfWebresourceNotInMultipart(webResourceFields, hookArgs);
		},
		'POSTRUN-ERROR': async ({ request }) => {
			await scheduleOnWireDeletion(request);
		},
	};
};

const getWebResourcesHrefs = (
	webResources?: WebResourcesDbResponse[] | null,
): string[] => {
	const hrefs = (webResources ?? []).flatMap((resource) =>
		Object.values(resource ?? {})
			.filter((resourceKey) => resourceKey != null)
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
		.filter((href) => href != null);
};

const getRemoveWebResourceHooks = (): sbvrUtils.Hooks => {
	return {
		PRERUN: async (args) => {
			const { api, request, tx } = args;
			let webResourceFields = getWebResourceFields(request);

			if (request.method === 'PATCH') {
				webResourceFields = Object.entries(request.values)
					.filter(
						([key, value]) =>
							value !== undefined && webResourceFields.includes(key),
					)
					.map(([key]) => key);
			}
			request.custom.webResourceFields = webResourceFields;
			throwIfWebresourceNotInMultipart(webResourceFields, args);

			if (webResourceFields.length === 0) {
				// No need to delete anything as no file is in the wire
				// And there are no webresource fields in this request
				return;
			}

			// This can only be validated here because we need to first ensure the
			// request is actually modifying a webresource before erroring out
			if (request.method === 'PATCH' && request.odataQuery?.key == null) {
				throw new errors.BadRequestError(
					'WebResources can only be updated when providing a resource key.',
				);
			}

			const ids = await sbvrUtils.getAffectedIds(args);
			if (ids.length === 0) {
				// Set deletion of files on the wire as no resource was affected
				request.custom.onPostRunDelete = getWebResourcesKeysFromRequest(
					webResourceFields,
					request,
				);
				return;
			}

			// If it reaches here, it means that it will try to patch/delete the webresource
			// So we need (before postrun) get what are the current keys to be deleted
			// if post run succeeds
			const webResources = (await api.get({
				resource: request.resourceName,
				passthrough: {
					tx,
					req: permissions.root,
				},
				options: {
					$select: request.custom.webResourceFields,
					$filter: {
						id: {
							$in: ids,
						},
					},
				},
			})) as WebResourcesDbResponse[] | undefined | null;
			request.custom.onPostRunDelete = getWebResourcesHrefs(webResources);
		},

		POSTRUN: async ({ request, tx }) => {
			// Either patch or delete worked. In either case, schedule the previous existing files to delete
			await deleteOnStorage(request.custom.onPostRunDelete ?? [], tx);
		},
		'POSTRUN-ERROR': async ({ request }) => {
			const keysToDelete = getWebResourcesKeysFromRequest(
				request.custom.webResourceFields,
				request,
			);

			// Explicitely not passing tx as it will be rolledback as it is an error hook
			await deleteOnStorage(keysToDelete);
		},
	};
};

const scheduleOnWireDeletion = async (request: uriParser.ODataRequest) => {
	const fields = getWebResourceFields(request);

	if (fields.length === 0) {
		return;
	}

	const keysToDelete = getWebResourcesKeysFromRequest(fields, request);

	// Explicitely not passing tx as it will be rolledback as it is an error hook
	await deleteOnStorage(keysToDelete);
};

export const getDefaultHandler = (): WebResourceHandler => {
	return new NoopHandler();
};

export const setupUploadHooks = (apiRoot: string, resourceName: string) => {
	sbvrUtils.addPureHook(
		'DELETE',
		apiRoot,
		resourceName,
		getRemoveWebResourceHooks(),
	);

	sbvrUtils.addPureHook(
		'PATCH',
		apiRoot,
		resourceName,
		// PATCH also needs to remove the old resource in case a webresource was modified
		getRemoveWebResourceHooks(),
	);

	sbvrUtils.addPureHook(
		'POST',
		apiRoot,
		resourceName,
		getCreateWebResourceHooks(),
	);
};
