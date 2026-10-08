import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequestContext } from '../../common/request-context';
import { fail } from '../../common/api-response';
import { ERROR_CODES } from '../../common/error-codes';
import { hashPassword } from '../../security/password';
import { generateToken, hashToken } from '../../security/tokens';
import { toPublicShare, toPublicShareListItem } from './share.presenter';
import { CreateShareDto } from './dto/create-share.dto';

@Injectable()
export class SharesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(ownerId: string, dto: CreateShareDto, context: RequestContext) {
    if ((dto.fileId && dto.noteId) || (!dto.fileId && !dto.noteId)) {
      throw new HttpException(fail(ERROR_CODES.VALIDATION_FAILED), 400);
    }

    let target: { fileId: string | null; noteId: string | null };
    if (dto.fileId) {
      const file = await this.prisma.file.findFirst({
        where: { id: dto.fileId, ownerId, deletedAt: null },
      });
      if (!file) {
        throw new HttpException(fail(ERROR_CODES.NOT_FOUND), 404);
      }
      target = { fileId: file.id, noteId: null };
    } else {
      const note = await this.prisma.note.findFirst({
        where: { id: dto.noteId!, ownerId, deletedAt: null },
      });
      if (!note) {
        throw new HttpException(fail(ERROR_CODES.NOT_FOUND), 404);
      }
      target = { fileId: null, noteId: note.id };
    }

    const oneTime = dto.oneTime ?? false;
    const token = generateToken(32);
    const passwordHash = dto.password ? await hashPassword(dto.password) : null;

    const share = await this.prisma.share.create({
      data: {
        ...target,
        ownerId,
        tokenHash: hashToken(token),
        expiresAt: dto.expiresInSeconds != null ? new Date(Date.now() + dto.expiresInSeconds * 1000) : null,
        allowDownload: dto.allowDownload ?? true,
        maxAccesses: oneTime ? 1 : (dto.maxAccesses ?? null),
        passwordHash,
        oneTime,
        strict: dto.strict ?? false,
      },
    });

    await this.audit.record({
      type: 'SHARE_CREATED',
      actorUserId: ownerId,
      shareId: share.id,
      fileId: share.fileId,
      noteId: share.noteId,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: {
        hasPassword: passwordHash !== null,
        allowDownload: share.allowDownload,
        oneTime: share.oneTime,
        strict: share.strict,
        expiresAt: share.expiresAt?.toISOString() ?? null,
        maxAccesses: share.maxAccesses,
      },
    });

    return toPublicShare(share, token);
  }

  async list(ownerId: string) {
    const shares = await this.prisma.share.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        file: { select: { originalFilename: true, sizeBytes: true, deletedAt: true } },
        note: { select: { title: true, content: true, deletedAt: true } },
      },
    });
    return { items: shares.map(toPublicShareListItem) };
  }

  async revoke(ownerId: string, shareId: string, context: RequestContext) {
    const share = await this.prisma.share.findFirst({ where: { id: shareId, ownerId } });
    if (!share) {
      throw new HttpException(fail(ERROR_CODES.NOT_FOUND), 404);
    }
    if (share.revokedAt) {
      return { id: share.id, revoked: true };
    }

    await this.prisma.$transaction([
      this.prisma.share.update({ where: { id: share.id }, data: { revokedAt: new Date() } }),
      this.prisma.recipientSession.updateMany({
        where: { shareId: share.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.audit.record({
      type: 'SHARE_REVOKED',
      actorUserId: ownerId,
      shareId: share.id,
      fileId: share.fileId,
      noteId: share.noteId,
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return { id: share.id, revoked: true };
  }
}
