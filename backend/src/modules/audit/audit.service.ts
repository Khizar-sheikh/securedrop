import { Injectable, Logger } from '@nestjs/common';
import { AuditEventType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface AuditInput {
  type: AuditEventType;
  actorUserId?: string | null;
  shareId?: string | null;
  fileId?: string | null;
  recipientSessionId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue;
}

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
}
