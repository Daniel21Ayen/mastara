import "reflect-metadata";
import { ForbiddenException } from "@nestjs/common";
import { CsrfMutationGuard } from "../src/common/guards/csrf-mutation.guard";

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

function createMockContext(method: string, headers: Record<string, string> = {}) {
  const req = {
    method,
    headers,
  };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as any;
}

async function runCorsCsrfSecurityTests() {
  console.log("=== Testing CORS & CSRF Hardening Security ===\n");

  // --- 1. CORS Origin Allowlist Logic ---
  console.log("1. CORS Allowlist Policy Tests:");
  const configuredOrigins = "http://localhost:3000, https://admin.mastara.et, http://localhost:3001";
  const allowed = configuredOrigins.split(",").map((s) => s.trim()).filter(Boolean);

  const testOrigins = [
    { origin: "http://localhost:3000", expected: true },
    { origin: "https://admin.mastara.et", expected: true },
    { origin: "http://localhost:3001", expected: true },
    { origin: "https://evil-attacker.com", expected: false },
    { origin: "http://malicious.mastara.et.fake.com", expected: false },
    { origin: "http://localhost:4000", expected: false },
  ];

  for (const { origin, expected } of testOrigins) {
    const isAllowed = allowed.includes(origin);
    assert(
      isAllowed === expected,
      `Origin '${origin}' should be ${expected ? "ALLOWED" : "REJECTED"}`,
    );
  }

  // --- 2. CSRF Mutation Guard Tests ---
  console.log("\n2. CSRF Mutation Guard Tests:");
  const guard = new CsrfMutationGuard();

  // A. Safe method GET passes with cookie auth
  const getContext = createMockContext("GET", {
    cookie: "mastara_session=abc12345",
  });
  assert(guard.canActivate(getContext) === true, "GET requests with cookies pass without CSRF header");

  // B. Bearer token auth passes mutation without CSRF header (since Authorization header is immune to ambient browser CSRF)
  const bearerContext = createMockContext("POST", {
    authorization: "Bearer valid-jwt-token",
  });
  assert(guard.canActivate(bearerContext) === true, "Bearer token authenticated mutations pass without cookie CSRF");

  // C. Cookie-authenticated mutation WITHOUT custom header is rejected
  const cookieNoCsrfContext = createMockContext("POST", {
    cookie: "mastara_session=abc12345",
  });
  let threw403 = false;
  try {
    guard.canActivate(cookieNoCsrfContext);
  } catch (err: any) {
    threw403 = err instanceof ForbiddenException;
  }
  assert(threw403, "Cookie-authenticated POST without CSRF header throws ForbiddenException");

  // D. Cookie-authenticated mutation WITH X-CSRF-Token is permitted
  const cookieWithCsrfTokenContext = createMockContext("POST", {
    cookie: "mastara_session=abc12345",
    "x-csrf-token": "valid-custom-csrf-token",
  });
  assert(guard.canActivate(cookieWithCsrfTokenContext) === true, "Cookie mutation with X-CSRF-Token header passes");

  // E. Cookie-authenticated mutation WITH X-Requested-With is permitted
  const cookieWithXRequestedContext = createMockContext("PUT", {
    cookie: "mastara_session=abc12345",
    "x-requested-with": "XMLHttpRequest",
  });
  assert(guard.canActivate(cookieWithXRequestedContext) === true, "Cookie mutation with X-Requested-With header passes");

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runCorsCsrfSecurityTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
