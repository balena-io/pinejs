import type { WebResourceType as WebResource } from '@balena/sbvr-types';
import type {
	IncomingFile,
	UploadResponse,
	WebResourceHandler,
	MultipartUploadTokenPayload,
	MultipartUploadParameters,
	MultipartUploadBody,
	MultipartUploadResponse,
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

	public async getUpload(
		/* eslint-disable @typescript-eslint/no-unused-vars */
		_uploadParameters: MultipartUploadParameters,
		_metadata: MultipartUploadBody,
		/* eslint-enable @typescript-eslint/no-unused-vars */
	): Promise<MultipartUploadResponse> {
		return { token: '', uploadUrls: [] };
	}

	public async commitUpload(
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_payload: MultipartUploadTokenPayload,
	): Promise<WebResource> {
		return {
			filename: 'noop',
			href: 'noop',
		};
	}

	public async decodeUploadToken(
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_token: string,
	): Promise<MultipartUploadTokenPayload> {
		return {
			fileKey: 'noop',
			uploadId: 'noop',
			filename: 'noop',
			uploadParameters: {
				vocabulary: '',
				resourceName: '',
				id: 0,
				fieldName: '',
			},
		};
	}
}
