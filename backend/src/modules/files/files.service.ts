import { HttpException, Inject, Injectable, Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { rm } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { RequestContext } from '../../common/request-context';
import { fail } from '../../common/api-response';
import { ERROR_CODES } from '../../common/error-codes';
import { isAllowedMime, normalizeMime, sanitizeFilename } from '../../security/upload-policy';
import { AppConfig } from '../../config/configuration';
import { APP_CONFIG } from '../../config/tokens';
import { toPublicFile } from './file.presenter';

const sha256File = async (filePath: string): Promise<string> => {
  const hash = createHash('sha256');
  await pipeline(createReadStream(filePath), hash);
  return hash.digest('hex');
};

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly maxBytes: number;
  private readonly allowedMime: readonly string[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    @Inject(APP_CONFIG) config: AppConfig,
  ) {
    this.maxBytes = config.upload.maxBytes;
    this.allowedMime = config.upload.allowedMime;
  }

  async upload(ownerId: string, file: Express.Multer.File | undefined, context: RequestContext) {
    if (!file || typeof file.path !== 'string' || file.path.length === 0) {
      throw new HttpException(fail(ERROR_CODES.VALIDATION_FAILED), 400);
    }

    // Defense in depth: multer already enforced this limit while streaming.
    if (!Number.isFinite(file.size) || file.size <= 0 || file.size > this.maxBytes) {
      throw new HttpException(fail(ERROR_CODES.FILE_TOO_LARGE), 413);
    }

    const nameResult = sanitizeFilename(file.originalname);
    if (!nameResult.ok) {
      throw new HttpException(fail(ERROR_CODES.VALIDATION_FAILED), 400);
    }

    const mimeType = normalizeMime(file.mimetype ?? '');
    if (!isAllowedMime(mimeType, this.allowedMime)) {
      throw new HttpException(fail(ERROR_CODES.FILE_TYPE_NOT_ALLOWED), 415);
    }

    try {
      const checksum = await sha256File(file.path);

      // Server-generated key: owner id + server id, never user input.
      const fileId = randomUUID();
      const storageKey = `${ownerId}/${fileId}`;

      try {
        await this.storage.putFile(storageKey, file.path, file.size, mimeType);
      } catch (error) {
        this.logger.error(`Storage write failed for owner ${ownerId}: ${(error as Error).message}`);
        throw new HttpException(fail(ERROR_CODES.STORAGE_ERROR), 503);
      }

      let record;
      try {
        record = await this.prisma.file.create({
          data: {
            id: fileId,
            ownerId,
            originalFilename: nameResult.value,
            mimeType,
            sizeBytes: file.size,
            storageKey,
            checksum,
          },
        });
      } catch (error) {
        // No database row → no storage object either.
        await this.storage.deleteObject(storageKey);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new HttpException(fail(ERROR_CODES.CONFLICT), 409);
        }
        throw error;
      }

      await this.audit.record({
        type: 'FILE_UPLOADED',
        actorUserId: ownerId,
        fileId: record.id,
        ip: context.ip,
        userAgent: context.userAgent,
        metadata: { sizeBytes: record.sizeBytes, mimeType: record.mimeType },
      });

      return toPublicFile(record);
    } finally {
      await rm(file.path, { force: true }).catch((error: Error) =>
        this.logger.warn(`Could not remove temp file: ${error.message}`),
      );
    }
  }
}
