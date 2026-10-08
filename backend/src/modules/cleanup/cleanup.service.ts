import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AppConfig } from '../../config/configuration';
import { APP_CONFIG } from '../../config/tokens';
import { PrismaService } from '../../database/prisma.service';

export interface CleanupResult {
  recipientSessions: number;
  auditEvents: number;
}

/**
 * Background retention job.
 *
 * Redis keys (refresh tokens, recipient session caches, rate-limit buckets)
 * expire on their own via TTL. What accumulates in Postgres is cleaned here:
 * - expired (or long-revoked) recipient sessions,
 * - audit events older than the retention window.
 *
 * Expired shares are intentionally kept as history: every open/download
 * re-validates `expiresAt`, so they can never grant access again.
 */
@Injectable()
export class CleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CleanupService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    if (!this.config.cleanup.enabled) return;
    this.timer = setInterval(() => {
      void this.runOnce().catch((error: unknown) => {
        this.logger.error(`cleanup run failed: ${error instanceof Error ? error.message : String(error)}`);
      });
    }, this.config.cleanup.intervalMs);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runOnce(): Promise<CleanupResult> {
    const now = new Date();
    const retentionCutoff = new Date(now.getTime() - this.config.cleanup.auditRetentionDays * 86_400_000);

    const [sessions, audits] = await Promise.all([
      this.prisma.recipientSession.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: now } }, { revokedAt: { lt: retentionCutoff } }],
        },
      }),
      this.prisma.auditEvent.deleteMany({
        where: { createdAt: { lt: retentionCutoff } },
      }),
    ]);

    if (sessions.count > 0 || audits.count > 0) {
      this.logger.debug(
        `cleanup removed ${sessions.count} recipient session(s), ${audits.count} audit event(s) past retention`,
      );
    }

    return { recipientSessions: sessions.count, auditEvents: audits.count };
  }
}
