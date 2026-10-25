import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "@mastara/database";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private pool: Pool;

  constructor() {
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
      log:
        process.env.NODE_ENV === "development"
          ? [
              { emit: "event", level: "query" },
              { emit: "stdout", level: "error" },
              { emit: "stdout", level: "info" },
              { emit: "stdout", level: "warn" },
            ]
          : [
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

      if (process.env.PRISMA_LOG_QUERIES === "true" || process.env.NODE_ENV === "development") {
        (this as any).$on?.("query", (e: any) => {
          this.logger.debug(`Prisma Query [${e.duration}ms]: ${e.query}`);
        });
      }
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
