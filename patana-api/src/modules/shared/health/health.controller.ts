import { Controller, Get } from '@nestjs/common';

/**
 * Minimal health / readiness endpoint.
 * No business logic, no DB dependency — only process-level liveness.
 */
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: 'patana-api',
    };
  }
}
