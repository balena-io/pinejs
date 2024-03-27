import type { WebResourceType as WebResource } from '@balena/sbvr-types';
import type {
	IncomingFile,
	UploadResponse,
	WebResourceHandler,
	WebResourceTokenPayload,
	WebResourceUploadParameters,
	WebResourceStartUploadPayload,
	WebResourceUploadResponse,
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

	public async startUpload(
		/* eslint-disable @typescript-eslint/no-unused-vars */
		_uploadParameters: WebResourceUploadParameters,
		_metadata: WebResourceStartUploadPayload['metadata'],
		/* eslint-enable @typescript-eslint/no-unused-vars */
	): Promise<WebResourceUploadResponse> {
		return { token: '' };
	}

	public async getPartUploadUrl(
		/* eslint-disable @typescript-eslint/no-unused-vars */
		_decodedPayload: WebResourceTokenPayload,
		_partNumber: number,
		/* eslint-enable @typescript-eslint/no-unused-vars */
	): Promise<string> {
		return '';
	}

	public async commitUpload(
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_payload: WebResourceTokenPayload,
	): Promise<WebResource> {
		return {
			filename: 'noop',
			href: 'noop',
		};
	}

	public async decodeUploadToken(
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_token: string,
	): Promise<WebResourceTokenPayload> {
		return {
			fileKey: 'noop',
			uploadId: 'noop',
			uploadParameters: {
				vocabulary: '',
				resourceName: '',
				id: 0,
				fieldName: '',
			},
			metadata: {
				size: 0,
				filename: 'noop',
				content_type: 'noop',
			},
		};
	}
}
