import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4001),
  JWT_SECRET: z
    .string({
      required_error: "FATAL: JWT_SECRET environment variable is missing.",
    })
    .min(32, {
      message: "FATAL: JWT_SECRET must be at least 32 characters long for cryptographic security.",
    }),
  JWT_EXPIRES_IN: z.string().default("15m"),
  CORS_ORIGIN: z.string({
    required_error: "FATAL: CORS_ORIGIN environment variable is missing.",
  }),
  DATABASE_URL: z.string({
    required_error: "FATAL: DATABASE_URL environment variable is missing.",
  }),
  REDIS_URL: z.string().optional(),
  COOKIE_SECRET: z.string().min(32).optional(),
  CSRF_HMAC_SECRET: z.string().min(32).optional(),
  TOTP_ENCRYPTION_KEY: z.string().min(32).optional(),
  S3_PRIVATE_RECEIPTS_BUCKET: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const formattedErrors = result.error.errors
      .map((err) => `  - [${err.path.join(".")}]: ${err.message}`)
      .join("\n");

    const message = `\n=======================================================\nCONFIGURATION ERROR: Environment validation failed at boot:\n${formattedErrors}\n=======================================================\n`;
    
    // Output error clearly to stderr and throw so NestJS aborts boot immediately
    console.error(message);
    throw new Error(message);
  }

  return result.data;
}
