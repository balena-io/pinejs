import type { WebResourceType as WebResource } from '@balena/sbvr-types';
import type {
	BeginMultipartUploadHandlerResponse,
	IncomingFile,
	UploadResponse,
	WebResourceHandler,
} from '..';

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

	public async beginMultipartUpload(): Promise<BeginMultipartUploadHandlerResponse> {
		return { fileKey: 'noop', uploadId: 'noop', uploadParts: [] };
	}

	public async commitMultipartUpload(): Promise<WebResource> {
		return { filename: 'noop', href: 'noop' };
	}
}
