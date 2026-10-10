import "reflect-metadata";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "../src/infrastructure/database/database.module";
import { PrismaService } from "../src/infrastructure/database/prisma.service";
import { AuthModule } from "../src/modules/identity/auth/auth.module";
import { AuthService } from "../src/modules/identity/auth/services/auth.service";
import { ConflictException, UnauthorizedException } from "@nestjs/common";

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

async function runAuthTests() {
  console.log("=== Testing Step 2: Auth Service & Security Implementation ===\n");

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: [".env", "../../.env"],
      }),
      DatabaseModule,
      AuthModule,
    ],
  }).compile();

  const authService = moduleFixture.get<AuthService>(AuthService);
  const prisma = moduleFixture.get<PrismaService>(PrismaService);

  // ----------------------------------------------------
  // 1. Phone & Email Normalization Unit Tests
  // ----------------------------------------------------
  console.log("1. Identifier Normalization Tests:");

  const norm1 = authService.normalizeIdentifier("+251911223344");
  assert(!norm1.isEmail && norm1.normalized === "+251911223344", "Normalizes +2519... phone");

  const norm2 = authService.normalizeIdentifier("0911223344");
  assert(!norm2.isEmail && norm2.normalized === "+251911223344", "Normalizes local 09... phone to +2519...");

  const norm3 = authService.normalizeIdentifier("911223344");
  assert(!norm3.isEmail && norm3.normalized === "+251911223344", "Normalizes 9... phone to +2519...");

  const norm4 = authService.normalizeIdentifier("  Abebe@Gmail.com  ");
  assert(norm4.isEmail && norm4.normalized === "abebe@gmail.com", "Normalizes email to lowercase trimmed");

  // ----------------------------------------------------
  // 2. Registration Flow with PostgreSQL
  // ----------------------------------------------------
  console.log("\n2. Registration Flow Tests (PostgreSQL):");

  const testPhone = `+2519${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testEmail = `test.student.${Date.now()}@mastara.edu.et`;

  // Clean up any potential stale test records
  await prisma.student.deleteMany({
    where: {
      OR: [{ phone: testPhone }, { email: testEmail }],
    },
  });

  // 2.1 Register new student with phone
  const regResult = await authService.register({
    name: "Almaz Ayana",
    identifier: testPhone,
    password: "SecurePassword2026!",
  });

  assert(Boolean(regResult.token && regResult.user?.id), "Registers student and returns JWT token");
  assert(regResult.user.name === "Almaz Ayana", "Matches registered name");
  assert(regResult.user.identifier === testPhone, "Matches registered phone identifier");

  // Verify in database
  const createdStudent = await prisma.student.findUnique({
    where: { id: regResult.user.id },
  });
  assert(Boolean(createdStudent && createdStudent.phone === testPhone), "Student persisted in database");
  assert(createdStudent?.first_name === "Almaz" && createdStudent?.last_name === "Ayana", "Splits name correctly into first_name and last_name");

  // Verify Security Event Log
  const securityLog = await prisma.securityEventLog.findFirst({
    where: { student_id: regResult.user.id, event_type: "REGISTER" },
  });
  assert(Boolean(securityLog), "Audit log created for REGISTER event");

  // 2.2 Register duplicate should throw ConflictException
  let duplicateThrew = false;
  try {
    await authService.register({
      name: "Another Name",
      identifier: testPhone,
      password: "AnotherPassword2026!",
    });
  } catch (e) {
    duplicateThrew = e instanceof ConflictException;
  }
  assert(duplicateThrew, "Rejects duplicate registration with 409 ConflictException");

  // ----------------------------------------------------
  // 3. Login Flow Tests (PostgreSQL)
  // ----------------------------------------------------
  console.log("\n3. Login Flow Tests (PostgreSQL):");

  // 3.1 Login with original phone format
  const loginResult1 = await authService.login({
    identifier: testPhone,
    password: "SecurePassword2026!",
  });
  assert(Boolean(loginResult1.token && loginResult1.user.id === regResult.user.id), "Logs in with exact phone format");

  // 3.2 Login with alternative phone format (09...)
  const localFormat = `0${testPhone.slice(4)}`; // e.g. 09xxxxxxxx
  const loginResult2 = await authService.login({
    identifier: localFormat,
    password: "SecurePassword2026!",
  });
  assert(loginResult2.user.id === regResult.user.id, "Logs in using alternate local format (09...)");

  // 3.3 Login with wrong password
  let wrongPassThrew = false;
  try {
    await authService.login({
      identifier: testPhone,
      password: "WrongPassword2026!",
    });
  } catch (e) {
    wrongPassThrew = e instanceof UnauthorizedException;
  }
  assert(wrongPassThrew, "Rejects incorrect password with UnauthorizedException");

  // Verify LOGIN_FAILED security event log
  const failedLog = await prisma.securityEventLog.findFirst({
    where: { student_id: regResult.user.id, event_type: "LOGIN_FAILED" },
  });
  assert(Boolean(failedLog), "Audit log created for LOGIN_FAILED event");

  // 3.4 Clean up created test student
  await prisma.securityEventLog.deleteMany({ where: { student_id: regResult.user.id } });
  await prisma.student.delete({ where: { id: regResult.user.id } });

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  await moduleFixture.close();

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthTests().catch((err) => {
  console.error("Auth test execution failed:", err);
  process.exit(1);
});
