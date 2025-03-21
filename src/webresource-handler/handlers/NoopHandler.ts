import type { WebResourceType as WebResource } from '@balena/sbvr-types';
import type {
	IncomingFile,
	UploadResponse,
	WebResourceHandler,
} from '../index.js';

export class NoopHandler implements WebResourceHandler {
	// eslint-disable-next-line @typescript-eslint/require-await -- We need to return a promise for compatibility reasons.
	public async handleFile(resource: IncomingFile): Promise<UploadResponse> {
		// handleFile must consume the file stream
		resource.stream.resume();
		return {
			filename: 'noop',
			size: 0,
		};
	}

	public async removeFile(): Promise<void> {
		// noop
	}

	// eslint-disable-next-line @typescript-eslint/require-await -- We need to return a promise for compatibility reasons.
	public async onPreRespond(webResource: WebResource): Promise<WebResource> {
		return webResource;
	}
}
