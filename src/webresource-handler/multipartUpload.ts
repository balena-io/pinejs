import { webResource as webResourceEnv } from '../config-loader/env.js';
import { NotImplementedError } from '../sbvr-api/errors.js';
import type { WebResourceHandler } from './index.js';
import { getWebresourceHandler } from './index.js';

export type MultipartUploadHandler = WebResourceHandler &
	Required<Pick<WebResourceHandler, 'multipartUpload'>>;

export const isMultipartUploadAvailable = (
	handler: WebResourceHandler | undefined,
): handler is MultipartUploadHandler => {
	return (
		webResourceEnv.multipartUploadEnabled && handler?.multipartUpload != null
	);
};

export const getMultipartUploadHandler = () => {
	const handler = getWebresourceHandler();
	if (!isMultipartUploadAvailable(handler)) {
		throw new NotImplementedError('Multipart uploads not available');
	}
	return handler;
};
