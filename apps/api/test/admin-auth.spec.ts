import "reflect-metadata";
import * as bcrypt from "bcryptjs";
import { UnauthorizedException, ForbiddenException } from "@nestjs/common";
import { Role, StudentStatus, SecurityEventType } from "@mastara/database";
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
  const studentPasswordHash = await bcrypt.hash("studentPass123!", 10);

  const mockAdminUser = {
    id: "admin-uuid-001",
    email: "admin@mastara.edu.et",
    phone: "+251911000000",
    password_hash: adminPasswordHash,
    first_name: "System",
    last_name: "Admin",
    role: Role.ADMIN,
    status: StudentStatus.ACTIVE,
  };

  const mockStudentUser = {
    id: "student-uuid-002",
    email: "student@mastara.edu.et",
    phone: "+251911223344",
    password_hash: studentPasswordHash,
    first_name: "Normal",
    last_name: "Student",
    role: Role.STUDENT,
    status: StudentStatus.ACTIVE,
  };

  const mockSuspendedAdmin = {
    id: "admin-uuid-003",
    email: "suspended@mastara.edu.et",
    phone: "+251911999999",
    password_hash: adminPasswordHash,
    first_name: "Suspended",
    last_name: "Admin",
    role: Role.ADMIN,
    status: StudentStatus.SUSPENDED,
  };

  // Mock Prisma Service
  const mockPrisma: any = {
    student: {
      findFirst: async ({ where }: any) => {
        const identifiers = [
          where.OR?.[0]?.email,
          where.OR?.[0]?.phone,
          where.OR?.[1]?.email,
          where.OR?.[2]?.phone,
        ].filter(Boolean);

        for (const user of [mockAdminUser, mockStudentUser, mockSuspendedAdmin]) {
          if (identifiers.includes(user.email) || identifiers.includes(user.phone)) {
            return user;
          }
        }
        return null;
      },
    },
    securityEventLog: {
      create: async () => ({ id: "log-1" }),
    },
  };

  // Mock JwtService
  const mockJwt: any = {
    sign: (payload: any) => `mock-jwt-token-for-${payload.sub}-${payload.role}`,
  };

  const authService = new AuthService(mockPrisma, mockJwt);

  // ----------------------------------------------------
  // Test 1: Successful Admin Login with email
  // ----------------------------------------------------
  console.log("1. Successful Admin Login Tests:");
  const result1 = await authService.adminLogin({
    identifier: "admin@mastara.edu.et",
    password: "adminPass123!",
  });
  assert(result1.user.id === mockAdminUser.id, "Returns correct admin user ID");
  assert(result1.user.role === "ADMIN", "Guarantees user.role is 'ADMIN'");
  assert(result1.user.name === "System Admin", "Returns formatted full name");
  assert(result1.user.identifier === "admin@mastara.edu.et", "Returns correct identifier");
  assert(result1.token.includes("ADMIN"), "Issues JWT with ADMIN role");

  // ----------------------------------------------------
  // Test 2: Successful Admin Login with phone format (0911000000 -> +251911000000)
  // ----------------------------------------------------
  const result2 = await authService.adminLogin({
    identifier: "0911000000",
    password: "adminPass123!",
  });
  assert(result2.user.id === mockAdminUser.id, "Supports normalized phone identifier");

  // ----------------------------------------------------
  // Test 3: Reject non-admin (STUDENT) role
  // ----------------------------------------------------
  console.log("\n2. Role-based Boundary Tests:");
  let studentRejected = false;
  let rejectionMessage = "";
  try {
    await authService.adminLogin({
      identifier: "student@mastara.edu.et",
      password: "studentPass123!",
    });
  } catch (err: any) {
    if (err instanceof ForbiddenException) {
      studentRejected = true;
      rejectionMessage = err.message;
    }
  }
  assert(studentRejected, "Rejects student user from admin portal with ForbiddenException");
  assert(rejectionMessage.includes("administrator"), "Returns clear admin access denied message");

  // ----------------------------------------------------
  // Test 4: Reject incorrect password
  // ----------------------------------------------------
  console.log("\n3. Credential & State Verification Tests:");
  let wrongPassRejected = false;
  try {
    await authService.adminLogin({
      identifier: "admin@mastara.edu.et",
      password: "WrongPassword999!",
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
    });
  } catch (err: any) {
    if (err instanceof UnauthorizedException) {
      unknownRejected = true;
    }
  }
  assert(unknownRejected, "Rejects non-existent identifier with UnauthorizedException");

  // ----------------------------------------------------
  // Test 6: Reject suspended admin account
  // ----------------------------------------------------
  let suspendedRejected = false;
  try {
    await authService.adminLogin({
      identifier: "suspended@mastara.edu.et",
      password: "adminPass123!",
    });
  } catch (err: any) {
    if (err instanceof ForbiddenException) {
      suspendedRejected = true;
    }
  }
  assert(suspendedRejected, "Rejects suspended admin with ForbiddenException");

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
