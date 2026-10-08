import { HttpException, Inject, Injectable } from '@nestjs/common';
import { File, Share } from '@prisma/client';
import type { Readable } from 'node:stream';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { RequestContext } from '../../common/request-context';
import { fail } from '../../common/api-response';
import { ERROR_CODES } from '../../common/error-codes';
import { verifyPassword } from '../../security/password';
import { generateToken, hashToken } from '../../security/tokens';
import { AppConfig } from '../../config/configuration';
import { APP_CONFIG } from '../../config/tokens';
import { OpenShareDto } from './dto/open-share.dto';
import { DownloadShareDto } from './dto/download-share.dto';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,120}$/;

type ShareWithFile = Share & { file: File };

export interface OpenedShare {
  file: { filename: string; mimeType: string; sizeBytes: number; checksum: string };
  share: {
    expiresAt: Date | null;
    allowDownload: boolean;
    maxAccesses: number | null;
    accessCount: number;
    strict: boolean;
    oneTime: boolean;
    hasPassword: boolean;
  };
  session: { secret: string; expiresAt: Date };
}

export interface ShareInspection {
  file: { filename: string; mimeType: string; sizeBytes: number; checksum: string };
  share: OpenedShare['share'];
  requiresPassword: boolean;
}

export interface DownloadResult {
  filename: string;
  sizeBytes: number;
  body: Readable;
}

@Injectable()
export class PublicSharesService {
  private readonly recipientTtlSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
    @Inject(APP_CONFIG) config: AppConfig,
  ) {
    this.recipientTtlSeconds = config.tokens.recipientTtlSeconds;
  }

  async open(dto: OpenShareDto, context: RequestContext): Promise<OpenedShare | ShareInspection> {
    if (dto.inspect) {
      return this.inspect(dto.token);
    }

    if (!TOKEN_PATTERN.test(dto.token)) {
      throw new HttpException(fail(ERROR_CODES.SHARE_INVALID), 404);
    }

    const tokenHash = hashToken(dto.token);
    const share = await this.prisma.share.findUnique({
      where: { tokenHash },
      include: { file: true },
    });

    if (!share || share.file.deletedAt !== null) {
      throw new HttpException(fail(ERROR_CODES.SHARE_INVALID), 404);
    }

    if (dto.sessionSecret) {
      return this.restore(share, dto.sessionSecret, context);
    }

    if (share.revokedAt) {
      throw new HttpException(fail(ERROR_CODES.SHARE_REVOKED), 410);
    }
    if (share.consumedAt) {
      throw new HttpException(fail(ERROR_CODES.SHARE_CONSUMED), 410);
    }
    if (share.expiresAt && share.expiresAt.getTime() <= Date.now()) {
      throw new HttpException(fail(ERROR_CODES.SHARE_EXPIRED), 410);
    }

    if (share.passwordHash) {
      if (!dto.password) {
        throw new HttpException(fail(ERROR_CODES.SHARE_PASSWORD_REQUIRED), 403);
      }
      const valid = await verifyPassword(dto.password, share.passwordHash);
      if (!valid) {
        throw new HttpException(fail(ERROR_CODES.SHARE_PASSWORD_INVALID), 403);
      }
    }

    const claim = await this.claimAccess(share.id, share.maxAccesses, share.oneTime);
    if (!claim) {
      const current = await this.prisma.share.findUnique({ where: { id: share.id } });
      throw new HttpException(fail(this.limitErrorCode(current, share.maxAccesses)), 410);
    }

    const secret = generateToken(32);
    const sessionExpiry = this.sessionExpiry(share.expiresAt);

    await this.prisma.recipientSession.create({
      data: {
        shareId: share.id,
        tokenHash: hashToken(secret),
        expiresAt: sessionExpiry,
        ip: context.ip,
        userAgent: context.userAgent,
      },
    });

    await this.audit.record({
      type: 'RECIPIENT_SESSION_CREATED',
      shareId: share.id,
      fileId: share.fileId,
      ip: context.ip,
      userAgent: context.userAgent,
    });
    await this.audit.record({
      type: 'SHARE_OPENED',
      shareId: share.id,
      fileId: share.fileId,
      ip: context.ip,
      userAgent: context.userAgent,
    });

    const refreshed = (await this.prisma.share.findUnique({ where: { id: share.id } })) ?? share;

    return {
      file: this.authorizedFile(share.file),
      share: this.shareRules(refreshed),
      session: { secret, expiresAt: sessionExpiry },
    };
  }

  /**
   * Metadata-only preview used by the recipient screen: same validation as a
   * real open, but no session is created and no access is consumed.
   */
  async inspect(token: string): Promise<ShareInspection> {
    if (!TOKEN_PATTERN.test(token)) {
      throw new HttpException(fail(ERROR_CODES.SHARE_INVALID), 404);
    }

    const share = await this.prisma.share.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { file: true },
    });

    if (!share || share.file.deletedAt !== null) {
      throw new HttpException(fail(ERROR_CODES.SHARE_INVALID), 404);
    }
    if (share.revokedAt) {
      throw new HttpException(fail(ERROR_CODES.SHARE_REVOKED), 410);
    }
    if (share.consumedAt) {
      throw new HttpException(fail(ERROR_CODES.SHARE_CONSUMED), 410);
    }
    if (share.expiresAt && share.expiresAt.getTime() <= Date.now()) {
      throw new HttpException(fail(ERROR_CODES.SHARE_EXPIRED), 410);
    }

    return {
      file: this.authorizedFile(share.file),
      share: this.shareRules(share),
      requiresPassword: share.passwordHash !== null,
    };
  }

  private async restore(
    share: ShareWithFile,
    sessionSecret: string,
    context: RequestContext,
  ): Promise<OpenedShare> {
    // Share state is checked first so a revoked link answers "revoked" instead
    // of a confusing session error (revocation cascades to sessions).
    if (share.revokedAt || share.file.deletedAt !== null) {
      throw new HttpException(fail(ERROR_CODES.SHARE_REVOKED), 410);
    }
    if (share.expiresAt && share.expiresAt.getTime() <= Date.now()) {
      throw new HttpException(fail(ERROR_CODES.SHARE_EXPIRED), 410);
    }

    const session = await this.prisma.recipientSession.findUnique({
      where: { tokenHash: hashToken(sessionSecret) },
    });

    if (!session || session.shareId !== share.id || session.revokedAt) {
      await this.denied('session_invalid', share, context);
      throw new HttpException(fail(ERROR_CODES.RECIPIENT_SESSION_INVALID), 401);
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      await this.denied('session_expired', share, context, session.id);
      throw new HttpException(fail(ERROR_CODES.RECIPIENT_SESSION_EXPIRED), 401);
    }

    await this.enforceBinding(share, session, context);

    await this.prisma.recipientSession.update({
      where: { id: session.id },
      data: { lastAccessAt: new Date(), ip: context.ip, userAgent: context.userAgent },
    });

    await this.audit.record({
      type: 'SHARE_OPENED',
      shareId: share.id,
      fileId: share.fileId,
      recipientSessionId: session.id,
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return {
      file: this.authorizedFile(share.file),
      share: this.shareRules(share),
      session: { secret: sessionSecret, expiresAt: session.expiresAt },
    };
  }

  /**
   * Phase 8: IP is a risk signal, never an identity. On strict shares an
   * environment change forces re-authentication; on normal shares the new IP
   * is recorded and the change audited without blocking the recipient.
   */
  private async enforceBinding(
    share: ShareWithFile,
    session: { id: string; ip: string | null },
    context: RequestContext,
  ): Promise<void> {
    const changed = Boolean(context.ip && session.ip && session.ip !== context.ip);
    if (!changed) return;

    if (share.strict) {
      await this.audit.record({
        type: 'SESSION_CHANGED',
        shareId: share.id,
        fileId: share.fileId,
        recipientSessionId: session.id,
        ip: context.ip,
        userAgent: context.userAgent,
        metadata: { reason: 'strict_environment_change' },
      });
      throw new HttpException(fail(ERROR_CODES.REAUTHENTICATION_REQUIRED), 401);
    }

    await this.prisma.recipientSession.update({
      where: { id: session.id },
      data: { ip: context.ip },
    });
    await this.audit.record({
      type: 'SESSION_CHANGED',
      shareId: share.id,
      fileId: share.fileId,
      recipientSessionId: session.id,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: { reason: 'ip_change', previousIp: session.ip },
    });
  }

  private async denied(
    reason: string,
    share: { id?: string; fileId?: string } | null,
    context: RequestContext,
    recipientSessionId?: string,
  ): Promise<void> {
    await this.audit.record({
      type: 'ACCESS_DENIED',
      shareId: share?.id ?? null,
      fileId: share?.fileId ?? null,
      recipientSessionId: recipientSessionId ?? null,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: { reason },
    });
  }

  /** Phase 9: authorized, streamed download — never a storage URL. */
  async download(dto: DownloadShareDto, context: RequestContext): Promise<DownloadResult> {
    if (!TOKEN_PATTERN.test(dto.token)) {
      await this.denied('malformed_token', null, context);
      throw new HttpException(fail(ERROR_CODES.SHARE_INVALID), 404);
    }

    const share = await this.prisma.share.findUnique({
      where: { tokenHash: hashToken(dto.token) },
      include: { file: true },
    });

    if (!share) {
      await this.denied('unknown_token', null, context);
      throw new HttpException(fail(ERROR_CODES.SHARE_INVALID), 404);
    }
    if (share.file.deletedAt !== null) {
      await this.denied('file_deleted', share, context);
      throw new HttpException(fail(ERROR_CODES.SHARE_INVALID), 404);
    }
    if (share.revokedAt) {
      await this.denied('revoked', share, context);
      throw new HttpException(fail(ERROR_CODES.SHARE_REVOKED), 410);
    }
    if (share.expiresAt && share.expiresAt.getTime() <= Date.now()) {
      await this.denied('expired', share, context);
      throw new HttpException(fail(ERROR_CODES.SHARE_EXPIRED), 410);
    }

    const session = dto.sessionSecret
      ? await this.prisma.recipientSession.findUnique({
          where: { tokenHash: hashToken(dto.sessionSecret) },
        })
      : null;

    if (!session || session.shareId !== share.id || session.revokedAt) {
      await this.denied('session_invalid', share, context, session?.id);
      throw new HttpException(fail(ERROR_CODES.RECIPIENT_SESSION_INVALID), 401);
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      await this.denied('session_expired', share, context, session.id);
      throw new HttpException(fail(ERROR_CODES.RECIPIENT_SESSION_EXPIRED), 401);
    }
    if (!share.allowDownload) {
      await this.denied('download_not_allowed', share, context, session.id);
      throw new HttpException(fail(ERROR_CODES.DOWNLOAD_NOT_ALLOWED), 403);
    }

    await this.enforceBinding(share, session, context);

    const { body } = await this.storage.getObjectStream(share.file.storageKey);

    try {
      await this.prisma.$transaction([
        this.prisma.share.update({
          where: { id: share.id },
          data: { downloadCount: { increment: 1 } },
        }),
        this.prisma.recipientSession.update({
          where: { id: session.id },
          data: { lastAccessAt: new Date(), ip: context.ip, userAgent: context.userAgent },
        }),
      ]);
    } catch (error) {
      body.destroy();
      throw error;
    }

    await this.audit.record({
      type: 'SHARE_DOWNLOADED',
      shareId: share.id,
      fileId: share.fileId,
      recipientSessionId: session.id,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: { filename: share.file.originalFilename, sizeBytes: share.file.sizeBytes },
    });

    return {
      filename: share.file.originalFilename,
      sizeBytes: share.file.sizeBytes,
      body,
    };
  }

  /**
   * Single atomic UPDATE guards revocation, consumption, expiry and the access
   * limit at once, so two simultaneous opens cannot both win the last slot.
   */
  private async claimAccess(
    shareId: string,
    maxAccesses: number | null,
    oneTime: boolean,
  ): Promise<boolean> {
    const now = new Date();
    const updated = await this.prisma.share.updateMany({
      where: {
        id: shareId,
        revokedAt: null,
        consumedAt: null,
        OR: [{ expiresAt: { gt: now } }, { expiresAt: null }],
        ...(maxAccesses !== null ? { accessCount: { lt: maxAccesses } } : {}),
      },
      data: {
        accessCount: { increment: 1 },
        ...(oneTime ? { consumedAt: now } : {}),
      },
    });
    return updated.count === 1;
  }

  private limitErrorCode(share: { revokedAt: Date | null; consumedAt: Date | null; expiresAt: Date | null } | null, maxAccesses: number | null) {
    if (share?.revokedAt) return ERROR_CODES.SHARE_REVOKED;
    if (share?.consumedAt) return ERROR_CODES.SHARE_CONSUMED;
    if (share?.expiresAt && share.expiresAt.getTime() <= Date.now()) return ERROR_CODES.SHARE_EXPIRED;
    if (maxAccesses !== null) return ERROR_CODES.SHARE_ACCESS_LIMIT_REACHED;
    return ERROR_CODES.SHARE_INVALID;
  }

  private sessionExpiry(shareExpiresAt: Date | null): Date {
    const hardLimit = new Date(Date.now() + this.recipientTtlSeconds * 1000);
    if (shareExpiresAt && shareExpiresAt.getTime() < hardLimit.getTime()) {
      return shareExpiresAt;
    }
    return hardLimit;
  }

  private authorizedFile(file: File): OpenedShare['file'] {
    return {
      filename: file.originalFilename,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      checksum: file.checksum,
    };
  }

  private shareRules(share: Share): OpenedShare['share'] {
    return {
      expiresAt: share.expiresAt,
      allowDownload: share.allowDownload,
      maxAccesses: share.maxAccesses,
      accessCount: share.accessCount,
      strict: share.strict,
      oneTime: share.oneTime,
      hasPassword: share.passwordHash !== null,
    };
  }
}
