import "reflect-metadata";
import * as bcrypt from "bcryptjs";
import { UnauthorizedException, ForbiddenException } from "@nestjs/common";
import { AuthService } from "../src/modules/identity/auth/services/auth.service";

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

async function runAdminAuthUnitTests() {
  console.log("=== Testing Admin Auth Service Unit & Role Enforcement ===\n");

  const adminPasswordHash = await bcrypt.hash("adminPass123!", 10);

  const mockAdminUser = {
    id: "admin-uuid-001",
    email: "admin@mastara.edu.et",
    phone_number: "+251911000000",
    password_hash: adminPasswordHash,
    first_name: "System",
    last_name: "Admin",
    admin_role: "SUPER_ADMIN",
    is_active: true,
    totp_secret: "JBSWY3DPEHPK3PXP",
    admin_scopes: [],
  };

  const mockSuspendedAdmin = {
    id: "admin-uuid-003",
    email: "suspended@mastara.edu.et",
    phone_number: "+251911999999",
    password_hash: adminPasswordHash,
    first_name: "Suspended",
    last_name: "Admin",
    admin_role: "SUPER_ADMIN",
    is_active: false,
    totp_secret: "JBSWY3DPEHPK3PXP",
    admin_scopes: [],
  };

  // Mock Prisma Service
  const mockPrisma: any = {
    adminUser: {
      findFirst: async ({ where }: any) => {
        const identifiers = [
          where.email,
          where.phone_number,
          where.OR?.[0]?.email,
          where.OR?.[0]?.phone_number,
          where.OR?.[1]?.email,
          where.OR?.[1]?.phone_number,
        ].filter(Boolean);

        for (const user of [mockAdminUser, mockSuspendedAdmin]) {
          if (identifiers.includes(user.email) || identifiers.includes(user.phone_number)) {
            return user;
          }
        }
        return null;
      },
      update: async () => ({ id: "admin-uuid-001" }),
    },
    securityEventLog: {
      create: async () => ({ id: "log-1" }),
    },
  };

  // Mock JwtService
  const mockJwt: any = {
    sign: (payload: any) => `mock-jwt-token-for-${payload.sub}-${payload.role}`,
  };

  // Mock TotpService
  const mockTotp: any = {
    verifyTotp: (token: string, secret: string) => token === "123456",
  };

  const authService = new AuthService(mockPrisma, mockJwt, mockTotp);

  // ----------------------------------------------------
  // Test 1: Successful Admin Login with email + TOTP
  // ----------------------------------------------------
  console.log("1. Successful Admin Login Tests:");
  const result1 = await authService.adminLogin({
    identifier: "admin@mastara.edu.et",
    password: "adminPass123!",
    totp_code: "123456",
  });
  assert(result1.user.id === mockAdminUser.id, "Returns correct admin user ID");
  assert(result1.user.role === "ADMIN", "Guarantees user.role is 'ADMIN'");
  assert(result1.user.name === "System Admin", "Returns formatted full name");
  assert(result1.user.identifier === "admin@mastara.edu.et", "Returns correct identifier");
  assert(result1.token.includes("ADMIN"), "Issues JWT with ADMIN role");

  // ----------------------------------------------------
  // Test 2: Successful Admin Login with phone format
  // ----------------------------------------------------
  const result2 = await authService.adminLogin({
    identifier: "0911000000",
    password: "adminPass123!",
    totp_code: "123456",
  });
  assert(result2.user.id === mockAdminUser.id, "Supports normalized phone identifier");

  // ----------------------------------------------------
  // Test 3: Reject missing TOTP for SUPER_ADMIN
  // ----------------------------------------------------
  console.log("\n2. TOTP Enforcement Tests:");
  let missingTotpRejected = false;
  try {
    await authService.adminLogin({
      identifier: "admin@mastara.edu.et",
      password: "adminPass123!",
    });
  } catch (err: any) {
    if (err instanceof UnauthorizedException) {
      missingTotpRejected = true;
    }
  }
  assert(missingTotpRejected, "Rejects SUPER_ADMIN without TOTP code with UnauthorizedException (MFA_REQUIRED)");

  // ----------------------------------------------------
  // Test 4: Reject incorrect password
  // ----------------------------------------------------
  console.log("\n3. Credential & State Verification Tests:");
  let wrongPassRejected = false;
  try {
    await authService.adminLogin({
      identifier: "admin@mastara.edu.et",
      password: "WrongPassword999!",
      totp_code: "123456",
    });
  } catch (err: any) {
    if (err instanceof UnauthorizedException) {
      wrongPassRejected = true;
    }
  }
  assert(wrongPassRejected, "Rejects wrong password with UnauthorizedException");

  // ----------------------------------------------------
  // Test 5: Reject unknown identifier
  // ----------------------------------------------------
  let unknownRejected = false;
  try {
    await authService.adminLogin({
      identifier: "ghost@mastara.edu.et",
      password: "somePassword123!",
      totp_code: "123456",
    });
  } catch (err: any) {
    if (err instanceof UnauthorizedException) {
      unknownRejected = true;
    }
  }
  assert(unknownRejected, "Rejects non-existent identifier with UnauthorizedException");

  // ----------------------------------------------------
  // Test 6: Reject suspended / inactive admin account
  // ----------------------------------------------------
  let suspendedRejected = false;
  try {
    await authService.adminLogin({
      identifier: "suspended@mastara.edu.et",
      password: "adminPass123!",
      totp_code: "123456",
    });
  } catch (err: any) {
    if (err instanceof ForbiddenException) {
      suspendedRejected = true;
    }
  }
  assert(suspendedRejected, "Rejects inactive admin with ForbiddenException");

  console.log(`\n========================================`);
  console.log(`Admin Auth Tests: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAdminAuthUnitTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
