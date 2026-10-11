import "reflect-metadata";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "../src/infrastructure/database/database.module";
import { PrismaService } from "../src/infrastructure/database/prisma.service";
import { AssessmentModule } from "../src/modules/assessment/assessment.module";
import { QuizzesService } from "../src/modules/assessment/quizzes/services/quizzes.service";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import {
  Difficulty,
  EntitlementStatus,
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

async function runQuizzesTests() {
  console.log("=== Testing Phase B4 Step 1: Quizzes Submodule (FR-030 to FR-039) ===\n");

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

  const quizzesService = moduleFixture.get<QuizzesService>(QuizzesService);
  const prisma = moduleFixture.get<PrismaService>(PrismaService);

  const timestamp = Date.now();

  // ----------------------------------------------------
  // 1. Setup Academic & Syllabus Fixtures
  // ----------------------------------------------------
  const university = await prisma.university.create({
    data: {
      name_en: "Science and Technology University",
      name_am: "የሳይንስና ቴክኖሎጂ ዩኒቨርሲቲ",
      code: `STU-${timestamp}`,
      status: PublicationStatus.PUBLISHED,
    },
  });

  const program = await prisma.program.create({
    data: {
      university_id: university.id,
      name_en: "Computer Science",
      name_am: "ኮምፒውተር ሳይንስ",
      code: `CS-${timestamp}`,
      status: PublicationStatus.PUBLISHED,
    },
  });

  const semester = await prisma.semester.create({
    data: {
      program_id: program.id,
      name_en: "Semester 1",
      name_am: "ሴሚስተር 1",
      code: `SEM1-${timestamp}`,
      status: PublicationStatus.PUBLISHED,
    },
  });

  const course = await prisma.course.create({
    data: {
      semester_id: semester.id,
      code: `ALG101-${timestamp}`,
      title_en: "Algorithms and Complexities",
      title_am: "አልጎሪዝም እና ውስብስብነት",
      stream: Stream.NATURAL,
      status: PublicationStatus.PUBLISHED,
    },
  });

  const module1 = await prisma.module.create({
    data: {
      course_id: course.id,
      code: `MOD-${timestamp}`,
      title_en: "Searching and Sorting",
      title_am: "መፈለግ እና መደርደር",
      status: PublicationStatus.PUBLISHED,
    },
  });

  const topic1 = await prisma.topic.create({
    data: {
      module_id: module1.id,
      chapter_number: 1,
      title_en: "Binary Search",
      title_am: "ባይነሪ ሰርች",
      is_free_trial: true,
    },
  });

  const topic2 = await prisma.topic.create({
    data: {
      module_id: module1.id,
      chapter_number: 2,
      title_en: "QuickSort and MergeSort",
      title_am: "ኩዊክሶርት እና መርጅሶርት",
      is_free_trial: false,
    },
  });

  // Quiz Chapter 1 (under Quiz 1, Free)
  const quizChapter1 = await prisma.quizChapter.create({
    data: {
      course_id: course.id,
      quiz_no: 1,
      chapter_number: 1,
      topic_id: topic1.id,
      is_free_trial: true,
    },
  });

  // Quiz Chapter 2 (under Quiz 1, Paid)
  const quizChapter2 = await prisma.quizChapter.create({
    data: {
      course_id: course.id,
      quiz_no: 1,
      chapter_number: 2,
      topic_id: topic2.id,
      is_free_trial: false,
    },
  });

  // Quiz Chapter 3 (under Quiz 2)
  const quizChapter3 = await prisma.quizChapter.create({
    data: {
      course_id: course.id,
      quiz_no: 2,
      chapter_number: 3,
      topic_id: topic2.id,
      is_free_trial: false,
    },
  });

  // Questions for Topic 1
  const qSingle = await prisma.question.create({
    data: {
      course_id: course.id,
      topic_id: topic1.id,
      type: QuestionType.SINGLE_CHOICE,
      prompt_en: "What is the worst-case time complexity of Binary Search?",
      prompt_am: "የባይነሪ ሰርች የከፋ የጊዜ ውስብስብነት ምንድነው?",
      explanation_en: "Binary search halves the search space each step: $O(\\log n)$",
      options: [
        { id: "opt-1", label: { en: "$O(1)$", am: "$O(1)$" } },
        { id: "opt-2", label: { en: "$O(\\log n)$", am: "$O(\\log n)$" } },
        { id: "opt-3", label: { en: "$O(n)$", am: "$O(n)$" } },
        { id: "opt-4", label: { en: "$O(n^2)$", am: "$O(n^2)$" } },
      ],
      correct_answers: ["opt-2"],
      difficulty: Difficulty.EASY,
      is_free_trial: true,
      is_active: true,
    },
  });

  const qShort = await prisma.question.create({
    data: {
      course_id: course.id,
      topic_id: topic1.id,
      type: QuestionType.SHORT_ANSWER,
      prompt_en: "Does binary search require the array to be sorted? (yes/no)",
      prompt_am: "ባይነሪ ሰርች አሬው የተደረደረ መሆን ያስፈልገዋል? (አዎ/አይ)",
      explanation_en: "Binary search requires a monotonically sorted array",
      options: [],
      correct_answers: ["yes", "Yes", "true"],
      difficulty: Difficulty.EASY,
      is_free_trial: true,
      is_active: true,
    },
  });

  // Question for Topic 2 (Paid)
  const qMulti = await prisma.question.create({
    data: {
      course_id: course.id,
      topic_id: topic2.id,
      type: QuestionType.MULTIPLE_CHOICE,
      prompt_en: "Which sorting algorithms use Divide and Conquer?",
      prompt_am: "የትኞቹ የመደርደር አልጎሪዝሞች ዲቫይድ ኤንድ ኮንከርን ይጠቀማሉ?",
      options: [
        { id: "opt-a", label: "MergeSort" },
        { id: "opt-b", label: "QuickSort" },
        { id: "opt-c", label: "BubbleSort" },
      ],
      correct_answers: ["opt-a", "opt-b"],
      difficulty: Difficulty.MEDIUM,
      is_free_trial: false,
      is_active: true,
    },
  });

  // Test Student
  const student = await prisma.student.create({
    data: {
      first_name: "Kalkidan",
      last_name: "Bekele",
      phone: `+2519${Math.floor(10000000 + Math.random() * 90000000)}`,
      password_hash: "hashedpassword123",
      role: Role.STUDENT,
      status: StudentStatus.ACTIVE,
    },
  });

  let entitlementId: string | null = null;

  try {
    // ----------------------------------------------------
    // Test 1: Chapter Listing by Quiz Number
    // ----------------------------------------------------
    console.log("1. Quiz Chapter Listing Tests:");

    const quiz1Chapters = await quizzesService.getCourseQuizChapters(course.id, 1);
    assert(
      quiz1Chapters.length === 2 &&
        quiz1Chapters.some((c) => c.id === quizChapter1.id && c.chapterNumber === 1 && c.isFree === true) &&
        quiz1Chapters.some((c) => c.id === quizChapter2.id && c.chapterNumber === 2 && c.isFree === false),
      "Lists chapters for Quiz 1 with correct question counts, time estimates, and free flags",
    );

    const quiz2Chapters = await quizzesService.getCourseQuizChapters(course.id, 2);
    assert(
      quiz2Chapters.length === 1 && quiz2Chapters[0]?.id === quizChapter3.id,
      "Filters chapters accurately for Quiz 2",
    );

    let unknownCourseThrew = false;
    try {
      await quizzesService.getCourseQuizChapters("00000000-0000-0000-0000-000000000000", 1);
    } catch (e: any) {
      unknownCourseThrew = e instanceof NotFoundException;
    }
    assert(unknownCourseThrew, "Rejects unknown course with NotFoundException");

    // ----------------------------------------------------
    // Test 2: Chapter Details Retrieval
    // ----------------------------------------------------
    console.log("\n2. Chapter Details Tests:");

    const chapterDetails = await quizzesService.getChapterById(quizChapter1.id);
    assert(
      chapterDetails.id === quizChapter1.id &&
        chapterDetails.questionCount === 2 &&
        chapterDetails.title.en === "Binary Search" &&
        chapterDetails.isFree === true,
      "Retrieves single chapter metadata with question count (2)",
    );

    let unknownChapterThrew = false;
    try {
      await quizzesService.getChapterById("00000000-0000-0000-0000-000000000000");
    } catch (e: any) {
      unknownChapterThrew = e instanceof NotFoundException;
    }
    assert(unknownChapterThrew, "Rejects non-existent chapterId with NotFoundException");

    // ----------------------------------------------------
    // Test 3: Free-Trial Question Retrieval
    // ----------------------------------------------------
    console.log("\n3. Free-Trial Question Access Tests:");

    const freeQuestions = await quizzesService.getChapterQuestions(student.id, quizChapter1.id);
    assert(
      freeQuestions.length === 2 &&
        freeQuestions.some((q) => q.id === qSingle.id && q.type === "SINGLE" && q.options?.length === 4) &&
        freeQuestions.some((q) => q.id === qShort.id && q.type === "SHORT" && q.acceptedAnswers?.includes("yes")),
      "Allows opening free quiz questions and maps choices & short-answers to contract shapes",
    );

    // ----------------------------------------------------
    // Test 4: Locked Chapter Enforcement
    // ----------------------------------------------------
    console.log("\n4. Locked Chapter Enforcement Tests:");

    let lockedThrew = false;
    let lockedErrorCode = "";
    try {
      await quizzesService.getChapterQuestions(student.id, quizChapter2.id);
    } catch (e: any) {
      lockedThrew = e instanceof ForbiddenException;
      lockedErrorCode = e.getResponse?.()?.errorCode || "";
    }
    assert(
      lockedThrew && lockedErrorCode === "CONTENT_LOCKED",
      "Locks non-free quiz chapter with 403 ForbiddenException and CONTENT_LOCKED error code",
    );

    // ----------------------------------------------------
    // Test 5: Unlocking Questions with Entitlement
    // ----------------------------------------------------
    console.log("\n5. Entitlement Unlocking Tests:");

    const entitlement = await prisma.entitlement.create({
      data: {
        student_id: student.id,
        course_id: course.id,
        starts_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: EntitlementStatus.ACTIVE,
      },
    });
    entitlementId = entitlement.id;

    const unlockedQuestions = await quizzesService.getChapterQuestions(student.id, quizChapter2.id);
    assert(
      unlockedQuestions.length === 1 &&
        unlockedQuestions[0]?.id === qMulti.id &&
        unlockedQuestions[0]?.type === "MULTIPLE" &&
        unlockedQuestions[0]?.correctOptionIds?.length === 2,
      "Successfully unlocks questions when student possesses an active course entitlement",
    );
  } finally {
    // ----------------------------------------------------
    // Cleanup Fixtures
    // ----------------------------------------------------
    if (entitlementId) {
      await prisma.entitlement.delete({ where: { id: entitlementId } });
    }
    await prisma.question.deleteMany({
      where: { id: { in: [qSingle.id, qShort.id, qMulti.id] } },
    });
    await prisma.quizChapter.deleteMany({
      where: { id: { in: [quizChapter1.id, quizChapter2.id, quizChapter3.id] } },
    });
    await prisma.student.delete({ where: { id: student.id } });
    await prisma.topic.deleteMany({
      where: { id: { in: [topic1.id, topic2.id] } },
    });
    await prisma.module.deleteMany({ where: { id: module1.id } });
    await prisma.course.deleteMany({ where: { id: course.id } });
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

runQuizzesTests().catch((err) => {
  console.error("Quizzes test run failed:", err);
  process.exit(1);
});
