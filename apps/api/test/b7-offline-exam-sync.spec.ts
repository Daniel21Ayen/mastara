import "reflect-metadata";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { DatabaseModule } from "../src/infrastructure/database/database.module";
import { PrismaService } from "../src/infrastructure/database/prisma.service";
import { OutboxService } from "../src/modules/sync/outbox/services/outbox.service";
import {
  AttemptCategory,
  AttemptState,
  PublicationStatus,
  Role,
  StudentStatus,
  Stream,
} from "@mastara/database";
import type { ExamSubmission } from "@mastara/contracts";

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

async function runOfflineExamSyncSpec() {
  console.log("=== Testing Offline Exam Sync & Anti-Cheat Validation ===\n");

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: [".env", "../../.env"],
      }),
      DatabaseModule,
    ],
  }).compile();

  const prisma = moduleFixture.get<PrismaService>(PrismaService);
  const outboxService = new OutboxService(prisma);
  const ts = Date.now();

  // Create student fixture
  const student = await prisma.student.create({
    data: {
      first_name: "Yonas",
      last_name: "Alemu",
      phone: `+251922${String(ts).slice(-6)}`,
      password_hash: "hashed_pw_sync_exam",
      role: Role.STUDENT,
      status: StudentStatus.ACTIVE,
    },
  });

  const deviceHash = `dev-hash-${ts}`;

  try {
    // --------------------------------------------------------------------------
    // 1. Normal Timed Exam Submission
    // --------------------------------------------------------------------------
    console.log("1. Normal Timed Exam Submission:");

    const sittingId1 = `sit-normal-${ts}`;
    const submission1: ExamSubmission = {
      sittingId: sittingId1,
      examId: `exam-uuid-${ts}`,
      title: "Computer Science (Mid)",
      answers: {
        "Q1": { kind: "choice", optionIds: ["opt-b"] },
        "Q2": { kind: "choice", optionIds: ["opt-a"] },
      },
      reason: "manual",
      durationMs: 60 * 60_000, // 60 mins
      elapsedMs: 42 * 60_000,  // 42 mins (well within time)
      startedAt: new Date(Date.now() - 42 * 60_000).toISOString(),
      submittedAt: new Date().toISOString(),
      provisional: { correct: 2, total: 2 },
    };

    const res1 = await outboxService.applyBatch(student.id, deviceHash, {
      ops: [
        {
          id: `op-exam-1-${ts}`,
          type: "EXAM_SUBMITTED",
          payload: submission1,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    assert(
      res1.length === 1 && res1[0]?.status === "accepted",
      "Normal exam submission accepted into outbox audit",
    );

    const attempt1 = await prisma.attempt.findFirst({
      where: {
        student_id: student.id,
        integrity_metadata: { path: ["sittingId"], equals: sittingId1 },
      },
    });

    assert(
      attempt1 !== null &&
        attempt1.is_tampered === false &&
        attempt1.correct_count === 2 &&
        attempt1.total_questions === 2 &&
        attempt1.state === AttemptState.SUBMITTED,
      "Attempt recorded with is_tampered=false and exact provisional score",
    );

    // --------------------------------------------------------------------------
    // 2. Anti-Cheat: Excessive Elapsed Time Flagging
    // --------------------------------------------------------------------------
    console.log("\n2. Anti-Cheat Integrity Verification:");

    const sittingId2 = `sit-tampered-${ts}`;
    const submission2: ExamSubmission = {
      sittingId: sittingId2,
      examId: `exam-uuid-${ts}`,
      title: "Mathematics (Final)",
      answers: {
        "Q1": { kind: "choice", optionIds: ["opt-c"] },
      },
      reason: "timeout",
      durationMs: 30 * 60_000, // 30 mins
      elapsedMs: 90 * 60_000,  // 90 mins (clock was stopped/tampered or severe overrun)
      startedAt: new Date(Date.now() - 90 * 60_000).toISOString(),
      submittedAt: new Date().toISOString(),
      provisional: { correct: 1, total: 1 },
    };

    const res2 = await outboxService.applyBatch(student.id, deviceHash, {
      ops: [
        {
          id: `op-exam-2-${ts}`,
          type: "EXAM_SUBMITTED",
          payload: submission2,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    assert(
      res2.length === 1 && res2[0]?.status === "accepted",
      "Tampered submission op accepted for auditing",
    );

    const attempt2 = await prisma.attempt.findFirst({
      where: {
        student_id: student.id,
        integrity_metadata: { path: ["sittingId"], equals: sittingId2 },
      },
    });

    assert(
      attempt2 !== null && attempt2.is_tampered === true,
      "Anti-cheat flags attempt as is_tampered=true when elapsedMs exceeds duration + grace",
    );

    // --------------------------------------------------------------------------
    // 3. Idempotency & Repeat Submissions
    // --------------------------------------------------------------------------
    console.log("\n3. Idempotency & Deduplication:");

    const resDup = await outboxService.applyBatch(student.id, deviceHash, {
      ops: [
        {
          id: `op-exam-1-${ts}`, // same op id
          type: "EXAM_SUBMITTED",
          payload: submission1,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    assert(
      resDup.length === 1 && resDup[0]?.status === "already_applied",
      "Re-submitting same op returns already_applied without side-effects",
    );

    const countAttempts = await prisma.attempt.count({
      where: {
        student_id: student.id,
        integrity_metadata: { path: ["sittingId"], equals: sittingId1 },
      },
    });

    assert(
      countAttempts === 1,
      "No duplicate attempt records created upon re-submission",
    );

  } finally {
    // Cleanup
    await prisma.outboxEvent.deleteMany({
      where: { student_id: student.id },
    }).catch(() => {});
    await prisma.attempt.deleteMany({
      where: { student_id: student.id },
    }).catch(() => {});
    await prisma.student.delete({
      where: { id: student.id },
    }).catch(() => {});
    await prisma.$disconnect();
  }

  console.log("\n========================================");
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log("========================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

void runOfflineExamSyncSpec();
