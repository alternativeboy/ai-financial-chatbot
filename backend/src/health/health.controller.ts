import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

export interface HealthResponse {
  status: 'ok' | 'error';
  postgres: 'up' | 'down';
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  /**
   * GET /api/health
   *
   * Terminus's own payload is nested ({ status, info, error, details }); the API
   * contract for this app is the flat { status, postgres } shape, so the result
   * is mapped rather than returned as-is. Terminus throws on failure, which is
   * what turns a dead database into a 503 instead of a 200 with bad news in the
   * body.
   */
  @Get()
  async check(): Promise<HealthResponse> {
    try {
      await this.health.check([
        () => this.db.pingCheck('postgres', { timeout: 3000 }),
      ]);
      return { status: 'ok', postgres: 'up' };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        postgres: 'down',
      });
    }
  }
}
