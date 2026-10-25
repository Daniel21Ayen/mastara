import "reflect-metadata";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "../src/infrastructure/database/database.module";
import { PrismaService } from "../src/infrastructure/database/prisma.service";
import { RedisModule } from "../src/infrastructure/redis/redis.module";
import { RedisService } from "../src/infrastructure/redis/redis.service";
import { PushModule } from "../src/infrastructure/push/push.module";
import { CatalogModule } from "../src/modules/catalog/catalog.module";
import { CatalogSnapshotService } from "../src/modules/catalog/services/catalog-snapshot.service";
import { CatalogController } from "../src/modules/catalog/controllers/catalog.controller";
import { ContentModule } from "../src/modules/content/content.module";
import { ContentService } from "../src/modules/content/services/content.service";
import { QuizzesService } from "../src/modules/assessment/quizzes/services/quizzes.service";
import { ExamsService } from "../src/modules/assessment/exams/services/exams.service";
import { CocService } from "../src/modules/assessment/coc/services/coc.service";
import { AttemptsService } from "../src/modules/assessment/attempts/services/attempts.service";
import { LearningModule } from "../src/modules/learning/learning.module";
import { LearningService } from "../src/modules/learning/services/learning.service";
import { AssessmentModule } from "../src/modules/assessment/assessment.module";
import { CommonModule } from "../src/common/common.module";
import { ForbiddenException, HttpStatus } from "@nestjs/common";
import {
  EntitlementStatus,
  PublicationStatus,
  Role,
  StudentStatus,
  Stream,
  ContentKind,
  AttemptCategory,
} from "@mastara/database";
import { verifyEntitlementTokenOffline } from "@mastara/domain";

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

async function runPhase2Tests() {
  console.log("=== Testing Phase 2: Catalog Snapshot & Server Content Gatekeeper ===\n");

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: [".env", "../../.env"],
      }),
      DatabaseModule,
      CommonModule,
      RedisModule,
      PushModule,
      CatalogModule,
      ContentModule,
      AssessmentModule,
      LearningModule,
    ],
  }).compile();

  const prisma = moduleFixture.get<PrismaService>(PrismaService);
  const redisService = moduleFixture.get<RedisService>(RedisService);
  const snapshotService = moduleFixture.get<CatalogSnapshotService>(CatalogSnapshotService);
  const catalogController = moduleFixture.get<CatalogController>(CatalogController);
  const contentService = moduleFixture.get<ContentService>(ContentService);
  const quizzesService = moduleFixture.get<QuizzesService>(QuizzesService);
  const examsService = moduleFixture.get<ExamsService>(ExamsService);
  const cocService = moduleFixture.get<CocService>(CocService);
  const attemptsService = moduleFixture.get<AttemptsService>(AttemptsService);
  const learningService = moduleFixture.get<LearningService>(LearningService);

  const testId = `test_p2_${Date.now()}`;
  let unpaidStudentId = "";
  let paidStudentId = "";
  let testCourseId = "";
  let freeTopicId = "";
  let paidTopicId = "";
  let freeChapterId = "";
  let paidChapterId = "";
  let freeExamId = "";
  let paidExamId = "";
  let paidCocSetId = "";

  try {
    // --------------------------------------------------------------------------
    // Test Setup: Create university, program, semester, course, modules, topics
    // --------------------------------------------------------------------------
    const uni = await prisma.university.create({
      data: {
        code: `P2UNI_${Date.now()}`,
        name_en: "Phase 2 University",
        name_am: "ደረጃ 2 ዩኒቨርሲቲ",
        status: PublicationStatus.PUBLISHED,
        sort_order: 999,
      },
    });

    const prog = await prisma.program.create({
      data: {
        university_id: uni.id,
        code: `P2PROG_${Date.now()}`,
        name_en: "Phase 2 Program",
        name_am: "ደረጃ 2 ፕሮግራም",
        status: PublicationStatus.PUBLISHED,
        sort_order: 1,
      },
    });

    const sem = await prisma.semester.create({
      data: {
        program_id: prog.id,
        code: `P2SEM_${Date.now()}`,
        name_en: "Semester 1",
        name_am: "ሴሚስተር 1",
        status: PublicationStatus.PUBLISHED,
        sort_order: 1,
      },
    });

    const course = await prisma.course.create({
      data: {
        semester_id: sem.id,
        code: `P2CRS_${Date.now()}`,
        title_en: "Phase 2 Core Course",
        title_am: "ደረጃ 2 ዋና ትምህርት",
        stream: Stream.NATURAL,
        status: PublicationStatus.PUBLISHED,
      },
    });
    testCourseId = course.id;

    // Create 1 free module & 1 paid module
    const freeMod = await prisma.module.create({
      data: {
        course_id: course.id,
        code: "MOD-FREE",
        title_en: "Free Module",
        title_am: "ነፃ ሞጁል",
        status: PublicationStatus.PUBLISHED,
        is_free_trial: true,
        sort_order: 1,
      },
    });

    const paidMod = await prisma.module.create({
      data: {
        course_id: course.id,
        code: "MOD-PAID",
        title_en: "Paid Module",
        title_am: "የተከፈለበት ሞጁል",
        status: PublicationStatus.PUBLISHED,
        is_free_trial: false,
        sort_order: 2,
      },
    });

    // Create Free Topic with body
    const freeTop = await prisma.topic.create({
      data: {
        module_id: freeMod.id,
        chapter_number: 1,
        title_en: "Free Lesson Topic",
        title_am: "ነፃ ትምህርት",
        is_free_trial: true,
        contents: {
          create: [
            {
              kind: ContentKind.NOTE,
              version: 1,
              status: PublicationStatus.PUBLISHED,
              title: "Free Note",
              title_en: "Free Note EN",
              body: "Secret Free Content Body",
              is_free_trial: true,
            },
          ],
        },
      },
    });
    freeTopicId = freeTop.id;

    // Create Paid Topic with sensitive body
    const paidTop = await prisma.topic.create({
      data: {
        module_id: paidMod.id,
        chapter_number: 2,
        title_en: "Paid Lesson Topic",
        title_am: "የሚከፈልበት ትምህርት",
        is_free_trial: false,
        contents: {
          create: [
            {
              kind: ContentKind.NOTE,
              version: 1,
              status: PublicationStatus.PUBLISHED,
              title: "Paid Note",
              title_en: "Paid Note EN",
              body: "HIGHLY SENSITIVE PAID LESSON TEXT BODY",
              is_free_trial: false,
            },
          ],
        },
      },
    });
    paidTopicId = paidTop.id;

    // Create Quiz chapters: 1 free, 1 paid
    const freeQc = await prisma.quizChapter.create({
      data: {
        course_id: course.id,
        quiz_no: 1,
        chapter_number: 1,
        topic_id: freeTop.id,
        is_free_trial: true,
      },
    });
    freeChapterId = freeQc.id;

    const paidQc = await prisma.quizChapter.create({
      data: {
        course_id: course.id,
        quiz_no: 1,
        chapter_number: 2,
        topic_id: paidTop.id,
        is_free_trial: false,
      },
    });
    paidChapterId = paidQc.id;

    // Add Question to paid chapter
    await prisma.question.create({
      data: {
        course_id: course.id,
        topic_id: paidTop.id,
        type: "MULTIPLE_CHOICE",
        prompt_en: "Paid Question Prompt",
        prompt_am: "የተከፈለበት ጥያቄ",
        explanation_en: "Paid Explanation",
        explanation_am: "ማብራሪያ",
        options: [{ id: "1", label: "A" }, { id: "2", label: "B" }],
        correct_answers: ["1"],
        is_active: true,
      },
    });

    // Create Exams: 1 free, 1 paid
    const freeEx = await prisma.exam.create({
      data: {
        course_id: course.id,
        university_id: uni.id,
        year: 2024,
        kind: "MID",
        title_en: "Free Midterm 2024",
        status: PublicationStatus.PUBLISHED,
        is_free_trial: true,
        duration_min: 60,
      },
    });
    freeExamId = freeEx.id;

    const paidEx = await prisma.exam.create({
      data: {
        course_id: course.id,
        university_id: uni.id,
        year: 2024,
        kind: "FINAL",
        title_en: "Paid Final 2024",
        status: PublicationStatus.PUBLISHED,
        is_free_trial: false,
        duration_min: 120,
      },
    });
    paidExamId = paidEx.id;

    // Create Paid COC Set (no samples)
    const paidCoc = await prisma.cocSet.create({
      data: {
        year: 2024,
        title_en: "Paid Full COC Assessment 2024",
        status: PublicationStatus.PUBLISHED,
        is_timed: true,
        duration_min: 90,
      },
    });
    paidCocSetId = paidCoc.id;

    // Create Students: Unpaid student & Paid student
    const unpaidStudent = await prisma.student.create({
      data: {
        first_name: "Unpaid",
        last_name: "Student",
        password_hash: "hash123",
        phone: `+251999${Math.floor(100000 + Math.random() * 900000)}`,
        status: StudentStatus.ACTIVE,
        university_id: uni.id,
      },
    });
    unpaidStudentId = unpaidStudent.id;

    const paidStudent = await prisma.student.create({
      data: {
        first_name: "Paid",
        last_name: "Student",
        password_hash: "hash123",
        phone: `+251998${Math.floor(100000 + Math.random() * 900000)}`,
        status: StudentStatus.ACTIVE,
        university_id: uni.id,
      },
    });
    paidStudentId = paidStudent.id;

    // Give paidStudent an ACTIVE entitlement for testCourseId
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    await prisma.entitlement.create({
      data: {
        student_id: paidStudent.id,
        course_id: course.id,
        status: EntitlementStatus.ACTIVE,
        starts_at: new Date(),
        expires_at: futureDate,
      },
    });

    // Enroll paidStudent in testCourseId
    await prisma.studentCourse.create({
      data: {
        student_id: paidStudent.id,
        course_id: course.id,
        is_active: true,
      },
    });

    // Invalidate snapshot cache so newly created items are included
    await redisService.invalidateCatalogCache();

    console.log("-> Test fixture created successfully.\n");

    // ==========================================================================
    // 1. Catalog Snapshot Tests
    // ==========================================================================
    console.log("--- 1. Testing Catalog Snapshot Endpoint & Caching ---");

    const { snapshot, etag } = await snapshotService.getSnapshot({ page: 1, limit: 1000 });
    assert(!!snapshot, "Snapshot payload returned successfully");
    assert(Array.isArray(snapshot.items), "Snapshot contains items array");
    assert(snapshot.items.length > 0, "Snapshot contains catalog item headers");
    assert(typeof etag === "string" && etag.length > 0, "Deterministic ETag generated");

    // Verify it returns ONLY metadata headers and NEVER lesson bodies or questions
    const hasAnyBody = snapshot.items.some((item: any) => "body" in item || "content" in item);
    assert(!hasAnyBody, "Snapshot NEVER includes lesson bodies or full content");

    const hasAnyQuestions = snapshot.items.some(
      (item: any) => "questions" in item || "options" in item || "prompt" in item,
    );
    assert(!hasAnyQuestions, "Snapshot NEVER includes questions or options");

    const targetCourseHeader = snapshot.items.find(
      (item) => item.kind === "COURSE" && item.id === testCourseId,
    );
    assert(!!targetCourseHeader, "Snapshot includes created course header");
    assert(
      targetCourseHeader?.isFree !== undefined && targetCourseHeader?.order !== undefined,
      "Course header contains required fields (isFree, order, kind, title)",
    );

    // Test 304 ETag response via controller with If-None-Match
    let mockStatusCode: number | null = null;
    let mockHeaders: Record<string, string> = {};
    const mockRes: any = {
      status: (code: number) => {
        mockStatusCode = code;
        return mockRes;
      },
      setHeader: (key: string, val: string) => {
        mockHeaders[key] = val;
      },
    };

    const cachedCallResult = await catalogController.getSnapshot(
      { page: 1, limit: 100 },
      etag, // Exact matching If-None-Match
      mockRes,
    );

    assert(mockStatusCode === HttpStatus.NOT_MODIFIED, "Controller returns HTTP 304 Not Modified when ETag matches");
    assert(cachedCallResult === undefined, "Controller returns empty body on 304 Not Modified");

    // Test Delta Snapshot with `since` parameter
    const nowIso = new Date().toISOString();
    const deltaResult = await snapshotService.getSnapshot({ since: nowIso });
    assert(deltaResult.snapshot.items.length === 0, "Delta snapshot since NOW returns 0 changed items");
    assert(Array.isArray(deltaResult.snapshot.deletedIds), "Delta snapshot returns deletedIds array");

    // Test Tombstone recording and delta deletedIds
    await redisService.recordTombstone("mock-deleted-uuid-1", "COURSE");
    const deltaWithTombstone = await snapshotService.getSnapshot({ since: new Date(Date.now() - 60000).toISOString() });
    assert(
      deltaWithTombstone.snapshot.deletedIds.includes("mock-deleted-uuid-1"),
      "Delta snapshot returns deleted ID from catalog tombstone",
    );

    // ==========================================================================
    // 2. Gatekeeper: Unpaid student gets 403 on paid body endpoints
    // ==========================================================================
    console.log("\n--- 2. Testing Paid Content Gatekeeper (403 CONTENT_LOCKED) ---");

    // 2a. Topic Body: GET content/topics/:topicId
    // Free topic -> 200
    const freeTopicResult = await contentService.getTopic(unpaidStudentId, freeTopicId);
    assert(freeTopicResult.id === freeTopicId, "Unpaid student CAN access free topic body");

    // Paid topic for unpaid student -> 403 CONTENT_LOCKED
    let topicLocked = false;
    try {
      await contentService.getTopic(unpaidStudentId, paidTopicId);
    } catch (err: any) {
      const resp = err?.getResponse ? (err.getResponse() as any) : null;
      if (err instanceof ForbiddenException && (resp?.errorCode === "CONTENT_LOCKED" || err.message?.includes("CONTENT_LOCKED"))) {
        topicLocked = true;
      }
    }
    assert(topicLocked, "Unpaid student gets 403 CONTENT_LOCKED on paid topic body endpoint");

    // Paid topic for paid student -> 200
    const paidTopicResult = await contentService.getTopic(paidStudentId, paidTopicId);
    assert(paidTopicResult.id === paidTopicId, "Paid student with entitlement CAN access paid topic body");

    // 2b. Quiz Questions: GET assessment/quizzes/chapters/:chapterId/questions
    // Free chapter -> 200
    const freeChapterQuestions = await quizzesService.getChapterQuestions(unpaidStudentId, freeChapterId);
    assert(Array.isArray(freeChapterQuestions), "Unpaid student CAN access free quiz chapter questions");

    // Paid chapter for unpaid student -> 403 CONTENT_LOCKED
    let quizLocked = false;
    try {
      await quizzesService.getChapterQuestions(unpaidStudentId, paidChapterId);
    } catch (err: any) {
      const resp = err?.getResponse ? (err.getResponse() as any) : null;
      if (err instanceof ForbiddenException && (resp?.errorCode === "CONTENT_LOCKED" || err.message?.includes("CONTENT_LOCKED"))) {
        quizLocked = true;
      }
    }
    assert(quizLocked, "Unpaid student gets 403 CONTENT_LOCKED on paid quiz questions endpoint");

    // Paid chapter for paid student -> 200
    const paidChapterQuestions = await quizzesService.getChapterQuestions(paidStudentId, paidChapterId);
    assert(paidChapterQuestions.length > 0, "Paid student with entitlement CAN access paid quiz questions");

    // 2c. Exam Session: GET assessment/exams/:examId/session
    // Free exam -> 200
    const freeExamSession = await examsService.getExamSession(unpaidStudentId, freeExamId);
    assert(freeExamSession.exam.id === freeExamId, "Unpaid student CAN access free exam session");

    // Paid exam for unpaid student -> 403 CONTENT_LOCKED
    let examLocked = false;
    try {
      await examsService.getExamSession(unpaidStudentId, paidExamId);
    } catch (err: any) {
      const resp = err?.getResponse ? (err.getResponse() as any) : null;
      if (err instanceof ForbiddenException && (resp?.errorCode === "CONTENT_LOCKED" || err.message?.includes("CONTENT_LOCKED"))) {
        examLocked = true;
      }
    }
    assert(examLocked, "Unpaid student gets 403 CONTENT_LOCKED on paid exam session endpoint");

    // Paid exam for paid student -> 200
    const paidExamSession = await examsService.getExamSession(paidStudentId, paidExamId);
    assert(paidExamSession.exam.id === paidExamId, "Paid student with entitlement CAN access paid exam session");

    // 2d. COC Session: GET assessment/coc/sets/:setId/session
    let cocLocked = false;
    try {
      await cocService.getCocSession(unpaidStudentId, paidCocSetId);
    } catch (err: any) {
      const resp = err?.getResponse ? (err.getResponse() as any) : null;
      if (err instanceof ForbiddenException && (resp?.errorCode === "CONTENT_LOCKED" || err.message?.includes("CONTENT_LOCKED"))) {
        cocLocked = true;
      }
    }
    assert(cocLocked, "Unpaid student gets 403 CONTENT_LOCKED on paid COC set without samples");

    // 2e. Assessment Attempt Start: POST assessment/attempts/start
    // Paid exam start for unpaid student -> 403 CONTENT_LOCKED
    let attemptExamLocked = false;
    try {
      await attemptsService.startAttempt(unpaidStudentId, {
        category: AttemptCategory.EXAM,
        examId: paidExamId,
      });
    } catch (err: any) {
      const resp = err?.getResponse ? (err.getResponse() as any) : null;
      if (err instanceof ForbiddenException && (resp?.errorCode === "CONTENT_LOCKED" || err.message?.includes("CONTENT_LOCKED"))) {
        attemptExamLocked = true;
      }
    }
    assert(attemptExamLocked, "Unpaid student gets 403 CONTENT_LOCKED when starting paid exam attempt");

    // Paid quiz topic attempt start for unpaid student -> 403 CONTENT_LOCKED
    let attemptQuizLocked = false;
    try {
      await attemptsService.startAttempt(unpaidStudentId, {
        category: AttemptCategory.QUIZ,
        topicId: paidTopicId,
      });
    } catch (err: any) {
      const resp = err?.getResponse ? (err.getResponse() as any) : null;
      if (err instanceof ForbiddenException && (resp?.errorCode === "CONTENT_LOCKED" || err.message?.includes("CONTENT_LOCKED"))) {
        attemptQuizLocked = true;
      }
    }
    assert(attemptQuizLocked, "Unpaid student gets 403 CONTENT_LOCKED when starting paid quiz attempt");

    // Paid practice topic attempt start for unpaid student -> 403 CONTENT_LOCKED
    let attemptPracticeLocked = false;
    try {
      await attemptsService.startAttempt(unpaidStudentId, {
        category: AttemptCategory.PRACTICE,
        topicId: paidTopicId,
      });
    } catch (err: any) {
      const resp = err?.getResponse ? (err.getResponse() as any) : null;
      if (err instanceof ForbiddenException && (resp?.errorCode === "CONTENT_LOCKED" || err.message?.includes("CONTENT_LOCKED"))) {
        attemptPracticeLocked = true;
      }
    }
    assert(attemptPracticeLocked, "Unpaid student gets 403 CONTENT_LOCKED when starting paid practice attempt");

    // ==========================================================================
    // 3. Signed Entitlement Token Tests
    // ==========================================================================
    console.log("\n--- 3. Testing Signed Entitlement Token (Offline Verification) ---");

    const homeSummary = await learningService.getHomeSummary(paidStudentId);
    assert(!!homeSummary.entitlementToken, "getHomeSummary returns signed entitlementToken");
    assert(typeof homeSummary.expiresAtMs === "number", "getHomeSummary returns exact expiresAtMs");

    // Verify token validity using Ed25519 public key from domain
    if (homeSummary.entitlementToken) {
      const verified = verifyEntitlementTokenOffline(homeSummary.entitlementToken);
      assert(verified.valid, "entitlementToken verifies cryptographically using embedded public key");
      if (verified.valid) {
        assert(verified.payload.studentId === paidStudentId, "Token payload contains correct studentId");
        assert(verified.payload.courseIds.includes(testCourseId), "Token payload contains unlocked courseId");
      }
    }

    const myCourses = await learningService.getMyCourses(paidStudentId);
    const enrolledCourse = myCourses.find((c) => c.course.id === testCourseId);
    assert(!!enrolledCourse, "getMyCourses returns enrolled course");
    assert(typeof enrolledCourse?.expiresAtMs === "number", "getMyCourses includes exact expiresAtMs");

  } finally {
    // Cleanup test data
    try {
      await prisma.catalogTombstone.deleteMany({
        where: { entity_id: "mock-deleted-uuid-1" },
      });
      if (testCourseId) {
        await prisma.entitlement.deleteMany({ where: { course_id: testCourseId } });
        await prisma.attempt.deleteMany({ where: { exam_id: paidExamId } });
        await prisma.question.deleteMany({ where: { course_id: testCourseId } });
        await prisma.exam.deleteMany({ where: { course_id: testCourseId } });
        await prisma.quizChapter.deleteMany({ where: { course_id: testCourseId } });
        await prisma.content.deleteMany({ where: { topic_id: { in: [freeTopicId, paidTopicId] } } });
        await prisma.topic.deleteMany({ where: { module_id: { in: [freeTopicId, paidTopicId] } } });
        await prisma.module.deleteMany({ where: { course_id: testCourseId } });
        await prisma.course.deleteMany({ where: { id: testCourseId } });
      }
      if (paidCocSetId) {
        await prisma.cocSet.deleteMany({ where: { id: paidCocSetId } });
      }
      if (unpaidStudentId) {
        await prisma.student.deleteMany({ where: { id: { in: [unpaidStudentId, paidStudentId] } } });
      }
    } catch (e) {
      // ignore cleanup errors
    }
  }

  console.log("\n========================================");
  console.log(`Phase 2 Test Results:`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log("========================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2Tests()
  .then(() => {
    console.log("✅ Phase 2 Test Suite completed successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Phase 2 Test Suite failed with unhandled error:", err);
    process.exit(1);
  });
