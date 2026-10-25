import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  Optional,
} from "@nestjs/common";
import { PrismaClient } from "@mastara/database";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { AlertsService } from "../../common/monitoring/alerts.service";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private pool: Pool;

  constructor(
    @Optional() private readonly alertsService?: AlertsService,
  ) {
    const connectionString =
      process.env.DATABASE_URL ||
      "postgresql://mastara:mastara_secure_pass_2026@localhost:5433/mastara?schema=public";

    const pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: [
        { emit: "event", level: "query" },
        { emit: "stdout", level: "error" },
        { emit: "stdout", level: "warn" },
      ],
    });

    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log("Successfully connected to PostgreSQL database via Prisma.");

      (this as any).$on?.("query", (e: any) => {
        if (process.env.PRISMA_LOG_QUERIES === "true" || process.env.NODE_ENV === "development") {
          this.logger.debug(`Prisma Query [${e.duration}ms]: ${e.query}`);
        }

        if (this.alertsService) {
          this.alertsService.recordQuery(e.query, e.duration, e.params);
        } else if (e.duration >= 150) {
          this.logger.warn(`[SLOW_QUERY_ALERT] Database query exceeded latency threshold: ${e.duration}ms - ${e.query}`);
        }
      });
    } catch (error) {
      this.logger.error("Failed to connect to database during onModuleInit:", error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
      await this.pool.end();
      this.logger.log("Successfully disconnected from PostgreSQL database.");
    } catch (error) {
      this.logger.error("Error disconnecting from database during onModuleDestroy:", error);
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
