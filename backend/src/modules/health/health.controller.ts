import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { ok } from '../../common/api-response';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  check() {
    return ok(this.health.check());
  }
}
