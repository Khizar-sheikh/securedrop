import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import type { Readable } from 'node:stream';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { AppConfig } from '../config/configuration';
import { APP_CONFIG } from '../config/tokens';
import { ERROR_CODES } from '../common/error-codes';
import { ApiFailure, fail } from '../common/api-response';

/**
 * Private object storage access. Storage credentials never leave the server
 * and no storage URL is ever handed to a client — the backend streams files.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.bucket = config.storage.bucket;
    this.client = new S3Client({
      endpoint: config.storage.endpoint,
      region: config.storage.region,
      forcePathStyle: config.storage.forcePathStyle,
      credentials: {
        accessKeyId: config.storage.accessKey,
        secretAccessKey: config.storage.secretKey,
      },
    });
  }

  /** Makes sure the private bucket exists (idempotent). */
  async onModuleInit(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Created private bucket "${this.bucket}"`);
      } catch (error) {
        // Not fatal at boot: the health endpoint reports storage as down.
        this.logger.warn(`Could not create bucket "${this.bucket}": ${(error as Error).message}`);
      }
    }
  }

  /** Used by the health endpoint. */
  async ping(): Promise<void> {
    await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
  }

  getBucket(): string {
    return this.bucket;
  }

  /**
   * Streams a local temp file into private storage under a server-generated
   * key. Credentials and endpoint stay on the server.
   */
  async putFile(key: string, filePath: string, sizeBytes: number, contentType: string): Promise<void> {
    const body = createReadStream(filePath);
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentLength: sizeBytes,
          ContentType: contentType,
        }),
      );
    } finally {
      body.destroy();
    }
  }

  /** Returns object size, or null when the key does not exist. */
  async headObject(key: string): Promise<{ sizeBytes: number } | null> {
    try {
      const result = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return { sizeBytes: result.ContentLength ?? 0 };
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      const name = (error as { name?: string }).name;
      if (status === 404 || name === 'NotFound') return null;
      throw error;
    }
  }

  /**
   * Opens a private object for server-side streaming. The caller pipes it to
   * the client; no storage URL or credential is ever shared.
   */
  async getObjectStream(key: string): Promise<{ body: Readable }> {
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!result.Body) throw new Error('empty object body');
      return { body: result.Body as Readable };
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (status === 404) {
        this.logger.warn(`object missing for key ${key}`);
        throw StorageService.failure();
      }
      this.logger.warn(`could not read object: ${(error as Error).message}`);
      throw StorageService.failure();
    }
  }

  /** Best-effort cleanup used when a later step fails. */
  async deleteObject(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (error) {
      this.logger.warn(`Could not delete object "${key}": ${(error as Error).message}`);
    }
  }

  /** Maps storage failures to a safe API error. */
  static failure(): ApiFailure {
    return fail(ERROR_CODES.STORAGE_ERROR);
  }
}
