import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { RegisterDto } from "../src/modules/identity/auth/dto/register.dto";
import { LoginDto } from "../src/modules/identity/auth/dto/login.dto";
import { RegisterDeviceDto } from "../src/modules/identity/devices/dto/register-device.dto";
import { UpdateAcademicScopeDto, StudentStreamSelection } from "../src/modules/identity/students/dto/update-academic.dto";
import { UpdateCoursesDto } from "../src/modules/identity/students/dto/update-courses.dto";
import { EditAccountDto } from "../src/modules/identity/students/dto/edit-account.dto";
import { GetCoursesQueryDto } from "../src/modules/catalog/dto/get-courses-query.dto";
import { RecordProgressDto } from "../src/modules/content/dto/record-progress.dto";
import { DevicePlatform, Stream } from "@mastara/database";

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

async function runTests() {
  console.log("=== Testing Step 1: Contract & DTO Alignment ===\n");

  // ----------------------------------------------------
  // Test RegisterDto
  // ----------------------------------------------------
  console.log("1. RegisterDto Validation:");

  // 1.1 Valid with Ethiopian phone (+2519...)
  const regPhone = plainToInstance(RegisterDto, {
    name: "Abebe Kebede",
    identifier: "+251911223344",
    password: "SecurePassword2026!",
  });
  const regPhoneErrors = await validate(regPhone);
  assert(regPhoneErrors.length === 0, "Accepts valid Ethiopian phone (+251911223344)", regPhoneErrors);

  // 1.2 Valid with Ethiopian local phone (09...)
  const regLocalPhone = plainToInstance(RegisterDto, {
    name: "Abebe Kebede",
    identifier: "0911223344",
    password: "SecurePassword2026!",
  });
  const regLocalErrors = await validate(regLocalPhone);
  assert(regLocalErrors.length === 0, "Accepts local Ethiopian phone (0911223344)", regLocalErrors);

  // 1.3 Valid with email
  const regEmail = plainToInstance(RegisterDto, {
    name: "Abebe Kebede",
    identifier: "abebe@mastara.edu.et",
    password: "SecurePassword2026!",
  });
  const regEmailErrors = await validate(regEmail);
  assert(regEmailErrors.length === 0, "Accepts valid email (abebe@mastara.edu.et)", regEmailErrors);

  // 1.4 Invalid identifier
  const regInvalidId = plainToInstance(RegisterDto, {
    name: "Abebe Kebede",
    identifier: "invalid-id-12345",
    password: "SecurePassword2026!",
  });
  const regInvalidIdErrors = await validate(regInvalidId);
  assert(regInvalidIdErrors.some((e) => e.property === "identifier"), "Rejects invalid identifier format");

  // 1.5 Short password (< 8 chars)
  const regShortPass = plainToInstance(RegisterDto, {
    name: "Abebe Kebede",
    identifier: "+251911223344",
    password: "1234567", // 7 chars
  });
  const regShortPassErrors = await validate(regShortPass);
  assert(regShortPassErrors.some((e) => e.property === "password"), "Rejects password shorter than 8 characters");

  // 1.6 Short name (< 2 chars)
  const regShortName = plainToInstance(RegisterDto, {
    name: "A",
    identifier: "+251911223344",
    password: "SecurePassword2026!",
  });
  const regShortNameErrors = await validate(regShortName);
  assert(regShortNameErrors.some((e) => e.property === "name"), "Rejects name shorter than 2 characters");

  // ----------------------------------------------------
  // Test LoginDto
  // ----------------------------------------------------
  console.log("\n2. LoginDto Validation:");

  // 2.1 Valid Login with phone
  const loginValidPhone = plainToInstance(LoginDto, {
    identifier: "+251911223344",
    password: "SecurePassword2026!",
  });
  const loginPhoneErrors = await validate(loginValidPhone);
  assert(loginPhoneErrors.length === 0, "Accepts valid login with phone", loginPhoneErrors);

  // 2.2 Valid Login with email
  const loginValidEmail = plainToInstance(LoginDto, {
    identifier: "student@mastara.edu.et",
    password: "SecurePassword2026!",
  });
  const loginEmailErrors = await validate(loginValidEmail);
  assert(loginEmailErrors.length === 0, "Accepts valid login with email", loginEmailErrors);

  // 2.3 Short password (< 8 chars)
  const loginShortPass = plainToInstance(LoginDto, {
    identifier: "+251911223344",
    password: "short",
  });
  const loginShortPassErrors = await validate(loginShortPass);
  assert(loginShortPassErrors.some((e) => e.property === "password"), "Rejects login password < 8 characters");

  // ----------------------------------------------------
  // Test RegisterDeviceDto
  // ----------------------------------------------------
  console.log("\n3. RegisterDeviceDto Validation:");

  const devValid = plainToInstance(RegisterDeviceDto, {
    deviceId: "hardware-uuid-12345",
    deviceName: "Samsung Galaxy S23",
    platform: DevicePlatform.ANDROID,
  });
  const devErrors = await validate(devValid);
  assert(devErrors.length === 0, "Accepts valid device registration", devErrors);

  const devEmpty = plainToInstance(RegisterDeviceDto, {
    deviceId: "",
  });
  const devEmptyErrors = await validate(devEmpty);
  assert(devEmptyErrors.some((e) => e.property === "deviceId"), "Rejects empty deviceId");

  // ----------------------------------------------------
  // Test UpdateAcademicScopeDto
  // ----------------------------------------------------
  console.log("\n4. UpdateAcademicScopeDto Validation:");

  const acadValid = plainToInstance(UpdateAcademicScopeDto, {
    universityId: "b1010000-0000-0000-0000-000000000001",
    programId: "b2010000-0000-0000-0000-000000000001",
    semesterId: "b3010000-0000-0000-0000-000000000001",
    stream: StudentStreamSelection.NATURAL,
  });
  const acadErrors = await validate(acadValid);
  assert(acadErrors.length === 0, "Accepts valid academic scope with NATURAL stream", acadErrors);

  const acadInvalidUUID = plainToInstance(UpdateAcademicScopeDto, {
    universityId: "not-a-uuid",
    programId: "b2010000-0000-0000-0000-000000000001",
    semesterId: "b3010000-0000-0000-0000-000000000001",
    stream: "NATURAL",
  });
  const acadInvalidUUIDErrors = await validate(acadInvalidUUID);
  assert(acadInvalidUUIDErrors.some((e) => e.property === "universityId"), "Rejects invalid university UUID");

  const acadInvalidStream = plainToInstance(UpdateAcademicScopeDto, {
    universityId: "b1010000-0000-0000-0000-000000000001",
    programId: "b2010000-0000-0000-0000-000000000001",
    semesterId: "b3010000-0000-0000-0000-000000000001",
    stream: "INVALID_STREAM",
  });
  const acadInvalidStreamErrors = await validate(acadInvalidStream);
  assert(acadInvalidStreamErrors.some((e) => e.property === "stream"), "Rejects invalid stream value");

  // ----------------------------------------------------
  // Test UpdateCoursesDto
  // ----------------------------------------------------
  console.log("\n5. UpdateCoursesDto Validation:");

  const coursesValid = plainToInstance(UpdateCoursesDto, {
    courseIds: [
      "c1010000-0000-0000-0000-000000000001",
      "c1010000-0000-0000-0000-000000000002",
    ],
  });
  const coursesErrors = await validate(coursesValid);
  assert(coursesErrors.length === 0, "Accepts valid course UUIDs array", coursesErrors);

  const coursesEmpty = plainToInstance(UpdateCoursesDto, {
    courseIds: [],
  });
  const coursesEmptyErrors = await validate(coursesEmpty);
  assert(coursesEmptyErrors.some((e) => e.property === "courseIds"), "Rejects empty courseIds array");

  const coursesInvalidItem = plainToInstance(UpdateCoursesDto, {
    courseIds: ["c1010000-0000-0000-0000-000000000001", "not-a-uuid"],
  });
  const coursesInvalidItemErrors = await validate(coursesInvalidItem);
  assert(coursesInvalidItemErrors.some((e) => e.property === "courseIds"), "Rejects array with invalid UUID");

  // ----------------------------------------------------
  // Test EditAccountDto
  // ----------------------------------------------------
  console.log("\n6. EditAccountDto Validation:");

  const editValidPhone = plainToInstance(EditAccountDto, {
    name: "Almaz Kebede",
    identifier: "+251911223344",
  });
  const editValidPhoneErrors = await validate(editValidPhone);
  assert(editValidPhoneErrors.length === 0, "Accepts valid name and Ethiopian phone", editValidPhoneErrors);

  const editValidEmail = plainToInstance(EditAccountDto, {
    name: "Almaz Kebede",
    identifier: "almaz@mastara.edu.et",
  });
  const editValidEmailErrors = await validate(editValidEmail);
  assert(editValidEmailErrors.length === 0, "Accepts valid name and email", editValidEmailErrors);

  const editShortName = plainToInstance(EditAccountDto, {
    name: "A",
  });
  const editShortNameErrors = await validate(editShortName);
  assert(editShortNameErrors.some((e) => e.property === "name"), "Rejects name shorter than 2 characters");

  const editInvalidId = plainToInstance(EditAccountDto, {
    identifier: "invalid_phone_or_email",
  });
  const editInvalidIdErrors = await validate(editInvalidId);
  assert(editInvalidIdErrors.some((e) => e.property === "identifier"), "Rejects invalid identifier format");

  // ----------------------------------------------------
  // Test GetCoursesQueryDto (Catalog)
  // ----------------------------------------------------
  console.log("\n7. GetCoursesQueryDto Validation:");

  const validCatalogQuery = plainToInstance(GetCoursesQueryDto, {
    semesterId: "b3010000-0000-0000-0000-000000000001",
    stream: Stream.NATURAL,
  });
  const validCatalogQueryErrors = await validate(validCatalogQuery);
  assert(validCatalogQueryErrors.length === 0, "Accepts valid semester UUID and NATURAL stream", validCatalogQueryErrors);

  const missingSemesterQuery = plainToInstance(GetCoursesQueryDto, {
    stream: Stream.SOCIAL,
  });
  const missingSemesterErrors = await validate(missingSemesterQuery);
  assert(missingSemesterErrors.some((e) => e.property === "semesterId"), "Rejects missing semesterId");

  const invalidSemesterUUIDQuery = plainToInstance(GetCoursesQueryDto, {
    semesterId: "invalid-uuid-12345",
  });
  const invalidSemesterUUIDErrors = await validate(invalidSemesterUUIDQuery);
  assert(invalidSemesterUUIDErrors.some((e) => e.property === "semesterId"), "Rejects malformed semesterId UUID");

  const invalidStreamQuery = plainToInstance(GetCoursesQueryDto, {
    semesterId: "b3010000-0000-0000-0000-000000000001",
    stream: "INVALID_STREAM_SELECTION",
  });
  const invalidStreamErrors = await validate(invalidStreamQuery);
  assert(invalidStreamErrors.some((e) => e.property === "stream"), "Rejects invalid stream enum value");

  // ----------------------------------------------------
  // Test RecordProgressDto (Content)
  // ----------------------------------------------------
  console.log("\n8. RecordProgressDto Validation:");

  const validProgress = plainToInstance(RecordProgressDto, {
    scrollPosition: 0.85,
    isCompleted: true,
  });
  const validProgressErrors = await validate(validProgress);
  assert(validProgressErrors.length === 0, "Accepts valid scrollPosition and isCompleted boolean", validProgressErrors);

  const negativeScroll = plainToInstance(RecordProgressDto, {
    scrollPosition: -0.5,
  });
  const negativeScrollErrors = await validate(negativeScroll);
  assert(negativeScrollErrors.some((e) => e.property === "scrollPosition"), "Rejects negative scrollPosition");

  const invalidBool = plainToInstance(RecordProgressDto, {
    isCompleted: "not-a-bool" as any,
  });
  const invalidBoolErrors = await validate(invalidBool);
  assert(invalidBoolErrors.some((e) => e.property === "isCompleted"), "Rejects non-boolean isCompleted");

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
