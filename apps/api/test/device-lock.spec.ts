import "reflect-metadata";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "../src/infrastructure/database/database.module";
import { PrismaService } from "../src/infrastructure/database/prisma.service";
import { DevicesModule } from "../src/modules/identity/devices/devices.module";
import { DevicesService } from "../src/modules/identity/devices/services/devices.service";
import { ForbiddenException } from "@nestjs/common";
import { DevicePlatform, DeviceBindingStatus, Role, StudentStatus } from "@mastara/database";

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

async function runDeviceLockTests() {
  console.log("=== Testing Step 3: Device Lock Module (FR-004 to FR-006) ===\n");

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: [".env", "../../.env"],
      }),
      DatabaseModule,
      DevicesModule,
    ],
  }).compile();

  const devicesService = moduleFixture.get<DevicesService>(DevicesService);
  const prisma = moduleFixture.get<PrismaService>(PrismaService);

  // ----------------------------------------------------
  // 1. Setup Test Student
  // ----------------------------------------------------
  const testStudent = await prisma.student.create({
    data: {
      first_name: "Tadesse",
      last_name: "Chala",
      phone: `+2519${Math.floor(10000000 + Math.random() * 90000000)}`,
      password_hash: "hashedpass",
      role: Role.STUDENT,
      status: StudentStatus.ACTIVE,
    },
  });

  const studentId = testStudent.id;
  const initialDeviceId = "hardware-uuid-device-1";
  const secondDeviceId = "hardware-uuid-device-2";

  // ----------------------------------------------------
  // 2. Hash Verification
  // ----------------------------------------------------
  console.log("1. SHA-256 Hash Tests:");
  const hash1 = devicesService.hashDeviceId("device-abc");
  const hash2 = devicesService.hashDeviceId("device-abc");
  assert(hash1 === hash2 && hash1.length === 64, "Produces deterministic 64-char SHA-256 hex string");

  // ----------------------------------------------------
  // 3. Register First Device
  // ----------------------------------------------------
  console.log("\n2. Initial Device Registration Tests:");
  const reg1 = await devicesService.registerDevice(studentId, {
    deviceId: initialDeviceId,
    deviceName: "Samsung Galaxy A54",
    platform: DevicePlatform.ANDROID,
  });

  assert(reg1.bound === true, "Successfully registers initial device");

  const binding1 = await prisma.deviceBinding.findUnique({
    where: { student_id: studentId },
  });
  assert(
    Boolean(
      binding1 &&
        binding1.status === DeviceBindingStatus.ACTIVE &&
        binding1.device_name === "Samsung Galaxy A54" &&
        binding1.platform === DevicePlatform.ANDROID,
    ),
    "Device binding record created with ACTIVE status and metadata",
  );

  const boundLog = await prisma.securityEventLog.findFirst({
    where: { student_id: studentId, event_type: "DEVICE_BOUND" },
  });
  assert(Boolean(boundLog), "Audit log created for DEVICE_BOUND event");

  // ----------------------------------------------------
  // 4. Verify Same Device (Re-connection)
  // ----------------------------------------------------
  console.log("\n3. Same Device Verification Tests:");
  const regSame = await devicesService.registerDevice(studentId, {
    deviceId: initialDeviceId,
  });
  assert(regSame.bound === true && regSame.message === "Device verified", "Verifies matching device ID");

  // ----------------------------------------------------
  // 5. Device Mismatch Enforcement (Second Device Blocked)
  // ----------------------------------------------------
  console.log("\n4. Device Mismatch Lock Tests:");
  let mismatchThrew = false;
  let mismatchErrorCode = "";
  try {
    await devicesService.registerDevice(studentId, {
      deviceId: secondDeviceId,
      deviceName: "iPhone 15 Pro",
      platform: DevicePlatform.IOS,
    });
  } catch (e: any) {
    mismatchThrew = e instanceof ForbiddenException;
    mismatchErrorCode = e.getResponse?.()?.errorCode || "";
  }

  assert(mismatchThrew, "Rejects second hardware device with 403 ForbiddenException");
  assert(mismatchErrorCode === "DEVICE_MISMATCH_LOCKED", "Returns standard DEVICE_MISMATCH_LOCKED error code");

  const mismatchLog = await prisma.securityEventLog.findFirst({
    where: { student_id: studentId, event_type: "DEVICE_MISMATCH" },
  });
  assert(Boolean(mismatchLog), "Audit log created for DEVICE_MISMATCH event");

  // ----------------------------------------------------
  // 6. Device Status Query
  // ----------------------------------------------------
  console.log("\n5. Device Status Query Tests:");
  const statusBeforeRelease = await devicesService.getDeviceStatus(studentId);
  assert(
    statusBeforeRelease.bound === true &&
      statusBeforeRelease.status === DeviceBindingStatus.ACTIVE &&
      statusBeforeRelease.deviceName === "Samsung Galaxy A54",
    "Returns active device status details",
  );

  // ----------------------------------------------------
  // 7. Device Release
  // ----------------------------------------------------
  console.log("\n6. Device Release Tests:");
  const releaseResult = await devicesService.releaseDevice(studentId);
  assert(releaseResult.success === true, "Releases device binding successfully");

  const bindingAfterRelease = await prisma.deviceBinding.findUnique({
    where: { student_id: studentId },
  });
  assert(bindingAfterRelease?.status === DeviceBindingStatus.RELEASED, "Binding status updated to RELEASED");

  const releasedLog = await prisma.securityEventLog.findFirst({
    where: { student_id: studentId, event_type: "DEVICE_RELEASED" },
  });
  assert(Boolean(releasedLog), "Audit log created for DEVICE_RELEASED event");

  // ----------------------------------------------------
  // 8. Re-binding to New Device After Release
  // ----------------------------------------------------
  console.log("\n7. Re-binding to New Device After Release:");
  const regNew = await devicesService.registerDevice(studentId, {
    deviceId: secondDeviceId,
    deviceName: "iPhone 15 Pro",
    platform: DevicePlatform.IOS,
  });

  assert(regNew.bound === true, "Allows binding to new device after release");

  const bindingAfterRebind = await prisma.deviceBinding.findUnique({
    where: { student_id: studentId },
  });
  assert(
    bindingAfterRebind?.status === DeviceBindingStatus.ACTIVE &&
      bindingAfterRebind?.device_name === "iPhone 15 Pro" &&
      bindingAfterRebind?.platform === DevicePlatform.IOS,
    "New device bound with ACTIVE status",
  );

  // ----------------------------------------------------
  // 9. Cleanup
  // ----------------------------------------------------
  await prisma.securityEventLog.deleteMany({ where: { student_id: studentId } });
  await prisma.deviceBinding.deleteMany({ where: { student_id: studentId } });
  await prisma.student.delete({ where: { id: studentId } });

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  await moduleFixture.close();

  if (failed > 0) {
    process.exit(1);
  }
}

runDeviceLockTests().catch((err) => {
  console.error("Device lock test failed:", err);
  process.exit(1);
});
