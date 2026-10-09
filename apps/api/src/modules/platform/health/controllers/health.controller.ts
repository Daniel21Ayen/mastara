import {
  Controller,
  Get,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: "Check system and database health" })
  @ApiResponse({ status: 200, description: "Service is healthy and database is connected" })
  @ApiResponse({ status: 503, description: "Service or database is unhealthy" })
  async check() {
    const isDbHealthy = await this.prisma.isHealthy();

    if (!isDbHealthy) {
      throw new ServiceUnavailableException({
        status: "down",
        timestamp: new Date().toISOString(),
        database: "disconnected",
      });
    }

    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        database: "connected",
      },
      uptime: process.uptime(),
    };
  }
}
