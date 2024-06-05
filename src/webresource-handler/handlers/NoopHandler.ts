import type { WebResourceType as WebResource } from '@balena/sbvr-types';
import type { IncomingFile, UploadResponse, WebResourceHandler } from '..';
import type {
	BeginUploadHandlerResponse,
	BeginUploadPayload,
	CommitUploadHandlerPayload,
} from '../multipartUpload';

export class NoopHandler implements WebResourceHandler {
	public async handleFile(resource: IncomingFile): Promise<UploadResponse> {
		// handleFile must consume the file stream
		resource.stream.resume();
		return {
			filename: 'noop',
			size: 0,
		};
	}

	public async removeFile(): Promise<void> {
		return;
	}

	public async onPreRespond(webResource: WebResource): Promise<WebResource> {
		return webResource;
	}

	public async beginUpload(
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_fieldName: string,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_payload: BeginUploadPayload,
	): Promise<BeginUploadHandlerResponse> {
		return { fileKey: 'noop', uploadId: 'noop', uploadUrls: [] };
	}

	public async commitUpload(
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_payload: CommitUploadHandlerPayload,
	): Promise<WebResource> {
		return { filename: 'noop', href: 'noop' };
	}
}
