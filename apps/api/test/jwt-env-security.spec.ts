import "reflect-metadata";
import { validateEnv } from "../src/config/env.validation";
import { JwtStrategy } from "../src/modules/identity/auth/strategies/jwt.strategy";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ ${testName}`, details || "");
    failed++;
  }
}

async function runJwtSecurityTests() {
  console.log("=== Testing JWT & Boot Environment Validation Security ===\n");

  const validBaseEnv = {
    NODE_ENV: "test",
    PORT: 4001,
    CORS_ORIGIN: "http://localhost:3000",
    DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  };

  // 1. Missing JWT_SECRET
  let missingThrew = false;
  try {
    validateEnv({ ...validBaseEnv } as any);
  } catch (err: any) {
    missingThrew = true;
    assert(
      err.message.includes("JWT_SECRET") && err.message.includes("missing"),
      "Boot validation must throw when JWT_SECRET is missing",
    );
  }
  if (!missingThrew) {
    assert(false, "Boot validation should fail when JWT_SECRET is missing");
  }

  // 2. Short JWT_SECRET (< 32 chars)
  let shortThrew = false;
  try {
    validateEnv({
      ...validBaseEnv,
      JWT_SECRET: "short-secret-less-than-32-chars",
    } as any);
  } catch (err: any) {
    shortThrew = true;
    assert(
      err.message.includes("at least 32 characters"),
      "Boot validation must reject JWT_SECRET shorter than 32 characters",
    );
  }
  if (!shortThrew) {
    assert(false, "Boot validation should fail when JWT_SECRET is shorter than 32 chars");
  }

  // 3. Valid JWT_SECRET (>= 32 chars)
  let validResult: any = null;
  try {
    const validSecret = "a".repeat(32);
    validResult = validateEnv({
      ...validBaseEnv,
      JWT_SECRET: validSecret,
    } as any);
    assert(
      validResult && validResult.JWT_SECRET === validSecret,
      "Boot validation succeeds when JWT_SECRET is >= 32 characters",
    );
  } catch (err: any) {
    assert(false, "Boot validation should succeed with valid JWT_SECRET", err.message);
  }

  // 4. JwtStrategy refuses to instantiate without JWT_SECRET (no hardcoded fallback)
  let strategyThrew = false;
  const mockConfigService = {
    getOrThrow: (key: string) => {
      if (key === "JWT_SECRET") {
        throw new Error('Configuration key "JWT_SECRET" does not exist');
      }
      return undefined;
    },
    get: () => undefined,
  };

  try {
    new JwtStrategy(mockConfigService as any, {} as any);
  } catch (err: any) {
    strategyThrew = true;
    assert(
      err.message.includes('Configuration key "JWT_SECRET" does not exist'),
      "JwtStrategy refuses to boot without JWT_SECRET configured (fallback removed)",
    );
  }
  if (!strategyThrew) {
    assert(false, "JwtStrategy must not fall back to hardcoded default secret");
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runJwtSecurityTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
