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
import { isAllowedMime, normalizeMime, sanitizeFilename, sniffUpload } from '../../security/upload-policy';
import { checkArchiveExpansion } from '../../security/archive-policy';
import { AppConfig } from '../../config/configuration';
import { APP_CONFIG } from '../../config/tokens';
import { RedisService } from '../../database/redis.service';
import { toPublicFile } from './file.presenter';
import { ListFilesQuery } from './dto/list-files.query';

/** Safety TTL for the per-user upload slot key (crash recovery). */
const UPLOAD_SLOT_TTL_SECONDS = 300;

const sha256File = async (filePath: string): Promise<string> => {
  const hash = createHash('sha256');
  await pipeline(createReadStream(filePath), hash);
  return hash.digest('hex');
};

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly maxBytes: number;
  private readonly maxUncompressedBytes: number;
  private readonly maxConcurrentPerUser: number;
  private readonly allowedMime: readonly string[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly redis: RedisService,
    @Inject(APP_CONFIG) config: AppConfig,
  ) {
    this.maxBytes = config.upload.maxBytes;
    this.allowedMime = config.upload.allowedMime;
    this.maxUncompressedBytes = config.upload.maxUncompressedBytes;
    this.maxConcurrentPerUser = config.upload.maxConcurrentPerUser;
  }

  async list(ownerId: string, query: ListFilesQuery) {
    const where = { ownerId, deletedAt: null };
    const [total, rows] = await Promise.all([
      this.prisma.file.count({ where }),
      this.prisma.file.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      items: rows.map(toPublicFile),
      page: query.page,
      pageSize: query.pageSize,
      total,
      hasMore: query.page * query.pageSize < total,
    };
  }

  async getOwned(ownerId: string, fileId: string) {
    const file = await this.findOwned(ownerId, fileId);
    return toPublicFile(file);
  }

  async remove(ownerId: string, fileId: string, context: RequestContext) {
    const file = await this.findOwned(ownerId, fileId);

    await this.prisma.$transaction([
      this.prisma.file.update({ where: { id: file.id }, data: { deletedAt: new Date() } }),
      this.prisma.share.updateMany({
        where: { fileId: file.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.storage.deleteObject(file.storageKey);

    await this.audit.record({
      type: 'FILE_DELETED',
      actorUserId: ownerId,
      fileId: file.id,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: { sizeBytes: file.sizeBytes, mimeType: file.mimeType },
    });

    return { id: file.id, deleted: true };
  }

  private async findOwned(ownerId: string, fileId: string) {
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, ownerId, deletedAt: null },
    });
    if (!file) {
      throw new HttpException(fail(ERROR_CODES.NOT_FOUND), 404);
    }
    return file;
  }

  async upload(ownerId: string, file: Express.Multer.File | undefined, context: RequestContext) {
    if (!file || typeof file.path !== 'string' || file.path.length === 0) {
      throw new HttpException(fail(ERROR_CODES.VALIDATION_FAILED), 400);
    }

    // Per-user concurrency slot: bounds simultaneous storage writes per account.
    const slotKey = `upload:active:${ownerId}`;
    const active = await this.redis.incr(slotKey, UPLOAD_SLOT_TTL_SECONDS);
    if (active > this.maxConcurrentPerUser) {
      await this.redis.decr(slotKey);
      throw new HttpException(fail(ERROR_CODES.RATE_LIMITED), 429);
    }

    try {
      return await this.performUpload(ownerId, file, context);
    } finally {
      await this.redis.decr(slotKey).catch((error: Error) =>
        this.logger.warn(`Could not release upload slot for ${ownerId}: ${error.message}`),
      );
    }
  }

  private async performUpload(ownerId: string, file: Express.Multer.File, context: RequestContext) {
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

    const sniff = await sniffUpload(file.path, mimeType);
    if (!sniff.ok) {
      throw new HttpException(fail(ERROR_CODES.FILE_TYPE_NOT_ALLOWED), 415);
    }

    const archive = await checkArchiveExpansion(file.path, mimeType, this.maxUncompressedBytes);
    if (!archive.ok) {
      this.logger.warn(`Archive rejected for owner ${ownerId}: ${archive.reason ?? 'expansion limit'}`);
      throw new HttpException(fail(ERROR_CODES.FILE_TOO_LARGE), 413);
    }

    try {
      const checksum = await sha256File(file.path);
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
