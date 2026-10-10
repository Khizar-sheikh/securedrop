import { Inject, Injectable } from '@nestjs/common';
import { RedisService } from '../../database/redis.service';
import { AppConfig } from '../../config/configuration';
import { APP_CONFIG } from '../../config/tokens';
import { hashToken } from '../../security/tokens';

/**
 * Brute-force protection for password-protected public shares: counts failed
 * password attempts per share+IP in an auto-expiring Redis window. Mirrors the
 * login lockout so a share password cannot be guessed at request-rate.
 */
@Injectable()
export class SharePasswordRateLimiterService {
  private readonly maxFailedAttempts: number;
  private readonly windowSeconds: number;

  constructor(
    private readonly redis: RedisService,
    @Inject(APP_CONFIG) config: AppConfig,
  ) {
    this.maxFailedAttempts = config.sharePassword.maxFailedAttempts;
    this.windowSeconds = config.sharePassword.failWindowSeconds;
  }

  private key(shareId: string, ip: string): string {
    return `share-pw:fail:${shareId}:${hashToken(ip.trim() || 'unknown')}`;
  }

  async isLocked(shareId: string, ip: string): Promise<boolean> {
    const count = Number((await this.redis.get(this.key(shareId, ip))) ?? 0);
    return Number.isFinite(count) && count >= this.maxFailedAttempts;
  }

  async recordFailure(shareId: string, ip: string): Promise<number> {
    return this.redis.incr(this.key(shareId, ip), this.windowSeconds);
  }

  async clearFailures(shareId: string, ip: string): Promise<void> {
    await this.redis.del(this.key(shareId, ip));
  }
}
