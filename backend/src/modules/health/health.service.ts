import { Injectable } from '@nestjs/common';

export interface HealthReport {
  healthy: boolean;
  status: string;
  uptimeSeconds: number;
  timestamp: string;
}

@Injectable()
export class HealthService {
  check(): HealthReport {
    return {
      healthy: true,
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
