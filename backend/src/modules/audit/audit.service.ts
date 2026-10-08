import { Injectable, Logger } from '@nestjs/common';
import { AuditEventType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ListAuditQuery } from './dto/list-audit.query';

export interface AuditInput {
  type: AuditEventType;
  actorUserId?: string | null;
  shareId?: string | null;
  fileId?: string | null;
  noteId?: string | null;
  recipientSessionId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue;
}

/** Owner-facing activity entry: useful signal, no internal identifiers. */
export interface ActivityItem {
  id: string;
  type: AuditEventType;
  createdAt: Date;
  filename: string | null;
  reason: string | null;
  ip: string | null;
}

const reasonOf = (metadata: Prisma.JsonValue | null): string | null => {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    const reason = (metadata as { reason?: unknown }).reason;
    if (typeof reason === 'string') return reason;
  }
  return null;
};

/**
 * Append-only audit trail. Auditing must never break the main flow, so
 * failures are logged and swallowed.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditInput): Promise<void> {
    try {
      await this.prisma.auditEvent.create({
        data: {
          type: input.type,
          actorUserId: input.actorUserId ?? null,
          shareId: input.shareId ?? null,
          fileId: input.fileId ?? null,
          noteId: input.noteId ?? null,
          recipientSessionId: input.recipientSessionId ?? null,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
          metadata: input.metadata,
        },
      });
    } catch (error) {
      this.logger.error(`audit write failed (${input.type}): ${(error as Error).message}`);
    }
  }

  /** Activity the owner is entitled to: their own actions plus events on their files/shares. */
  async listForOwner(
    userId: string,
    query: ListAuditQuery,
  ): Promise<{ items: ActivityItem[]; hasMore: boolean }> {
    const where: Prisma.AuditEventWhereInput = {
      ...(query.type ? { type: query.type } : {}),
      OR: [
        { actorUserId: userId },
        { share: { ownerId: userId } },
        { file: { ownerId: userId } },
        { note: { ownerId: userId } },
      ],
    };

    const [events, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        include: {
          file: { select: { originalFilename: true } },
          note: { select: { title: true } },
          share: {
            select: {
              file: { select: { originalFilename: true } },
              note: { select: { title: true } },
            },
          },
        },
      }),
      this.prisma.auditEvent.count({ where }),
    ]);

    return {
      items: events.map((event) => ({
        id: event.id,
        type: event.type,
        createdAt: event.createdAt,
        filename:
          event.file?.originalFilename ??
          event.note?.title ??
          event.share?.file?.originalFilename ??
          event.share?.note?.title ??
          null,
        reason: reasonOf(event.metadata),
        ip: event.ip,
      })),
      hasMore: total > events.length,
    };
  }
}
