import { FileSizeExceededError, normalizeHref, WebResourceError } from '..';
import type {
	IncomingFile,
	UploadResponse,
	WebResourceHandler,
	MultipartUploadParameters,
	MultipartUploadTokenPayload,
	MultipartUploadBody,
	MultipartUploadResponse,
	UploadUrl,
} from '..';
import {
	S3Client,
	type S3ClientConfig,
	DeleteObjectCommand,
	type PutObjectCommandInput,
	GetObjectCommand,
	CreateMultipartUploadCommand,
	UploadPartCommand,
	CompleteMultipartUploadCommand,
	HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { randomUUID } from 'crypto';
import type { WebResourceType as WebResource } from '@balena/sbvr-types';
import memoize from 'memoizee';
import jsonwebtoken from 'jsonwebtoken';

export interface S3HandlerProps {
	region: string;
	accessKey: string;
	secretKey: string;
	endpoint: string;
	bucket: string;
	jwtSigningKey: string;
	maxSize?: number;
	signedUrlExpireTimeSeconds?: number;
	signedUrlCacheExpireTimeSeconds?: number;
}

export class S3Handler implements WebResourceHandler {
	private readonly config: S3ClientConfig;
	private readonly bucket: string;
	private readonly maxFileSize: number;
	private readonly jwtSigningKey: string;

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
		this.jwtSigningKey = config.jwtSigningKey;

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
		const key = this.getFileKey(resource.fieldname, resource.originalname);
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

	public async getUpload(
		uploadParameters: MultipartUploadParameters,
		metadata: MultipartUploadBody,
	): Promise<MultipartUploadResponse> {
		const fileKey = this.getFileKey(
			uploadParameters.fieldName,
			metadata.filename,
		);

		const createMultiPartResponse = await this.client.send(
			new CreateMultipartUploadCommand({
				Bucket: this.bucket,
				Key: fileKey,
				ContentType: metadata.content_type,
			}),
		);

		if (createMultiPartResponse.UploadId == null) {
			throw new WebResourceError('Failed to create multipart upload.');
		}

		const [token, uploadUrls] = await Promise.all([
			this.generateMetadataJwt(
				fileKey,
				createMultiPartResponse.UploadId,
				metadata.filename,
				uploadParameters,
			),
			this.getPartUploadUrls(
				fileKey,
				createMultiPartResponse.UploadId,
				metadata,
			),
		]);
		return { token, uploadUrls };
	}

	public async decodeUploadToken(
		token: string,
	): Promise<MultipartUploadTokenPayload> {
		return jsonwebtoken.verify(
			token,
			this.jwtSigningKey,
			// This cast is necessary because verify typing is string | AnyObject
			// We know this is a MultipartUploadTokenPayload as the only place where it is
			// signed is in generateMetadataJwt
		) as MultipartUploadTokenPayload;
	}

	public async commitUpload(
		{ fileKey, uploadId, filename }: MultipartUploadTokenPayload,
		additionalCommitInfo?: any,
	): Promise<WebResource> {
		await this.client.send(
			new CompleteMultipartUploadCommand({
				Bucket: this.bucket,
				Key: fileKey,
				UploadId: uploadId,
				MultipartUpload: additionalCommitInfo,
			}),
		);

		const headResult = await this.client.send(
			new HeadObjectCommand({
				Bucket: this.bucket,
				Key: fileKey,
			}),
		);

		return {
			href: this.getS3URL(fileKey),
			filename: filename,
			size: headResult.ContentLength,
			content_type: headResult.ContentType,
		};
	}

	private async getPartUploadUrls(
		fileKey: string,
		uploadId: string,
		metadata: MultipartUploadBody,
	): Promise<UploadUrl[]> {
		// TODO: validate metadata.size according to something...
		// TODO: move me to an env var or smth, maybe default to file size if smaller than X mb first...
		const finalChunkSize = metadata.chunkSize ?? 20 * 1024 * 1024; // 20MB
		const chunkSizesWithParts = await this.getChunkSizesWithParts(
			metadata.size,
			finalChunkSize,
		);
		return Promise.all(
			chunkSizesWithParts.map(async ({ chunkSize, partNumber }) => ({
				chunkSize,
				partNumber,
				url: await this.getPartUploadUrl(
					fileKey,
					uploadId,
					partNumber,
					chunkSize,
				),
			})),
		);
	}

	private async getPartUploadUrl(
		fileKey: string,
		uploadId: string,
		partNumber: number,
		partSize: number,
	): Promise<string> {
		const command = new UploadPartCommand({
			Bucket: this.bucket,
			Key: fileKey,
			UploadId: uploadId,
			PartNumber: partNumber,
			ContentLength: partSize,
		});

		return getSignedUrl(this.client, command, {
			expiresIn: this.signedUrlExpireTimeSeconds,
		});
	}

	private async generateMetadataJwt(
		fileKey: string,
		uploadId: string,
		filename: string,
		uploadParameters: MultipartUploadParameters,
	): Promise<string> {
		return jsonwebtoken.sign(
			{
				fileKey,
				uploadId,
				filename,
				uploadParameters,
			},
			this.jwtSigningKey,
			{
				expiresIn: this.signedUrlExpireTimeSeconds,
			},
		);
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

	private getFileKey(fieldName: string, fileName: string) {
		return `${fieldName}_${randomUUID()}_${fileName}`;
	}

	private async getChunkSizesWithParts(
		size: number,
		chunkSize: number,
	): Promise<Array<Pick<UploadUrl, 'chunkSize' | 'partNumber'>>> {
		const chunkSizesWithParts = [];
		let partNumber = 1;
		let remainingSize = size;
		while (remainingSize > 0) {
			const currentChunkSize = Math.min(remainingSize, chunkSize);
			chunkSizesWithParts.push({ chunkSize: currentChunkSize, partNumber });
			remainingSize -= currentChunkSize;
			partNumber += 1;
		}
		return chunkSizesWithParts;
	}
}
