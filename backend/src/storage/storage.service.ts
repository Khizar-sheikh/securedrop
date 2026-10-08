import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  CreateBucketCommand,
  HeadBucketCommand,
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

  /** Maps storage failures to a safe API error. */
  static failure(): ApiFailure {
    return fail(ERROR_CODES.STORAGE_ERROR);
  }
}
