import "reflect-metadata";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "../src/infrastructure/database/database.module";
import { PrismaService } from "../src/infrastructure/database/prisma.service";
import { CatalogModule } from "../src/modules/catalog/catalog.module";
import { CatalogService } from "../src/modules/catalog/services/catalog.service";
import { ContentModule } from "../src/modules/content/content.module";
import { ContentService } from "../src/modules/content/services/content.service";
import { LearningModule } from "../src/modules/learning/learning.module";
import { LearningService } from "../src/modules/learning/services/learning.service";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import {
  EntitlementStatus,
  PublicationStatus,
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

async function runPhaseB3Tests() {
  console.log("=== Testing Phase B3: Catalog, Content Delivery & Learning Modules ===\n");

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: [".env", "../../.env"],
      }),
      DatabaseModule,
      CatalogModule,
      ContentModule,
      LearningModule,
    ],
  }).compile();

  const catalogService = moduleFixture.get<CatalogService>(CatalogService);
  const contentService = moduleFixture.get<ContentService>(ContentService);
  const learningService = moduleFixture.get<LearningService>(LearningService);
  const prisma = moduleFixture.get<PrismaService>(PrismaService);

  const timestamp = Date.now();

  // ----------------------------------------------------
  // 1. Setup Academic Fixtures
  // ----------------------------------------------------
  const university = await prisma.university.create({
    data: {
      name_en: "Addis Ababa Science & Tech University",
      name_am: "አዲስ አበባ ሳይንስ እና ቴክኖሎጂ ዩኒቨርሲቲ",
      code: `AASTU-${timestamp}`,
      status: PublicationStatus.PUBLISHED,
      sort_order: 1,
    },
  });

  const program = await prisma.program.create({
    data: {
      university_id: university.id,
      name_en: "Software Engineering",
      name_am: "ሶፍትዌር ኢንጂነሪንግ",
      code: `SE-${timestamp}`,
      status: PublicationStatus.PUBLISHED,
      sort_order: 1,
    },
  });

  const semester = await prisma.semester.create({
    data: {
      program_id: program.id,
      name_en: "Year 1 Semester 2",
      name_am: "ዓመት 1 ሴሚስተር 2",
      code: `SEM2-${timestamp}`,
      status: PublicationStatus.PUBLISHED,
      sort_order: 2,
    },
  });

  // Course 1: Natural stream
  const courseNat = await prisma.course.create({
    data: {
      semester_id: semester.id,
      code: `CS101-${timestamp}`,
      title_en: "Data Structures & Algorithms",
      title_am: "የመረጃ አወቃቀር እና አልጎሪዝም",
      stream: Stream.NATURAL,
      status: PublicationStatus.PUBLISHED,
      sort_order: 1,
    },
  });

  // Course 2: Social stream
  const courseSoc = await prisma.course.create({
    data: {
      semester_id: semester.id,
      code: `ECON101-${timestamp}`,
      title_en: "Principles of Microeconomics",
      title_am: "የማይክሮ ኢኮኖሚክስ መርሆዎች",
      stream: Stream.SOCIAL,
      status: PublicationStatus.PUBLISHED,
      sort_order: 2,
    },
  });

  // Course 3: Common stream
  const courseCom = await prisma.course.create({
    data: {
      semester_id: semester.id,
      code: `COMM101-${timestamp}`,
      title_en: "Communicative English",
      title_am: "የመግባቢያ እንግሊዝኛ",
      stream: Stream.COMMON,
      status: PublicationStatus.PUBLISHED,
      sort_order: 3,
    },
  });

  // Setup Content Fixtures for courseNat
  const module1 = await prisma.module.create({
    data: {
      course_id: courseNat.id,
      code: `MOD1-${timestamp}`,
      title_en: "Algorithm Analysis & Asymptotics",
      title_am: "የአልጎሪዝም ትንተና እና አሲምፕቶቲክስ",
      description_en: "Introduction to Big-O notation and complexity",
      description_am: "የቢግ-ኦ ማስታወሻ እና የውስብስብነት መግቢያ",
      is_free_trial: false,
      status: PublicationStatus.PUBLISHED,
      sort_order: 1,
    },
  });

  // Topic 1: Free Trial
  const topic1 = await prisma.topic.create({
    data: {
      module_id: module1.id,
      chapter_number: 1,
      title_en: "Introduction to Asymptotic Notation",
      title_am: "የአሲምፕቶቲክ ኖቴሽን መግቢያ",
      is_free_trial: true,
      sort_order: 1,
    },
  });

  await prisma.content.create({
    data: {
      topic_id: topic1.id,
      version: 1,
      title_en: "Big O, Omega and Theta Notation",
      title_am: "ቢግ ኦ፣ ኦሜጋ እና ቴታ ኖቴሽን",
      body_en: "The time complexity is expressed as $T(n) = O(n \\log n)$ with matrix equations $$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$",
      body_am: "የጊዜ ውስብስብነት በ $T(n) = O(n \\log n)$ ይገለጻል",
      is_free_trial: true,
      status: PublicationStatus.PUBLISHED,
    },
  });

  // Topic 2: Paid locked topic
  const topic2 = await prisma.topic.create({
    data: {
      module_id: module1.id,
      chapter_number: 2,
      title_en: "Master Theorem and Recurrences",
      title_am: "ማስተር ቴዎረም እና ሪከረንስ",
      is_free_trial: false,
      sort_order: 2,
    },
  });

  await prisma.content.create({
    data: {
      topic_id: topic2.id,
      version: 1,
      title_en: "Solving Recurrences with Master Theorem",
      title_am: "ሪከረንሶችን በማስተር ቴዎረም መፍታት",
      body_en: "For recurrences of form $T(n) = aT(n/b) + f(n)$...",
      body_am: "ለ $T(n) = aT(n/b) + f(n)$ አይነት ሪከረንሶች...",
      is_free_trial: false,
      status: PublicationStatus.PUBLISHED,
    },
  });

  // Setup Test Student
  const student = await prisma.student.create({
    data: {
      first_name: "Yonas",
      last_name: "Haile",
      phone: `+2519${Math.floor(10000000 + Math.random() * 90000000)}`,
      password_hash: "hashedpass123",
      role: Role.STUDENT,
      status: StudentStatus.ACTIVE,
      university_id: university.id,
      program_id: program.id,
      semester_id: semester.id,
      stream_pref: Stream.NATURAL,
    },
  });

  let entitlementId: string | null = null;

  try {
    // ----------------------------------------------------
    // Test 1: Academic Catalog Module
    // ----------------------------------------------------
    console.log("1. Catalog Module Tests:");

    const universities = await catalogService.getUniversities();
    assert(
      universities.some((u) => u.id === university.id && u.shortName === `AASTU-${timestamp}`),
      "Lists published universities with code and name mapping",
    );

    const programs = await catalogService.getPrograms(university.id);
    assert(
      programs.some((p) => p.id === program.id && p.universityId === university.id),
      "Lists published programs for the university",
    );

    let unknownUniThrew = false;
    try {
      await catalogService.getPrograms("00000000-0000-0000-0000-000000000000");
    } catch (e: any) {
      unknownUniThrew = e instanceof NotFoundException;
    }
    assert(unknownUniThrew, "Rejects unknown universityId with NotFoundException");

    const semesters = await catalogService.getSemesters(program.id);
    assert(
      semesters.some((s) => s.id === semester.id && s.number === 2),
      "Lists semesters with parsed semester number (2)",
    );

    // Stream filtering: NATURAL stream should return NATURAL + COMMON courses (not SOCIAL)
    const naturalCourses = await catalogService.getCourses({
      semesterId: semester.id,
      stream: Stream.NATURAL,
    });
    assert(
      naturalCourses.some((c) => c.id === courseNat.id) &&
        naturalCourses.some((c) => c.id === courseCom.id) &&
        !naturalCourses.some((c) => c.id === courseSoc.id),
      "Filters courses for NATURAL stream, including COMMON and excluding SOCIAL",
    );

    // Stream filtering: SOCIAL stream should return SOCIAL + COMMON courses (not NATURAL)
    const socialCourses = await catalogService.getCourses({
      semesterId: semester.id,
      stream: Stream.SOCIAL,
    });
    assert(
      socialCourses.some((c) => c.id === courseSoc.id) &&
        socialCourses.some((c) => c.id === courseCom.id) &&
        !socialCourses.some((c) => c.id === courseNat.id),
      "Filters courses for SOCIAL stream, including COMMON and excluding NATURAL",
    );

    const singleCourse = await catalogService.getCourseById(courseNat.id);
    assert(
      singleCourse.id === courseNat.id && singleCourse.code === `CS101-${timestamp}`,
      "Retrieves single course details",
    );

    // ----------------------------------------------------
    // Test 2: Content Delivery Module & Entitlement Enforcement
    // ----------------------------------------------------
    console.log("\n2. Content Delivery & Entitlement Lock Tests:");

    const topics = await contentService.getCourseTopics(student.id, courseNat.id);
    assert(
      topics.length === 2 &&
        topics[0]?.isFree === true &&
        topics[1]?.isFree === false,
      "Lists course syllabus topics with correct free-trial flags",
    );

    // Free topic accessible without payment
    const freeTopic = await contentService.getTopic(student.id, topic1.id);
    assert(
      freeTopic.id === topic1.id &&
        freeTopic.isFree === true &&
        freeTopic.body.en.includes("T(n) = O(n \\log n)"),
      "Permits opening free-trial topic with bilingual content and math formulas",
    );

    // Paid topic locked when student has no active entitlement
    let lockedThrew = false;
    let lockedErrorCode = "";
    try {
      await contentService.getTopic(student.id, topic2.id);
    } catch (e: any) {
      lockedThrew = e instanceof ForbiddenException;
      lockedErrorCode = e.getResponse?.()?.errorCode || "";
    }
    assert(
      lockedThrew && lockedErrorCode === "CONTENT_LOCKED",
      "Locks non-free topic with 403 ForbiddenException and CONTENT_LOCKED error code",
    );

    // Record reading progress on topic 1
    const progressRes = await contentService.recordProgress(student.id, topic1.id, {
      scrollPosition: 0.85,
      isCompleted: true,
    });
    assert(
      progressRes.success && progressRes.isCompleted === true && progressRes.scrollPosition === 0.85,
      "Records reading progress and completion in database",
    );

    const recheckTopic1 = await contentService.getTopic(student.id, topic1.id);
    assert(
      recheckTopic1.readingProgress?.isCompleted === true &&
        recheckTopic1.readingProgress?.scrollPosition === 0.85,
      "Reflects recorded reading progress in topic details",
    );

    // ----------------------------------------------------
    // Test 3: Learning Module (My Courses & Home Summary)
    // ----------------------------------------------------
    console.log("\n3. Learning Module & Entitlement Unlock Tests:");

    // Enroll student in courseNat
    await prisma.studentCourse.create({
      data: {
        student_id: student.id,
        course_id: courseNat.id,
        is_active: true,
      },
    });

    // Before purchasing: course is in list with access: LOCKED
    const myCoursesBefore = await learningService.getMyCourses(student.id);
    assert(
      myCoursesBefore.length === 1 &&
        myCoursesBefore[0]?.access === "LOCKED" &&
        myCoursesBefore[0]?.chaptersDone === 1 &&
        myCoursesBefore[0]?.chaptersTotal === 2,
      "Returns enrolled course with access=LOCKED and chaptersDone=1/2 before entitlement",
    );

    // Grant active 30-day entitlement for courseNat
    const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const entitlement = await prisma.entitlement.create({
      data: {
        student_id: student.id,
        course_id: courseNat.id,
        starts_at: new Date(),
        expires_at: expiryDate,
        status: EntitlementStatus.ACTIVE,
      },
    });
    entitlementId = entitlement.id;

    // After entitlement: course access is PAID with remaining days
    const myCoursesAfter = await learningService.getMyCourses(student.id);
    assert(
      myCoursesAfter.length === 1 &&
        myCoursesAfter[0]?.access === "PAID" &&
        typeof myCoursesAfter[0]?.daysLeft === "number" &&
        (myCoursesAfter[0]?.daysLeft ?? 0) >= 29,
      "Updates course access to PAID with calculated daysLeft after entitlement creation",
    );

    // Now topic 2 (paid topic) must be unlocked!
    const unlockedTopic2 = await contentService.getTopic(student.id, topic2.id);
    assert(
      unlockedTopic2.id === topic2.id &&
        unlockedTopic2.accessState === "PAID" &&
        unlockedTopic2.title.en.includes("Master Theorem"),
      "Unlocks paid lesson once active entitlement is detected",
    );

    // Test Home Dashboard Summary
    const homeSummary = await learningService.getHomeSummary(student.id);
    assert(
      homeSummary.continueLearning !== null &&
        homeSummary.continueLearning.courseId === courseNat.id &&
        homeSummary.continueLearning.chapterNumber === 2 &&
        homeSummary.continueLearning.percent === 50 &&
        homeSummary.chaptersDone === 1 &&
        homeSummary.chaptersTotal === 2 &&
        homeSummary.activeProducts === 1 &&
        homeSummary.recent.length >= 1 &&
        homeSummary.recent[0]?.title === topic1.title_en,
      "Generates accurate home summary with continue learning card (50%), active products, and recent activity",
    );
  } finally {
    // ----------------------------------------------------
    // Cleanup Fixtures
    // ----------------------------------------------------
    if (entitlementId) {
      await prisma.entitlement.delete({ where: { id: entitlementId } });
    }
    await prisma.readingProgress.deleteMany({ where: { student_id: student.id } });
    await prisma.studentCourse.deleteMany({ where: { student_id: student.id } });
    await prisma.student.delete({ where: { id: student.id } });
    await prisma.content.deleteMany({
      where: { topic_id: { in: [topic1.id, topic2.id] } },
    });
    await prisma.topic.deleteMany({
      where: { id: { in: [topic1.id, topic2.id] } },
    });
    await prisma.module.deleteMany({ where: { id: module1.id } });
    await prisma.course.deleteMany({
      where: { id: { in: [courseNat.id, courseSoc.id, courseCom.id] } },
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

runPhaseB3Tests().catch((err) => {
  console.error("Phase B3 test run failed:", err);
  process.exit(1);
});
