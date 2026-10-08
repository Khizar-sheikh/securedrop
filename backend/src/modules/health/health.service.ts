import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { StorageService } from '../../storage/storage.service';

export interface HealthReport {
  healthy: boolean;
  status: 'ok' | 'degraded';
  uptimeSeconds: number;
  timestamp: string;
  checks: Record<string, { status: 'up' | 'down'; latencyMs: number }>;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly storage: StorageService,
  ) {}

  private async timed(name: string, check: () => Promise<void>): Promise<{ status: 'up' | 'down'; latencyMs: number }> {
    const startedAt = Date.now();
    try {
      await check();
      return { status: 'up', latencyMs: Date.now() - startedAt };
    } catch (error) {
      // Raw errors may contain connection details — log them, never return them.
      this.logger.warn(`health check "${name}" failed: ${(error as Error).message}`);
      return { status: 'down', latencyMs: Date.now() - startedAt };
    }
  }

  async check(): Promise<HealthReport> {
    const checks = {
      database: await this.timed('database', () => this.prisma.ping()),
      redis: await this.timed('redis', () => this.redis.ping()),
      storage: await this.timed('storage', () => this.storage.ping()),
    };

    const healthy = Object.values(checks).every((check) => check.status === 'up');

    return {
      healthy,
      status: healthy ? 'ok' : 'degraded',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
