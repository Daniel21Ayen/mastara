import "reflect-metadata";
import { validateAdminPassword } from "../src/common/security/password-policy";
import { AdminThrottlerService } from "../src/common/security/admin-throttler.service";
import { TotpService } from "../src/common/security/totp.service";
import { AdminScope, AdminScopeGuard } from "../src/common/security/admin-scopes";
import { ForbiddenException, HttpException } from "@nestjs/common";

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

async function runAdminHardeningTests() {
  console.log("=== Testing Admin Hardening Security ===\n");

  // --- 1. Password Policy Tests ---
  console.log("1. Password Policy Tests:");
  assert(validateAdminPassword("short").valid === false, "Rejects short passwords (< 12 chars)");
  assert(validateAdminPassword("lowercase123456!").valid === false, "Rejects password without uppercase");
  assert(validateAdminPassword("UPPERCASE123456!").valid === false, "Rejects password without lowercase");
  assert(validateAdminPassword("NoNumbersHere!@#").valid === false, "Rejects password without digits");
  assert(validateAdminPassword("NoSymbols1234567").valid === false, "Rejects password without symbols");
  assert(validateAdminPassword("Admin123456789!").valid === false, "Rejects common word 'admin'");
  assert(validateAdminPassword("MastaraPlatform2026!").valid === false, "Rejects brand word 'mastara'");
  assert(
    validateAdminPassword("K3w@k1bt#Secur3P@ss").valid === true,
    "Accepts compliant high-entropy password",
  );

  // --- 2. Admin Login Throttling Tests ---
  console.log("\n2. Admin Login Throttling Tests:");
  const throttler = new AdminThrottlerService();
  const testId = "admin_target@mastara.et";
  const testIp = "192.168.1.50";

  // Initially allowed
  let allowed = true;
  try {
    throttler.checkLoginAllowed(testId, testIp);
  } catch {
    allowed = false;
  }
  assert(allowed, "Initial login attempt is allowed");

  // 4 failed attempts should not lock yet
  for (let i = 0; i < 4; i++) {
    throttler.recordLoginFailure(testId, testIp);
  }
  let allowed4 = true;
  try {
    throttler.checkLoginAllowed(testId, testIp);
  } catch {
    allowed4 = false;
  }
  assert(allowed4, "4 failed attempts do not lock account yet");

  // 5th failed attempt triggers lockout
  throttler.recordLoginFailure(testId, testIp);
  let lockedAfter5 = false;
  try {
    throttler.checkLoginAllowed(testId, testIp);
  } catch (err: any) {
    lockedAfter5 = err instanceof HttpException && err.getStatus() === 429;
  }
  assert(lockedAfter5, "5th failed attempt locks administrator account (429 Too Many Requests)");

  // Successful login clears failure count
  throttler.recordLoginSuccess(testId, testIp);
  let allowedAfterReset = true;
  try {
    throttler.checkLoginAllowed(testId, testIp);
  } catch {
    allowedAfterReset = false;
  }
  assert(allowedAfterReset, "Login success resets lockout");

  // --- 3. TOTP 2FA Tests ---
  console.log("\n3. TOTP 2FA Tests:");
  const totp = new TotpService();
  const secret = totp.generateSecret();
  assert(Boolean(secret && secret.length >= 16), "Generates Base32 TOTP secret");

  const uri = totp.generateKeyUri("admin@mastara.et", secret);
  assert(uri.startsWith("otpauth://totp/"), "Generates valid key URI");

  const code = totp.generateTotp(secret);
  assert(code.length === 6, "Generates 6-digit TOTP code");

  const isValid = totp.verifyTotp(code, secret);
  assert(isValid === true, "Verifies current TOTP code successfully");

  const isInvalid = totp.verifyTotp("999999", secret);
  assert(isInvalid === false, "Rejects incorrect TOTP code");

  // --- 4. Permission Scopes Guard Tests ---
  console.log("\n4. Admin Permission Scopes Tests:");
  const mockReflector = {
    getAllAndOverride: (key: string) => [AdminScope.RECEIPT_REVIEWER],
  } as any;
  const scopeGuard = new AdminScopeGuard(mockReflector);

  const reviewerContext = {
    switchToHttp: () => ({
      getRequest: () => ({
        user: { role: "ADMIN", admin_scopes: [AdminScope.RECEIPT_REVIEWER] },
      }),
    }),
    getHandler: () => {},
    getClass: () => {},
  } as any;
  assert(scopeGuard.canActivate(reviewerContext) === true, "Permits admin with RECEIPT_REVIEWER scope");

  const editorContext = {
    switchToHttp: () => ({
      getRequest: () => ({
        user: { role: "ADMIN", admin_scopes: [AdminScope.CONTENT_EDITOR] },
      }),
    }),
    getHandler: () => {},
    getClass: () => {},
  } as any;
  let editorDenied = false;
  try {
    scopeGuard.canActivate(editorContext);
  } catch (err: any) {
    editorDenied = err instanceof ForbiddenException;
  }
  assert(editorDenied, "Denies admin lacking RECEIPT_REVIEWER scope");

  const superAdminContext = {
    switchToHttp: () => ({
      getRequest: () => ({
        user: { role: "ADMIN", admin_scopes: [AdminScope.SUPER_ADMIN] },
      }),
    }),
    getHandler: () => {},
    getClass: () => {},
  } as any;
  assert(scopeGuard.canActivate(superAdminContext) === true, "Super admin has access across all scopes");

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runAdminHardeningTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
