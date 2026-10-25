import {
  Controller,
  Get,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import { RedisService } from "../../../../infrastructure/redis/redis.service";
import { Public } from "../../../../common/decorators/public.decorator";
import { AlertsService } from "../../../../common/monitoring/alerts.service";

@ApiTags("Health")
@Controller(["health", "api/v1/health"])
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Optional() private readonly alerts?: AlertsService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Liveness probe: verifies process is alive" })
  @ApiResponse({ status: 200, description: "Process is alive and accepting connections" })
  checkLiveness() {
    return {
      status: "ok",
      type: "liveness",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Public()
  @Get("live")
  @ApiOperation({ summary: "Liveness probe alias" })
  @ApiResponse({ status: 200, description: "Process is alive" })
  checkLive() {
    return this.checkLiveness();
  }

  @Public()
  @Get("ready")
  @ApiOperation({ summary: "Readiness probe: tests PostgreSQL and Redis" })
  @ApiResponse({ status: 200, description: "API is ready to serve traffic (healthy or gracefully degraded)" })
  @ApiResponse({ status: 503, description: "Database is unavailable" })
  async checkReadiness() {
    const [isDbHealthy, isRedisHealthy] = await Promise.all([
      this.prisma.isHealthy().catch(() => false),
      this.redis.isHealthy().catch(() => false),
    ]);

    if (!isDbHealthy) {
      throw new ServiceUnavailableException({
        status: "down",
        type: "readiness",
        timestamp: new Date().toISOString(),
        services: {
          database: "disconnected",
          redis: isRedisHealthy ? "connected" : "disconnected",
        },
      });
    }

    // Graceful degradation: if Redis is down, API works directly from Postgres with in-memory caching
    const isDegraded = !isRedisHealthy;

    return {
      status: isDegraded ? "degraded" : "ok",
      type: "readiness",
      degraded: isDegraded,
      timestamp: new Date().toISOString(),
      services: {
        database: "connected",
        redis: isRedisHealthy ? "connected" : "degraded",
      },
      uptime: process.uptime(),
      degradationNotice: isDegraded
        ? "Redis unreachable: operating in graceful degradation mode via PostgreSQL and in-memory cache"
        : undefined,
    };
  }

  @Public()
  @Get("alerts")
  @ApiOperation({ summary: "Observability: error rate and slow query alerts status" })
  getAlertsStatus() {
    return this.alerts ? this.alerts.getMetrics() : { status: "active", metrics: "ok" };
  }
}
