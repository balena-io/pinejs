import {
	FileSizeExceededError,
	IncomingFile,
	normalizeHref,
	UploadResponse,
	WebResourceError,
	WebResourceHandler,
} from '..';
import {
	S3Client,
	S3ClientConfig,
	DeleteObjectCommand,
	PutObjectCommandInput,
	GetObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { randomUUID } from 'crypto';
import type { WebResourceType as WebResource } from '@balena/sbvr-types';
import memoize from 'memoizee';

export interface S3HandlerProps {
	region: string;
	accessKey: string;
	secretKey: string;
	endpoint: string;
	bucket: string;
	maxSize?: number;
	signedUrlExpireTimeSeconds?: number;
	signedUrlCacheExpireTimeSeconds?: number;
}

export class S3Handler implements WebResourceHandler {
	private readonly config: S3ClientConfig;
	private readonly bucket: string;
	private readonly maxFileSize: number;

	protected readonly signedUrlExpireTimeSeconds: number;
	protected readonly signedUrlCacheExpireTimeSeconds: number;
	protected cachedGetSignedUrl: (fileKey: string) => Promise<string>;

	private client: S3Client;

	constructor(config: S3HandlerProps) {
		this.config = {
			region: config.region,
			credentials: {
				accessKeyId: config.accessKey,
				secretAccessKey: config.secretKey,
			},
			endpoint: config.endpoint,
			forcePathStyle: true,
		};

		this.signedUrlExpireTimeSeconds =
			config.signedUrlExpireTimeSeconds ?? 86400; // 24h
		this.signedUrlCacheExpireTimeSeconds =
			config.signedUrlCacheExpireTimeSeconds ?? 82800; // 22h

		this.maxFileSize = config.maxSize ?? 52428800;
		this.bucket = config.bucket;
		this.client = new S3Client(this.config);

		// Memoize expects maxAge in MS and s3 signing method in seconds.
		// Normalization to use only seconds and therefore convert here from seconds to MS
		this.cachedGetSignedUrl = memoize(this.s3SignUrl, {
			maxAge: this.signedUrlCacheExpireTimeSeconds * 1000,
		});
	}

	public async handleFile(resource: IncomingFile): Promise<UploadResponse> {
		let size = 0;
		const key = `${resource.fieldname}_${randomUUID()}_${
			resource.originalname
		}`;
		const params: PutObjectCommandInput = {
			Bucket: this.bucket,
			Key: key,
			Body: resource.stream,
			ContentType: resource.mimetype,
		};
		const upload = new Upload({ client: this.client, params });

		upload.on('httpUploadProgress', async (ev) => {
			size = ev.total ?? ev.loaded!;
			if (size > this.maxFileSize) {
				await upload.abort();
			}
		});

		try {
			await upload.done();
		} catch (err: any) {
			resource.stream.resume();
			if (size > this.maxFileSize) {
				throw new FileSizeExceededError(this.maxFileSize);
			}
			throw new WebResourceError(err);
		}

		const filename = this.getS3URL(key);
		return { size, filename };
	}

	public async removeFile(href: string): Promise<void> {
		const fileKey = this.getKeyFromHref(href);

		const command = new DeleteObjectCommand({
			Bucket: this.bucket,
			Key: fileKey,
		});

		await this.client.send(command);
	}

	public async onPreRespond(webResource: WebResource): Promise<WebResource> {
		if (webResource.href != null) {
			const fileKey = this.getKeyFromHref(webResource.href);
			webResource.href = await this.cachedGetSignedUrl(fileKey);
		}
		return webResource;
	}

	private s3SignUrl(fileKey: string): Promise<string> {
		const command = new GetObjectCommand({
			Bucket: this.bucket,
			Key: fileKey,
		});
		return getSignedUrl(this.client, command, {
			expiresIn: this.signedUrlExpireTimeSeconds,
		});
	}

	private getS3URL(key: string): string {
		return `${this.config.endpoint}/${this.bucket}/${key}`;
	}

	private getKeyFromHref(href: string): string {
		const hrefWithoutParams = normalizeHref(href);
		return hrefWithoutParams.substring(hrefWithoutParams.lastIndexOf('/') + 1);
	}
}
