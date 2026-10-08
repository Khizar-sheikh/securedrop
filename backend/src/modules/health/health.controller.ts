import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service';
import { fail, ok } from '../../common/api-response';
import { ERROR_CODES } from '../../common/error-codes';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  async check() {
    const report = await this.health.check();

    if (!report.healthy) {
      const summary = Object.entries(report.checks)
        .map(([name, check]) => `${name}: ${check.status}`)
        .join('; ');
      throw new ServiceUnavailableException(fail(ERROR_CODES.SERVICE_UNAVAILABLE, summary));
    }

    return ok(report);
  }
}
