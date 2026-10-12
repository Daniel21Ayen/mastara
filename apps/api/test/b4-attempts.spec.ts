import "reflect-metadata";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "../src/infrastructure/database/database.module";
import { PrismaService } from "../src/infrastructure/database/prisma.service";
import { AssessmentModule } from "../src/modules/assessment/assessment.module";
import { AttemptsService } from "../src/modules/assessment/attempts/services/attempts.service";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import {
  AttemptCategory,
  AttemptState,
  Difficulty,
  EntitlementStatus,
  ExamKind,
  PublicationStatus,
  QuestionType,
  Role,
  StudentStatus,
  Stream,
} from "@mastara/database";

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

async function runAttemptsTests() {
  console.log("=== Testing Phase B4 Step 3: Attempts & Server-Side Grading Engine (FR-030 to FR-059, FR-180 to FR-185) ===\n");

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: [".env", "../../.env"],
      }),
      DatabaseModule,
      AssessmentModule,
    ],
  }).compile();

  const attemptsService = moduleFixture.get<AttemptsService>(AttemptsService);
  const prisma = moduleFixture.get<PrismaService>(PrismaService);

  const timestamp = Date.now();

  // ----------------------------------------------------
  // 1. Setup Academic & Course Fixtures
  // ----------------------------------------------------
  const university = await prisma.university.create({
    data: {
      name_en: "Addis Ababa Science & Tech",
      name_am: "አዲስ አበባ ሳይንስና ቴክኖሎጂ",
      code: `AASTU-${timestamp}`,
      status: PublicationStatus.PUBLISHED,
    },
  });

  const program = await prisma.program.create({
    data: {
      university_id: university.id,
      name_en: "Software Engineering",
      name_am: "ሶፍትዌር ኢንጂነሪንግ",
      code: `SE-${timestamp}`,
      status: PublicationStatus.PUBLISHED,
    },
  });

  const semester = await prisma.semester.create({
    data: {
      program_id: program.id,
      name_en: "Year 3 Semester 1",
      name_am: "ዓመት 3 ሴሚስተር 1",
      code: `Y3S1-${timestamp}`,
      status: PublicationStatus.PUBLISHED,
    },
  });

  const course1 = await prisma.course.create({
    data: {
      semester_id: semester.id,
      code: `DSA101-${timestamp}`,
      title_en: "Data Structures & Algorithms",
      title_am: "ዳታ ስትራክቸርስ",
      stream: Stream.NATURAL,
      status: PublicationStatus.PUBLISHED,
    },
  });

  const course2 = await prisma.course.create({
    data: {
      semester_id: semester.id,
      code: `OS101-${timestamp}`,
      title_en: "Operating Systems",
      title_am: "ኦፕሬቲንግ ሲስተምስ",
      stream: Stream.NATURAL,
      status: PublicationStatus.PUBLISHED,
    },
  });

  // ----------------------------------------------------
  // 2. Setup Diverse Questions
  // ----------------------------------------------------
  // Q1: SINGLE_CHOICE
  const qSingle = await prisma.question.create({
    data: {
      course_id: course1.id,
      type: QuestionType.SINGLE_CHOICE,
      prompt_en: "What is the worst-case time complexity of QuickSort?",
      prompt_am: "የኩዊክሶርት የከፋ ጊዜ ውስብስብነት ምንድነው?",
      explanation_en: "QuickSort degrades to O(n^2) when poor pivots are chosen.",
      options: [
        { id: "opt-1a", label: { en: "O(n^2)", am: "O(n^2)" } },
        { id: "opt-1b", label: { en: "O(n log n)", am: "O(n log n)" } },
        { id: "opt-1c", label: { en: "O(1)", am: "O(1)" } },
      ],
      correct_answers: ["opt-1a"],
      difficulty: Difficulty.MEDIUM,
      is_free_trial: true,
      is_active: true,
    },
  });

  // Q2: MULTIPLE_CHOICE
  const qMulti = await prisma.question.create({
    data: {
      course_id: course1.id,
      type: QuestionType.MULTIPLE_CHOICE,
      prompt_en: "Which of the following are self-balancing binary search trees?",
      prompt_am: "ከሚከተሉት ውስጥ እራሳቸውን የሚያስተካክሉ ዛፎች የትኞቹ ናቸው?",
      explanation_en: "AVL trees and Red-Black trees maintain logarithmic height.",
      options: [
        { id: "opt-2a", label: { en: "AVL Tree", am: "ኤቪኤል ዛፍ" } },
        { id: "opt-2b", label: { en: "Red-Black Tree", am: "ቀይ-ጥቁር ዛፍ" } },
        { id: "opt-2c", label: { en: "Linked List", am: "ሊንክድ ሊስት" } },
      ],
      correct_answers: ["opt-2a", "opt-2b"],
      difficulty: Difficulty.HARD,
      is_free_trial: true,
      is_active: true,
    },
  });

  // Q3: TRUE_FALSE
  const qTrueFalse = await prisma.question.create({
    data: {
      course_id: course1.id,
      type: QuestionType.TRUE_FALSE,
      prompt_en: "A stack is a First-In-First-Out (FIFO) data structure.",
      explanation_en: "A stack is Last-In-First-Out (LIFO); a queue is FIFO.",
      options: [
        { id: "true", label: { en: "True", am: "እውነት" } },
        { id: "false", label: { en: "False", am: "ሐሰት" } },
      ],
      correct_answers: ["false"],
      difficulty: Difficulty.EASY,
      is_free_trial: true,
      is_active: true,
    },
  });

  // Q4: SHORT_ANSWER
  const qShort = await prisma.question.create({
    data: {
      course_id: course1.id,
      type: QuestionType.SHORT_ANSWER,
      prompt_en: "How many bits are in a single standard byte?",
      explanation_en: "There are 8 bits in a standard modern byte.",
      options: [],
      correct_answers: ["8", "eight"],
      difficulty: Difficulty.EASY,
      is_free_trial: true,
      is_active: true,
    },
  });

  // Q5: COC Course 2 Question
  const qCourse2 = await prisma.question.create({
    data: {
      course_id: course2.id,
      type: QuestionType.SINGLE_CHOICE,
      prompt_en: "Which scheduling algorithm avoids starvation using aging?",
      options: [
        { id: "opt-os1", label: { en: "Priority Scheduling with Aging", am: "ፕራዮሪቲ ስኬጁሊንግ" } },
        { id: "opt-os2", label: { en: "FCFS", am: "ኤፍሲኤፍኤስ" } },
      ],
      correct_answers: ["opt-os1"],
      difficulty: Difficulty.MEDIUM,
      is_free_trial: true,
      is_active: true,
    },
  });

  // ----------------------------------------------------
  // 3. Setup Exams & COC Fixtures
  // ----------------------------------------------------
  // Free Trial Exam (4 questions, 30 min duration, passing 50%)
  const freeExam = await prisma.exam.create({
    data: {
      course_id: course1.id,
      university_id: university.id,
      kind: ExamKind.MID,
      title_en: "DSA Midterm 2024 (Free Sample)",
      duration_min: 30,
      passing_score: 50,
      is_free_trial: true,
      status: PublicationStatus.PUBLISHED,
    },
  });

  await prisma.examQuestion.createMany({
    data: [
      { exam_id: freeExam.id, question_id: qSingle.id, sort_order: 1, points: 1.0 },
      { exam_id: freeExam.id, question_id: qMulti.id, sort_order: 2, points: 1.0 },
      { exam_id: freeExam.id, question_id: qTrueFalse.id, sort_order: 3, points: 1.0 },
      { exam_id: freeExam.id, question_id: qShort.id, sort_order: 4, points: 1.0 },
    ],
  });

  // Paid Exam (requires entitlement, 45 min duration, passing 60%)
  const paidExam = await prisma.exam.create({
    data: {
      course_id: course1.id,
      university_id: university.id,
      kind: ExamKind.FINAL,
      title_en: "DSA Final Exam 2024 (Locked)",
      duration_min: 45,
      passing_score: 60,
      is_free_trial: false,
      status: PublicationStatus.PUBLISHED,
    },
  });

  await prisma.examQuestion.createMany({
    data: [
      { exam_id: paidExam.id, question_id: qSingle.id, sort_order: 1, points: 1.0 },
      { exam_id: paidExam.id, question_id: qMulti.id, sort_order: 2, points: 1.0 },
    ],
  });

  // COC Set with questions from both course1 and course2
  const cocQ1 = await prisma.cocQuestion.create({
    data: { question_id: qSingle.id, course_id: course1.id, is_free_trial: true },
  });
  const cocQ2 = await prisma.cocQuestion.create({
    data: { question_id: qCourse2.id, course_id: course2.id, is_free_trial: true },
  });

  const cocSet = await prisma.cocSet.create({
    data: {
      title_en: "National COC Assessment 2024",
      duration_min: 60,
      is_timed: true,
      status: PublicationStatus.PUBLISHED,
    },
  });

  await prisma.cocSetQuestion.createMany({
    data: [
      { coc_set_id: cocSet.id, coc_question_id: cocQ1.id, sort_order: 1 },
      { coc_set_id: cocSet.id, coc_question_id: cocQ2.id, sort_order: 2 },
    ],
  });

  // ----------------------------------------------------
  // 4. Setup Students
  // ----------------------------------------------------
  const student1 = await prisma.student.create({
    data: {
      first_name: "Student",
      last_name: "Alpha",
      phone: `+251911${String(timestamp).slice(-6)}`,
      password_hash: "hashedsecret123",
      role: Role.STUDENT,
      status: StudentStatus.ACTIVE,
    },
  });

  const student2 = await prisma.student.create({
    data: {
      first_name: "Student",
      last_name: "Beta",
      phone: `+251922${String(timestamp).slice(-6)}`,
      password_hash: "hashedsecret456",
      role: Role.STUDENT,
      status: StudentStatus.ACTIVE,
    },
  });

  let entitlementId: string | null = null;
  const createdAttemptIds: string[] = [];

  try {
    // ----------------------------------------------------
    // Test 1: Start Free Trial Exam Attempt
    // ----------------------------------------------------
    console.log("1. Starting Attempt Tests:");

    const startFreeResult = await attemptsService.startAttempt(student1.id, {
      category: AttemptCategory.EXAM,
      examId: freeExam.id,
    });
    createdAttemptIds.push(startFreeResult.id);

    assert(
      startFreeResult.state === AttemptState.STARTED &&
        startFreeResult.totalQuestions === 4 &&
        startFreeResult.durationMin === 30 &&
        startFreeResult.serverDeadlineAt !== null,
      "Starts free-trial exam attempt with 4 questions and 30-minute server deadline",
    );

    // ----------------------------------------------------
    // Test 2: Start Locked Exam without Entitlement (Blocked)
    // ----------------------------------------------------
    let lockedExamBlocked = false;
    try {
      await attemptsService.startAttempt(student1.id, {
        category: AttemptCategory.EXAM,
        examId: paidExam.id,
      });
    } catch (err: any) {
      if (err instanceof ForbiddenException) {
        const resp = err.getResponse() as any;
        lockedExamBlocked = resp.errorCode === "CONTENT_LOCKED";
      }
    }
    assert(
      lockedExamBlocked,
      "Blocks starting locked exam attempt without active entitlement (403 CONTENT_LOCKED)",
    );

    // ----------------------------------------------------
    // Test 3: Start Locked Exam with Active Entitlement
    // ----------------------------------------------------
    const entitlement = await prisma.entitlement.create({
      data: {
        student_id: student1.id,
        course_id: course1.id,
        status: EntitlementStatus.ACTIVE,
        starts_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    entitlementId = entitlement.id;

    const startPaidResult = await attemptsService.startAttempt(student1.id, {
      category: AttemptCategory.EXAM,
      examId: paidExam.id,
    });
    createdAttemptIds.push(startPaidResult.id);

    assert(
      startPaidResult.state === AttemptState.STARTED &&
        startPaidResult.totalQuestions === 2 &&
        startPaidResult.durationMin === 45,
      "Allows starting paid exam after granting active course entitlement",
    );

    // ----------------------------------------------------
    // Test 4: Start COC Set Attempt
    // ----------------------------------------------------
    const startCocResult = await attemptsService.startAttempt(student1.id, {
      category: AttemptCategory.COC,
      cocSetId: cocSet.id,
    });
    createdAttemptIds.push(startCocResult.id);

    assert(
      startCocResult.state === AttemptState.STARTED &&
        startCocResult.totalQuestions === 2 &&
        startCocResult.durationMin === 60,
      "Starts timed COC set attempt with accurate multi-course question count",
    );

    // ----------------------------------------------------
    // Test 5: Server-Side Grading Engine (Submit Answers)
    // ----------------------------------------------------
    console.log("\n2. Server-Side Grading & Submission Tests:");

    // Submit answers for startFreeResult (4 questions):
    // Q1 (SINGLE): 'opt-1a' -> CORRECT
    // Q2 (MULTI): ['opt-2a'] -> INCORRECT (requires both opt-2a and opt-2b)
    // Q3 (TRUE_FALSE): ['false'] -> CORRECT
    // Q4 (SHORT): [' 8. '] -> CORRECT (normalizeText drops punctuation and whitespace)
    const submitPayload = {
      answers: [
        {
          questionId: qSingle.id,
          selectedAnswers: ["opt-1a"],
          clientTimestamp: new Date().toISOString(),
        },
        {
          questionId: qMulti.id,
          selectedAnswers: ["opt-2a"],
          clientTimestamp: new Date().toISOString(),
        },
        {
          questionId: qTrueFalse.id,
          selectedAnswers: ["false"],
          clientTimestamp: new Date().toISOString(),
        },
        {
          questionId: qShort.id,
          selectedAnswers: [" 8. "],
          clientTimestamp: new Date().toISOString(),
        },
      ],
      elapsedMs: 600000,
    };

    const gradedResult = await attemptsService.submitAttempt(
      student1.id,
      startFreeResult.id,
      submitPayload,
    );

    assert(
      gradedResult.state === AttemptState.RESULT_AVAILABLE &&
        gradedResult.correctCount === 3 &&
        gradedResult.totalQuestions === 4 &&
        gradedResult.percentage === 75.0 &&
        gradedResult.isPassed === true &&
        gradedResult.isTampered === false,
      "Accurately grades mixed question types via @mastara/domain (3/4 = 75%, passed, not tampered)",
    );

    // ----------------------------------------------------
    // Test 6: Duplicate Submission Prevention
    // ----------------------------------------------------
    console.log("\n3. Integrity & Anti-Cheat Tests:");

    let duplicateConflict = false;
    try {
      await attemptsService.submitAttempt(
        student1.id,
        startFreeResult.id,
        submitPayload,
      );
    } catch (err: any) {
      if (err instanceof ConflictException) {
        duplicateConflict = true;
      }
    }
    assert(duplicateConflict, "Prevents duplicate submission on finalized attempt (409 ConflictException)");

    // ----------------------------------------------------
    // Test 7: Monotonic Anti-Cheat (Late Submission Beyond Deadline + Leeway)
    // ----------------------------------------------------
    // Create attempt with deadline 10 minutes in the past
    const lateAttempt = await prisma.attempt.create({
      data: {
        student_id: student1.id,
        category: AttemptCategory.EXAM,
        exam_id: freeExam.id,
        state: AttemptState.STARTED,
        total_questions: 1,
        server_started_at: new Date(Date.now() - 40 * 60 * 1000),
        server_deadline_at: new Date(Date.now() - 10 * 60 * 1000), // Expired 10 min ago
      },
    });
    createdAttemptIds.push(lateAttempt.id);

    const lateResult = await attemptsService.submitAttempt(student1.id, lateAttempt.id, {
      answers: [
        {
          questionId: qSingle.id,
          selectedAnswers: ["opt-1a"],
          clientTimestamp: new Date().toISOString(),
        },
      ],
    });

    assert(
      lateResult.isTampered === true &&
        lateResult.integrityMetadata?.reason === "EXCEEDED_SERVER_DEADLINE",
      "Flags late submission as tampered with structured integrity metadata",
    );

    // ----------------------------------------------------
    // Test 8: Cross-Student Security Protection
    // ----------------------------------------------------
    console.log("\n4. Security & Isolation Tests:");

    let crossStudentSubmitBlocked = false;
    try {
      await attemptsService.submitAttempt(student2.id, startPaidResult.id, {
        answers: [],
      });
    } catch (err: any) {
      if (err instanceof ForbiddenException) {
        crossStudentSubmitBlocked = true;
      }
    }
    assert(
      crossStudentSubmitBlocked,
      "Prevents student from submitting another student's attempt (403 Forbidden)",
    );

    let crossStudentResultBlocked = false;
    try {
      await attemptsService.getAttemptResult(student2.id, startFreeResult.id);
    } catch (err: any) {
      if (err instanceof ForbiddenException) {
        crossStudentResultBlocked = true;
      }
    }
    assert(
      crossStudentResultBlocked,
      "Prevents student from viewing another student's attempt results (403 Forbidden)",
    );

    // ----------------------------------------------------
    // Test 9: Detailed Result Retrieval & Review
    // ----------------------------------------------------
    console.log("\n5. Result Retrieval & Review Tests:");

    const reviewResult = await attemptsService.getAttemptResult(
      student1.id,
      startFreeResult.id,
    );

    const q1Review = reviewResult.answers?.find((a) => a.questionId === qSingle.id);
    const q2Review = reviewResult.answers?.find((a) => a.questionId === qMulti.id);
    const q4Review = reviewResult.answers?.find((a) => a.questionId === qShort.id);

    assert(
      reviewResult.percentage === 75.0 &&
        reviewResult.isPassed === true &&
        q1Review?.isCorrect === true &&
        q2Review?.isCorrect === false &&
        q4Review?.isCorrect === true &&
        Boolean(q1Review?.explanation?.en.includes("QuickSort degrades")) &&
        Boolean(reviewResult.byCourse[course1.id]?.total === 4),
      "Delivers full attempt review with unmasked explanations, correctness flags, and per-course totals",
    );

    // ----------------------------------------------------
    // Test 10: Multi-Course COC Result Breakdown
    // ----------------------------------------------------
    const cocGraded = await attemptsService.submitAttempt(
      student1.id,
      startCocResult.id,
      {
        answers: [
          {
            questionId: qSingle.id,
            selectedAnswers: ["opt-1a"],
            clientTimestamp: new Date().toISOString(),
          },
          {
            questionId: qCourse2.id,
            selectedAnswers: ["opt-os2"], // wrong
            clientTimestamp: new Date().toISOString(),
          },
        ],
      },
    );

    assert(
      cocGraded.correctCount === 1 &&
        cocGraded.totalQuestions === 2 &&
        cocGraded.byCourse[course1.id]?.correct === 1 &&
        cocGraded.byCourse[course1.id]?.total === 1 &&
        cocGraded.byCourse[course2.id]?.correct === 0 &&
        cocGraded.byCourse[course2.id]?.total === 1,
      "Generates accurate per-course subscore breakdown for COC attempts across multiple courses",
    );

    // ----------------------------------------------------
    // Test 11: Student Attempt History Pagination
    // ----------------------------------------------------
    console.log("\n6. Attempt History Pagination Tests:");

    const history = await attemptsService.getStudentAttempts(student1.id, {
      category: AttemptCategory.EXAM,
      page: 1,
      limit: 10,
    });

    assert(
      history.items.length >= 2 &&
        history.total >= 2 &&
        history.items.every((item) => item.category === AttemptCategory.EXAM),
      "Lists paginated student attempt history filtered by EXAM category",
    );
  } finally {
    // ----------------------------------------------------
    // Cleanup Fixtures
    // ----------------------------------------------------
    if (entitlementId) {
      await prisma.entitlement.delete({ where: { id: entitlementId } });
    }
    if (createdAttemptIds.length > 0) {
      await prisma.attemptAnswer.deleteMany({
        where: { attempt_id: { in: createdAttemptIds } },
      });
      await prisma.attempt.deleteMany({
        where: { id: { in: createdAttemptIds } },
      });
    }
    await prisma.cocSetQuestion.deleteMany({ where: { coc_set_id: cocSet.id } });
    await prisma.cocSet.deleteMany({ where: { id: cocSet.id } });
    await prisma.cocQuestion.deleteMany({
      where: { id: { in: [cocQ1.id, cocQ2.id] } },
    });
    await prisma.examQuestion.deleteMany({
      where: { exam_id: { in: [freeExam.id, paidExam.id] } },
    });
    await prisma.exam.deleteMany({
      where: { id: { in: [freeExam.id, paidExam.id] } },
    });
    await prisma.question.deleteMany({
      where: {
        id: { in: [qSingle.id, qMulti.id, qTrueFalse.id, qShort.id, qCourse2.id] },
      },
    });
    await prisma.student.deleteMany({
      where: { id: { in: [student1.id, student2.id] } },
    });
    await prisma.course.deleteMany({
      where: { id: { in: [course1.id, course2.id] } },
    });
    await prisma.semester.delete({ where: { id: semester.id } });
    await prisma.program.delete({ where: { id: program.id } });
    await prisma.university.delete({ where: { id: university.id } });
  }

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  await moduleFixture.close();

  if (failed > 0) {
    process.exit(1);
  }
}

runAttemptsTests().catch((err) => {
  console.error("Attempts test run failed:", err);
  process.exit(1);
});
