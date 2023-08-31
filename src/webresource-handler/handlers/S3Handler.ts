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

import { randomUUID, createHash } from 'crypto';
import type { Hash } from 'crypto';
import type { WebResourceType as WebResource } from '@balena/sbvr-types';
import * as memoize from 'memoizee';
import { Readable, Transform } from 'stream';

export interface S3HandlerProps {
	region: string;
	accessKey: string;
	secretKey: string;
	endpoint: string;
	bucket: string;
	maxSize?: number;
	signedUrlExpireTimeSeconds?: number;
	signedUrlCacheExpireTimeSeconds?: number;
	calculateChecksums?: boolean;
}

class ChecksumCalculator {
	private readonly hash: Hash;
	private readonly passthrough: Transform;

	constructor(
		private readonly calculateChecksums: boolean,
		private readonly stream: Readable,
	) {
		this.hash = createHash('sha256');
		this.passthrough = new HashCalculator(this.hash);

		if (this.calculateChecksums) {
			this.stream.pipe(this.passthrough);
		}
	}

	public getReadStream(): Readable {
		return this.calculateChecksums ? this.passthrough : this.stream;
	}

	public digest(): Promise<string | undefined> {
		return new Promise((resolve) => {
			resolve(this.calculateChecksums ? this.hash.digest('hex') : undefined);
		});
	}
}

class HashCalculator extends Transform {
	private readonly hash: Hash;

	constructor(hash: Hash) {
		super();
		this.hash = hash;
	}

	_transform(chunk: Buffer, _encoding: string, callback: () => void) {
		this.hash.update(chunk);
		this.push(chunk);
		callback();
	}
}

export class S3Handler implements WebResourceHandler {
	private readonly config: S3ClientConfig;
	private readonly bucket: string;
	private readonly maxFileSize: number;
	private readonly calculateChecksums: boolean;

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
		this.calculateChecksums = config.calculateChecksums ?? true;

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

		const checksumCalculator = new ChecksumCalculator(
			this.calculateChecksums,
			resource.stream,
		);
		const params: PutObjectCommandInput = {
			Bucket: this.bucket,
			StorageClass: 'STANDARD',
			Key: key,
			Body: checksumCalculator.getReadStream(),
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

		const checksum = await checksumCalculator.digest();
		const filename = this.getS3URL(key);
		return { size, filename, checksum };
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
