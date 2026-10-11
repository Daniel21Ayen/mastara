import "reflect-metadata";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "../src/infrastructure/database/database.module";
import { PrismaService } from "../src/infrastructure/database/prisma.service";
import { AssessmentModule } from "../src/modules/assessment/assessment.module";
import { ExamsService } from "../src/modules/assessment/exams/services/exams.service";
import { CocService } from "../src/modules/assessment/coc/services/coc.service";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import {
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

async function runExamsCocTests() {
  console.log("=== Testing Phase B4 Step 2: Past Exams & COC Submodules (FR-040 to FR-059) ===\n");

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

  const examsService = moduleFixture.get<ExamsService>(ExamsService);
  const cocService = moduleFixture.get<CocService>(CocService);
  const prisma = moduleFixture.get<PrismaService>(PrismaService);

  const timestamp = Date.now();

  // ----------------------------------------------------
  // 1. Setup Academic & Course Fixtures
  // ----------------------------------------------------
  const university = await prisma.university.create({
    data: {
      name_en: "Addis Ababa University",
      name_am: "አዲስ አበባ ዩኒቨርሲቲ",
      code: `AAU-${timestamp}`,
      status: PublicationStatus.PUBLISHED,
    },
  });

  const program = await prisma.program.create({
    data: {
      university_id: university.id,
      name_en: "Electrical Engineering",
      name_am: "ኤሌክትሪካል ኢንጂነሪንግ",
      code: `EE-${timestamp}`,
      status: PublicationStatus.PUBLISHED,
    },
  });

  const semester = await prisma.semester.create({
    data: {
      program_id: program.id,
      name_en: "Year 2 Semester 1",
      name_am: "ዓመት 2 ሴሚስተር 1",
      code: `Y2S1-${timestamp}`,
      status: PublicationStatus.PUBLISHED,
    },
  });

  const course1 = await prisma.course.create({
    data: {
      semester_id: semester.id,
      code: `CIRC101-${timestamp}`,
      title_en: "Circuit Analysis",
      title_am: "የሰርኪዩት ትንተና",
      stream: Stream.NATURAL,
      status: PublicationStatus.PUBLISHED,
    },
  });

  const course2 = await prisma.course.create({
    data: {
      semester_id: semester.id,
      code: `EMF101-${timestamp}`,
      title_en: "Electromagnetics",
      title_am: "ኤሌክትሮማግኔቲክስ",
      stream: Stream.NATURAL,
      status: PublicationStatus.PUBLISHED,
    },
  });

  // Questions for course 1
  const qExam1 = await prisma.question.create({
    data: {
      course_id: course1.id,
      type: QuestionType.SINGLE_CHOICE,
      prompt_en: "What is Ohm's Law formula for DC circuits?",
      prompt_am: "የኦህም ህግ ቀመር ምንድነው?",
      explanation_en: "$V = I \\times R$",
      options: [
        { id: "o-1", label: "$V = I R$" },
        { id: "o-2", label: "$V = I / R$" },
      ],
      correct_answers: ["o-1"],
      difficulty: Difficulty.EASY,
      is_free_trial: true,
      is_active: true,
    },
  });

  const qExam2 = await prisma.question.create({
    data: {
      course_id: course1.id,
      type: QuestionType.TRUE_FALSE,
      prompt_en: "Is Kirchhoff's Current Law based on charge conservation?",
      prompt_am: "የኪርቾፍ ከረንት ህግ በቻርጅ ጥበቃ ላይ የተመሰረተ ነው?",
      options: [
        { id: "true-opt", label: "True" },
        { id: "false-opt", label: "False" },
      ],
      correct_answers: ["true-opt"],
      difficulty: Difficulty.MEDIUM,
      is_free_trial: false,
      is_active: true,
    },
  });

  // Question for course 2
  const qExam3 = await prisma.question.create({
    data: {
      course_id: course2.id,
      type: QuestionType.SHORT_ANSWER,
      prompt_en: "Name the law relating electric field flux to enclosed charge.",
      prompt_am: "የኤሌክትሪክ ፍሰትን ከተከበበ ቻርጅ ጋር የሚያገናኘው ህግ ማን ይባላል?",
      options: [],
      correct_answers: ["Gauss's Law", "Gauss Law", "Gauss"],
      difficulty: Difficulty.HARD,
      is_free_trial: false,
      is_active: true,
    },
  });

  // Exam 1: Mid Exam (Free Sample)
  const examMid = await prisma.exam.create({
    data: {
      course_id: course1.id,
      university_id: university.id,
      kind: ExamKind.MID,
      title_en: "Midterm Exam 2024",
      title_am: "የግማሽ ዓመት ፈተና 2024",
      year: 2024,
      duration_min: 90,
      is_free_trial: true,
      status: PublicationStatus.PUBLISHED,
    },
  });

  await prisma.examQuestion.create({
    data: {
      exam_id: examMid.id,
      question_id: qExam1.id,
      sort_order: 1,
    },
  });

  // Exam 2: Final Exam (Paid)
  const examFinal = await prisma.exam.create({
    data: {
      course_id: course1.id,
      university_id: university.id,
      kind: ExamKind.FINAL,
      title_en: "Final Exam 2024",
      title_am: "የመጨረሻ ፈተና 2024",
      year: 2024,
      duration_min: 120,
      is_free_trial: false,
      status: PublicationStatus.PUBLISHED,
    },
  });

  await prisma.examQuestion.create({
    data: {
      exam_id: examFinal.id,
      question_id: qExam2.id,
      sort_order: 1,
    },
  });

  // COC Fixtures: COC Questions
  const cocQ1 = await prisma.cocQuestion.create({
    data: {
      question_id: qExam1.id,
      course_id: course1.id,
      year: 2025,
      is_free_trial: true,
    },
  });

  const cocQ2 = await prisma.cocQuestion.create({
    data: {
      question_id: qExam3.id,
      course_id: course2.id,
      year: 2025,
      is_free_trial: false,
    },
  });

  // COC Set
  const cocSet = await prisma.cocSet.create({
    data: {
      title_en: "National Engineering Exit Exam Set A",
      title_am: "ብሔራዊ የምህንድስና መውጫ ፈተና ቅጽ ሀ",
      year: 2025,
      is_timed: true,
      duration_min: 150,
      sample_question_count: 5,
      status: PublicationStatus.PUBLISHED,
    },
  });

  await prisma.cocSetQuestion.create({
    data: {
      coc_set_id: cocSet.id,
      coc_question_id: cocQ1.id,
      sort_order: 1,
      is_sample: true,
    },
  });

  await prisma.cocSetQuestion.create({
    data: {
      coc_set_id: cocSet.id,
      coc_question_id: cocQ2.id,
      sort_order: 2,
      is_sample: false,
    },
  });

  // Test Student
  const student = await prisma.student.create({
    data: {
      first_name: "Tigist",
      last_name: "Mulugeta",
      phone: `+2519${Math.floor(10000000 + Math.random() * 90000000)}`,
      password_hash: "hashedsecret789",
      role: Role.STUDENT,
      status: StudentStatus.ACTIVE,
    },
  });

  let entitlementId: string | null = null;

  try {
    // ----------------------------------------------------
    // Test 1: Course Exams Listing & Kind Filtering
    // ----------------------------------------------------
    console.log("1. Course Exams Listing Tests:");

    const allExams = await examsService.getCourseExams(course1.id);
    assert(
      allExams.length === 2 &&
        allExams.some((item) => item.exam.id === examMid.id && item.exam.kind === ExamKind.MID) &&
        allExams.some((item) => item.exam.id === examFinal.id && item.exam.kind === ExamKind.FINAL),
      "Lists all published exams for course with university metadata",
    );

    const midOnly = await examsService.getCourseExams(course1.id, ExamKind.MID);
    assert(
      midOnly.length === 1 && midOnly[0]?.exam.id === examMid.id && midOnly[0]?.university.code === `AAU-${timestamp}`,
      "Filters course exams by ExamKind (MID only)",
    );

    let unknownCourseThrew = false;
    try {
      await examsService.getCourseExams("00000000-0000-0000-0000-000000000000");
    } catch (e: any) {
      unknownCourseThrew = e instanceof NotFoundException;
    }
    assert(unknownCourseThrew, "Rejects unknown course with NotFoundException");

    // ----------------------------------------------------
    // Test 2: Free-Trial Exam Session Access
    // ----------------------------------------------------
    console.log("\n2. Free Exam Session Delivery Tests:");

    const freeSession = await examsService.getExamSession(student.id, examMid.id);
    assert(
      freeSession.exam.id === examMid.id &&
        freeSession.exam.isFree === true &&
        freeSession.university.name === "Addis Ababa University" &&
        freeSession.questions.length === 1 &&
        Boolean(freeSession.questions[0]?.prompt.en.includes("Ohm's Law")),
      "Allows taking free-trial exam session without requiring course entitlement",
    );

    // ----------------------------------------------------
    // Test 3: Locked Exam Session Access
    // ----------------------------------------------------
    console.log("\n3. Locked Exam Enforcement Tests:");

    let examLockedThrew = false;
    let examLockedErrorCode = "";
    try {
      await examsService.getExamSession(student.id, examFinal.id);
    } catch (e: any) {
      examLockedThrew = e instanceof ForbiddenException;
      examLockedErrorCode = e.getResponse?.()?.errorCode || "";
    }
    assert(
      examLockedThrew && examLockedErrorCode === "CONTENT_LOCKED",
      "Blocks locked exam with 403 ForbiddenException and CONTENT_LOCKED error code",
    );

    // ----------------------------------------------------
    // Test 4: Unlocking Exam with Entitlement
    // ----------------------------------------------------
    console.log("\n4. Exam Unlocking Tests:");

    const entitlement = await prisma.entitlement.create({
      data: {
        student_id: student.id,
        course_id: course1.id,
        starts_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: EntitlementStatus.ACTIVE,
      },
    });
    entitlementId = entitlement.id;

    const unlockedSession = await examsService.getExamSession(student.id, examFinal.id);
    assert(
      unlockedSession.exam.id === examFinal.id &&
        unlockedSession.questions.length === 1 &&
        Boolean(unlockedSession.questions[0]?.prompt.en.includes("Kirchhoff")),
      "Unlocks paid exam session after granting active course entitlement",
    );

    // ----------------------------------------------------
    // Test 5: COC Sets Listing
    // ----------------------------------------------------
    console.log("\n5. COC Sets Listing Tests:");

    const cocSets = await cocService.getCocSets();
    assert(
      cocSets.some(
        (cs) =>
          cs.id === cocSet.id &&
          cs.minutes === 150 &&
          cs.questionCount === 2 &&
          cs.courseCount === 2 &&
          cs.isFree === true,
      ),
      "Lists published COC sets with multi-course counts (2 courses) and duration (150 min)",
    );

    // ----------------------------------------------------
    // Test 6: COC Session Delivery
    // ----------------------------------------------------
    console.log("\n6. COC Session Delivery Tests:");

    const cocSession = await cocService.getCocSession(student.id, cocSet.id);
    assert(
      cocSession.set.id === cocSet.id &&
        cocSession.questions.length === 2 &&
        cocSession.courseTitles[course1.id] === "Circuit Analysis" &&
        cocSession.courseTitles[course2.id] === "Electromagnetics",
      "Delivers COC session with multi-course questions and per-course title lookup dictionary",
    );
  } finally {
    // ----------------------------------------------------
    // Cleanup Fixtures
    // ----------------------------------------------------
    if (entitlementId) {
      await prisma.entitlement.delete({ where: { id: entitlementId } });
    }
    await prisma.cocSetQuestion.deleteMany({ where: { coc_set_id: cocSet.id } });
    await prisma.cocSet.deleteMany({ where: { id: cocSet.id } });
    await prisma.cocQuestion.deleteMany({
      where: { id: { in: [cocQ1.id, cocQ2.id] } },
    });
    await prisma.examQuestion.deleteMany({
      where: { exam_id: { in: [examMid.id, examFinal.id] } },
    });
    await prisma.exam.deleteMany({
      where: { id: { in: [examMid.id, examFinal.id] } },
    });
    await prisma.question.deleteMany({
      where: { id: { in: [qExam1.id, qExam2.id, qExam3.id] } },
    });
    await prisma.student.delete({ where: { id: student.id } });
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

runExamsCocTests().catch((err) => {
  console.error("Exams & COC test run failed:", err);
  process.exit(1);
});
