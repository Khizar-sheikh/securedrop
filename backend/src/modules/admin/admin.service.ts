import { HttpException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequestContext } from '../../common/request-context';
import { fail } from '../../common/api-response';
import { ERROR_CODES } from '../../common/error-codes';
import { toPublicUser } from '../users/user.presenter';
import { ListUsersQuery } from './dto/list-users.query';
import { ListAdminSharesQuery } from './dto/list-admin-shares.query';
import { ListAdminAuditQuery } from './dto/list-admin-audit.query';

export type AdminShareStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'CONSUMED';

const shareStatus = (share: {
  revokedAt: Date | null;
  consumedAt: Date | null;
  expiresAt: Date | null;
}): AdminShareStatus => {
  if (share.revokedAt) return 'REVOKED';
  if (share.consumedAt) return 'CONSUMED';
  if (share.expiresAt && share.expiresAt.getTime() <= Date.now()) return 'EXPIRED';
  return 'ACTIVE';
};

/**
 * Administrative oversight over users, shares, and the audit trail.
 * Metadata only — never file content, storage keys, link tokens, or password
 * hashes. Every mutating action is recorded in the audit trail.
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async metrics() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [users, disabledUsers, files, activeShares, recentEvents] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'DISABLED' } }),
      this.prisma.file.count({ where: { deletedAt: null } }),
      this.prisma.share.count({
        where: { revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      }),
      this.prisma.auditEvent.count({ where: { createdAt: { gte: since } } }),
    ]);
    return { users, disabledUsers, files, activeShares, recentEvents };
  }

  async listUsers(query: ListUsersQuery) {
    const search = query.query?.trim().toLowerCase();
    const where: Prisma.UserWhereInput = search
      ? { email: { contains: search, mode: 'insensitive' } }
      : {};

    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, status: true, role: true, createdAt: true },
      }),
    ]);

    return {
      items: rows.map((row) => ({ ...row, status: String(row.status), role: String(row.role) })),
      page: query.page,
      pageSize: query.pageSize,
      total,
      hasMore: query.page * query.pageSize < total,
    };
  }

  /** Suspends or reactivates an account. Suspension blocks access immediately. */
  async setUserStatus(
    userId: string,
    status: 'ACTIVE' | 'DISABLED',
    actorId: string,
    context: RequestContext,
  ) {
    if (userId === actorId && status === 'DISABLED') {
      throw new HttpException(fail(ERROR_CODES.CONFLICT), 409);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new HttpException(fail(ERROR_CODES.NOT_FOUND), 404);
    }

    if (user.status !== status) {
      await this.prisma.user.update({ where: { id: userId }, data: { status } });
      await this.audit.record({
        type: status === 'DISABLED' ? 'USER_SUSPENDED' : 'USER_REACTIVATED',
        actorUserId: actorId,
        ip: context.ip,
        userAgent: context.userAgent,
        metadata: { targetUserId: userId, targetEmail: user.email },
      });
    }

    const updated = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, status: true, role: true, createdAt: true },
    });
    return toPublicUser(updated);
  }

  /** Share metadata for oversight. Tokens and content never leave the server. */
  async listShares(query: ListAdminSharesQuery) {
    const now = new Date();
    // Mirrors shareStatus(): revoked > consumed > expired > active.
    const statusWhere: Record<AdminShareStatus, Prisma.ShareWhereInput> = {
      ACTIVE: {
        revokedAt: null,
        consumedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      REVOKED: { revokedAt: { not: null } },
      CONSUMED: { revokedAt: null, consumedAt: { not: null } },
      EXPIRED: {
        revokedAt: null,
        consumedAt: null,
        AND: { expiresAt: { lte: now } },
      },
    };
    const where: Prisma.ShareWhereInput = query.status ? statusWhere[query.status] : {};

    const [total, rows] = await Promise.all([
      this.prisma.share.count({ where }),
      this.prisma.share.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { email: true } },
          file: { select: { originalFilename: true } },
          note: { select: { title: true } },
        },
      }),
    ]);

    const items = rows.map((row) => ({
      id: row.id,
      kind: row.fileId ? ('file' as const) : ('note' as const),
      label: row.file?.originalFilename ?? row.note?.title ?? null,
      ownerEmail: row.owner.email,
      status: shareStatus(row),
      expiresAt: row.expiresAt,
      maxAccesses: row.maxAccesses,
      accessCount: row.accessCount,
      downloadCount: row.downloadCount,
      allowDownload: row.allowDownload,
      hasPassword: row.passwordHash !== null,
      oneTime: row.oneTime,
      createdAt: row.createdAt,
    }));

    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      hasMore: query.page * query.pageSize < total,
    };
  }

  /** Revokes an abusive share. Idempotent: an already-revoked share is unchanged. */
  async revokeShare(shareId: string, actorId: string, context: RequestContext) {
    const share = await this.prisma.share.findUnique({ where: { id: shareId } });
    if (!share) {
      throw new HttpException(fail(ERROR_CODES.NOT_FOUND), 404);
    }

    if (!share.revokedAt) {
      await this.prisma.$transaction([
        this.prisma.share.update({ where: { id: shareId }, data: { revokedAt: new Date() } }),
        this.prisma.recipientSession.updateMany({
          where: { shareId, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      ]);
      await this.audit.record({
        type: 'SHARE_REVOKED_BY_ADMIN',
        actorUserId: actorId,
        shareId,
        ip: context.ip,
        userAgent: context.userAgent,
        metadata: { ownerId: share.ownerId },
      });
    }

    return { id: shareId, revoked: true };
  }

  /** Server-side searchable audit trail. Internal fields only, no content. */
  async listAudit(query: ListAdminAuditQuery) {
    const search = query.query?.trim().toLowerCase();
    const where: Prisma.AuditEventWhereInput = {
      ...(query.type ? { type: query.type } : {}),
      ...(search ? { actor: { email: { contains: search, mode: 'insensitive' } } } : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.auditEvent.count({ where }),
      this.prisma.auditEvent.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { email: true } } },
      }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        type: String(row.type),
        actorEmail: row.actor?.email ?? null,
        ip: row.ip,
        metadata: row.metadata,
        createdAt: row.createdAt,
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
      hasMore: query.page * query.pageSize < total,
    };
  }
}
