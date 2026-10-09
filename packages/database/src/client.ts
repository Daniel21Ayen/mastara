import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __mastaraPrismaClient: PrismaClient | undefined;
}

export function createPrismaClient(): PrismaClient {
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

  return new PrismaClient({
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
}

export const prisma = global.__mastaraPrismaClient ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__mastaraPrismaClient = prisma;
}

export default prisma;
