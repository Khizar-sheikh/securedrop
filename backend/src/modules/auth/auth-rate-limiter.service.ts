import { Inject, Injectable } from '@nestjs/common';
import { RedisService } from '../../database/redis.service';
import { AppConfig } from '../../config/configuration';
import { APP_CONFIG } from '../../config/tokens';
import { hashToken } from '../../security/tokens';

/**
 * Brute-force protection for authentication: counts failed attempts per email
 * in an auto-expiring Redis window. Applies equally to accounts that do not
 * exist, so it cannot be used to probe for registered addresses.
 */
@Injectable()
export class AuthRateLimiterService {
  private readonly maxFailedAttempts: number;
  private readonly windowSeconds: number;

  constructor(
    private readonly redis: RedisService,
    @Inject(APP_CONFIG) config: AppConfig,
  ) {
    this.maxFailedAttempts = config.auth.maxFailedAttempts;
    this.windowSeconds = config.auth.failWindowSeconds;
  }

  private key(email: string): string {
    return `auth:fail:${hashToken(email.trim().toLowerCase())}`;
  }

  async isLocked(email: string): Promise<boolean> {
    const count = Number((await this.redis.get(this.key(email))) ?? 0);
    return Number.isFinite(count) && count >= this.maxFailedAttempts;
  }

  async recordFailure(email: string): Promise<number> {
    return this.redis.incr(this.key(email), this.windowSeconds);
  }

  async clearFailures(email: string): Promise<void> {
    await this.redis.del(this.key(email));
  }
}
