import type * as Express from 'express';
import * as busboy from 'busboy';
import * as is from 'type-is';
import * as stream from 'stream';
import * as uriParser from '../sbvr-api/uri-parser';
import * as sbvrUtils from '../sbvr-api/sbvr-utils';
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

export interface WebResourceHandler {
	handleFile: (resource: IncomingFile) => Promise<UploadResponse>;
	removeFile: (fileReference: string) => Promise<void>;
	onPreRespond: (webResource: WebResource) => Promise<WebResource>;
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

const isFileInValidPath = async (
	fieldname: string,
	req: Express.Request,
): Promise<boolean> => {
	if (req.method !== 'POST' && req.method !== 'PATCH') {
		return false;
	}

	const apiRoot = getApiRoot(req);
	if (apiRoot == null) {
		return false;
	}
	const model = getModel(apiRoot);
	const { resourceName } = await uriParser.parseOData({
		url: req.url,
		method: req.method,
	});

	const permission = req.method === 'POST' ? 'create' : 'update';
	const vocab = model.versions[model.versions.length - 1];
	const hasPermissions = await checkPermissions(
		req,
		permission,
		resourceName,
		vocab,
	);

	if (!hasPermissions) {
		return false;
	}

	const sqlResourceName = odataNameToSqlName(resourceName);
	const fields = model.abstractSql.tables[sqlResourceName].fields;
	const dbFieldName = odataNameToSqlName(fieldname);
	return fields.some(
		(field) =>
			field.fieldName === dbFieldName && field.dataType === 'WebResource',
	);
};

export const getUploaderMiddlware = (
	handler: WebResourceHandler,
): Express.RequestHandler => {
	return async (req, res, next) => {
		if (!is(req, ['multipart'])) {
			return next();
		}
		const uploadedFilePaths: string[] = [];
		const completeUploads: Array<Promise<void>> = [];

		const bb = busboy({ headers: req.headers });
		let isAborting = false;

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

		bb.on('file', async (fieldname, filestream, info) => {
			if (!isAborting && (await isFileInValidPath(fieldname, req))) {
				const file: IncomingFile = {
					originalname: info.filename,
					encoding: info.encoding,
					mimetype: info.mimeType,
					stream: filestream,
					fieldname,
				};
				const promise = handler.handleFile(file).then((result) => {
					req.body[fieldname] = {
						filename: info.filename,
						content_type: info.mimeType,
						content_disposition: undefined,
						size: result.size,
						href: result.filename,
					};
					uploadedFilePaths.push(result.filename);
				});
				completeUploads.push(promise);
			} else {
				filestream.resume();
			}
		});

		// multipart requests will have two main parts, the file contents and the form fields
		// This receives the form fields and transforms them into a standard JSON body
		// This is a similar behavior as previous multer library did
		bb.on('field', (name, val, _info) => {
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

		bb.on('error', async (err) => {
			await clearFiles();
			finishFileUpload();
			next(err);
		});
		req.pipe(bb);
	};
};

const getWebResourceFields = (
	request: uriParser.ODataRequest,
	useTranslations = true,
): string[] => {
	// Translations will use modifyFields(translated) rather than fields(original) so we need to
	// account for it while finding if a webresrouce field was changed
	// there are cases where we need to get the original resource name (not translated)
	// therefore we can use useTranslations = false
	const sqlResourceName = odataNameToSqlName(request.resourceName);
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

const getCreateWebResourceHooks = (
	webResourceHandler: WebResourceHandler,
): sbvrUtils.Hooks => {
	return {
		'POSTRUN-ERROR': async ({ tx, request }) => {
			tx?.on('rollback', () => {
				deleteRollbackPendingFields(request, webResourceHandler);
			});
		},
	};
};

const getReadWebResourceHooks = (
	webResourceHandler: WebResourceHandler,
): sbvrUtils.Hooks => {
	return {
		// Before returning a web resource we might need to do some modifications on the payload (e.g. presigning)
		PRERESPOND: async ({ request, response }) => {
			const fields = getWebResourceFields(request, false);

			if (fields.length === 0) {
				return;
			}

			if (typeof response.body === 'object' && response.body.d != null) {
				const transformedItems = await Promise.all(
					response.body.d.map(async (responseItem: any) => {
						for (const field of fields) {
							if (responseItem[field] != null) {
								responseItem[field] = await webResourceHandler.onPreRespond(
									responseItem[field],
								);
							}
						}
						return responseItem;
					}),
				);
				response.body.d = transformedItems;
			}
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

const getRemoveWebResourceHooks = (
	webResourceHandler: WebResourceHandler,
): sbvrUtils.Hooks => {
	return {
		PRERUN: async (args) => {
			const { api, request, tx } = args;
			let fields = getWebResourceFields(request);

			// Request failed on DB roundtrip (e.g. DB constraint) and pending files need to be deleted
			tx.on('rollback', () => {
				deleteRollbackPendingFields(request, webResourceHandler);
			});

			if (request.method === 'PATCH') {
				fields = Object.entries(request.values)
					.filter(([key, value]) => value !== undefined && fields.includes(key))
					.map(([key]) => key);
			}

			if (fields.length === 0) {
				return;
			}

			// This can only be validated here because we need to first ensure the
			// request is actually modifying a webresource before erroring out
			if (request.method === 'PATCH' && request.odataQuery?.key == null) {
				// When we get here, files have already been uploaded. We need to mark them for deletion.
				const keysToDelete = fields.map((field) => request.values[field].href);

				// Set deletion of files on the wire as request will throw
				tx.on('end', () => {
					deletePendingFiles(keysToDelete, request, webResourceHandler);
				});

				throw new errors.BadRequestError(
					'WebResources can only be updated when providing a resource key.',
				);
			}

			// This will only be > 1 in a DELETE. In PATCH requests, the request should have exited before
			const ids = await sbvrUtils.getAffectedIds(args);
			if (ids.length === 0) {
				return;
			}

			const webResources = (await api.get({
				resource: request.resourceName,
				passthrough: {
					tx: args.tx,
					req: permissions.root,
				},
				options: {
					$select: fields,
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

	const keysToDelete: string[] = fields
		.map((f) => request.values[f]?.href)
		.filter(isDefined);

	await deleteFiles(keysToDelete, webResourceHandler);
};

const deletePendingFiles = (
	keysToDelete: string[],
	request: uriParser.ODataRequest,
	webResourceHandler: WebResourceHandler,
): void => {
	// on purpose does not await for this promise to resolve
	try {
		deleteFiles(keysToDelete, webResourceHandler);
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

	sbvrUtils.addPureHook(
		'GET',
		apiRoot,
		resourceName,
		getReadWebResourceHooks(handler),
	);
};
