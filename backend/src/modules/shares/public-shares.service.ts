import { HttpException, Inject, Injectable } from '@nestjs/common';
import { File, Share } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequestContext } from '../../common/request-context';
import { fail } from '../../common/api-response';
import { ERROR_CODES } from '../../common/error-codes';
import { verifyPassword } from '../../security/password';
import { generateToken, hashToken } from '../../security/tokens';
import { AppConfig } from '../../config/configuration';
import { APP_CONFIG } from '../../config/tokens';
import { OpenShareDto } from './dto/open-share.dto';

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

@Injectable()
export class PublicSharesService {
  private readonly recipientTtlSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(APP_CONFIG) config: AppConfig,
  ) {
    this.recipientTtlSeconds = config.tokens.recipientTtlSeconds;
  }

  async open(dto: OpenShareDto, context: RequestContext): Promise<OpenedShare> {
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
    const now = new Date();
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

  private async restore(
    share: ShareWithFile,
    sessionSecret: string,
    context: RequestContext,
  ): Promise<OpenedShare> {
    const session = await this.prisma.recipientSession.findUnique({
      where: { tokenHash: hashToken(sessionSecret) },
    });

    if (!session || session.shareId !== share.id || session.revokedAt) {
      throw new HttpException(fail(ERROR_CODES.RECIPIENT_SESSION_INVALID), 401);
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      throw new HttpException(fail(ERROR_CODES.RECIPIENT_SESSION_EXPIRED), 401);
    }
    if (share.revokedAt || share.file.deletedAt !== null) {
      throw new HttpException(fail(ERROR_CODES.SHARE_REVOKED), 410);
    }
    if (share.expiresAt && share.expiresAt.getTime() <= Date.now()) {
      throw new HttpException(fail(ERROR_CODES.SHARE_EXPIRED), 410);
    }

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
