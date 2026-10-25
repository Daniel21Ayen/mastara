import "reflect-metadata";
import { PublicationStatus, Stream, ExamKind } from "@mastara/database";
import { CatalogService } from "../src/modules/catalog/services/catalog.service";
import { ContentService } from "../src/modules/content/services/content.service";
import { ExamsService } from "../src/modules/assessment/exams/services/exams.service";
import { QuizzesService } from "../src/modules/assessment/quizzes/services/quizzes.service";
import { CocService } from "../src/modules/assessment/coc/services/coc.service";
import { LearningService } from "../src/modules/learning/services/learning.service";

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

async function runParityTests() {
  console.log("=== Parity Tests: Admin vs Student Visibility Parity ===\n");

  const adminId = "admin-parity-1";
  const studentId = "student-parity-1";

  // In-memory relational store
  const universities: any[] = [];
  const programs: any[] = [];
  const semesters: any[] = [];
  const courses: any[] = [];
  const modules: any[] = [];
  const topics: any[] = [];
  const examSets: any[] = [];
  const quizChapters: any[] = [];
  const cocSets: any[] = [];
  const students: any[] = [
    {
      id: studentId,
      semester_id: "sem-p-1",
      stream_pref: Stream.NATURAL,
      status: "ACTIVE",
    },
  ];

  const mockPrisma: any = {
    university: {
      findMany: async ({ where }: any = {}) => {
        return universities.filter((u) => !where?.status || u.status === where.status);
      },
      findUnique: async ({ where }: any) => {
        const u = universities.find((x) => x.id === where.id || x.code === where.code);
        return u ? { ...u, _count: { programs: 0, students: 0 } } : null;
      },
      findFirst: async ({ where }: any) => universities.find((u) => u.id === where.id || u.code === where.code) || null,
      create: async ({ data }: any) => {
        const item = { ...data, id: data.id || `uni-${Date.now()}` };
        universities.push(item);
        return item;
      },
      update: async ({ where, data }: any) => {
        const item = universities.find((u) => u.id === where.id);
        if (item) Object.assign(item, data);
        return item ? { ...item, _count: { programs: 0, students: 0 } } : null;
      },
    },
    program: {
      findMany: async ({ where }: any = {}) => {
        return programs.filter((p) => {
          if (where?.university_id && p.university_id !== where.university_id) return false;
          if (where?.status && p.status !== where.status) return false;
          return true;
        });
      },
      findUnique: async ({ where }: any) => {
        const p = programs.find((x) => x.id === where.id || x.code === where.code);
        const uni = universities.find((u) => u.id === p?.university_id) || { code: 'AAU' };
        return p ? { ...p, university: uni, semesters: [], _count: { students: 0 } } : null;
      },
      findFirst: async ({ where }: any) => programs.find((p) => p.id === where.id || p.code === where.code) || null,
      create: async ({ data }: any) => {
        const item = { ...data, id: data.id || `prog-${Date.now()}` };
        programs.push(item);
        return item;
      },
      update: async ({ where, data }: any) => {
        const item = programs.find((p) => p.id === where.id);
        if (item) Object.assign(item, data);
        const uni = universities.find((u) => u.id === item?.university_id) || { code: 'AAU' };
        return item ? { ...item, university: uni, semesters: [], _count: { students: 0 } } : null;
      },
    },
    semester: {
      findMany: async ({ where }: any = {}) => {
        return semesters.filter((s) => {
          if (where?.program_id && s.program_id !== where.program_id) return false;
          if (where?.status && s.status !== where.status) return false;
          return true;
        });
      },
      findUnique: async ({ where }: any) => {
        const s = semesters.find((x) => x.id === where.id);
        const rawProg = programs.find((p) => p.id === s?.program_id);
        const uni = universities.find((u) => u.id === rawProg?.university_id) || { code: 'AAU' };
        const prog = rawProg ? { ...rawProg, university: uni } : { name_en: 'Pre Eng', university: { code: 'AAU' } };
        return s ? { ...s, program: prog, courses: courses.filter((c) => c.semester_id === s.id) } : null;
      },
      findFirst: async ({ where }: any) => semesters.find((s) => s.id === where.id) || null,
      create: async ({ data }: any) => {
        const item = { ...data, id: data.id || `sem-${Date.now()}` };
        semesters.push(item);
        return item;
      },
      createMany: async ({ data }: any) => {
        const items = Array.isArray(data) ? data : [data];
        let idx = 0;
        items.forEach((item: any) => {
          idx++;
          semesters.push({ ...item, id: item.id || `sem-${Date.now()}-${idx}` });
        });
        return { count: items.length };
      },
      update: async ({ where, data }: any) => {
        const item = semesters.find((s) => s.id === where.id);
        if (item) Object.assign(item, data);
        const rawProg = programs.find((p) => p.id === item?.program_id);
        const uni = universities.find((u) => u.id === rawProg?.university_id) || { code: 'AAU' };
        const prog = rawProg ? { ...rawProg, university: uni } : { name_en: 'Pre Eng', university: { code: 'AAU' } };
        return item ? { ...item, program: prog, courses: courses.filter((c) => c.semester_id === item.id) } : null;
      },
    },
    course: {
      findMany: async ({ where }: any = {}) => {
        return courses.filter((c) => {
          if (where?.semester_id && c.semester_id !== where.semester_id) return false;
          if (where?.status && c.status !== where.status) return false;
          if (where?.stream?.in && !where.stream.in.includes(c.stream)) return false;
          return true;
        });
      },
      findUnique: async ({ where }: any) => {
        const c = courses.find((x) => x.id === where.id || x.code === where.code);
        const sem = semesters.find((s) => s.id === c?.semester_id) || {
          program: { university: { code: 'AAU' } },
        };
        return c ? { ...c, semester: sem } : null;
      },
      findFirst: async ({ where }: any) => {
        return (
          courses.find((c) => {
            if (where?.id?.not && c.id === where.id.not) return false;
            if (where?.id && c.id !== where.id) return false;
            if (where?.code && c.code !== where.code) return false;
            if (where?.semester_id && c.semester_id !== where.semester_id) return false;
            return true;
          }) || null
        );
      },
      create: async ({ data }: any) => {
        const item = { ...data, id: data.id || `course-${Date.now()}` };
        courses.push(item);
        const sem = semesters.find((s) => s.id === item.semester_id);
        const rawProg = programs.find((p) => p.id === sem?.program_id);
        const uni = universities.find((u) => u.id === rawProg?.university_id) || { code: 'AAU' };
        const prog = rawProg ? { ...rawProg, university: uni } : { university: uni };
        const semester = sem ? { ...sem, program: prog } : { program: prog };
        return { ...item, semester };
      },
      update: async ({ where, data }: any) => {
        const item = courses.find((c) => c.id === where.id);
        if (item) Object.assign(item, data);
        const sem = semesters.find((s) => s.id === item?.semester_id);
        const rawProg = programs.find((p) => p.id === sem?.program_id);
        const uni = universities.find((u) => u.id === rawProg?.university_id) || { code: 'AAU' };
        const prog = rawProg ? { ...rawProg, university: uni } : { university: uni };
        const semester = sem ? { ...sem, program: prog } : { program: prog };
        return item ? { ...item, semester } : null;
      },
    },
    module: {
      findMany: async ({ where }: any = {}) => {
        return modules
          .filter((m) => {
            if (where?.course_id && m.course_id !== where.course_id) return false;
            if (where?.status && m.status !== where.status) return false;
            return true;
          })
          .map((m) => ({
            ...m,
            topics: topics
              .filter((t) => t.module_id === m.id && t.status === PublicationStatus.PUBLISHED)
              .map((t) => ({ ...t, contents: [{ version: 1, status: PublicationStatus.PUBLISHED }] })),
          }));
      },
      findUnique: async ({ where }: any) => modules.find((m) => m.id === where.id) || null,
      create: async ({ data }: any) => {
        const item = { ...data, id: data.id || `mod-${Date.now()}` };
        modules.push(item);
        return item;
      },
      update: async ({ where, data }: any) => {
        const item = modules.find((m) => m.id === where.id);
        if (item) Object.assign(item, data);
        return item;
      },
    },
    topic: {
      findMany: async ({ where }: any = {}) => {
        return topics.filter((t) => {
          if (where?.module_id && t.module_id !== where.module_id) return false;
          if (where?.status && t.status !== where.status) return false;
          return true;
        });
      },
      findUnique: async ({ where }: any) => topics.find((t) => t.id === where.id) || null,
      findFirst: async ({ where }: any) => topics.find((t) => t.module_id === where.module_id) || null,
      create: async ({ data }: any) => {
        const item = { ...data, id: data.id || `topic-${Date.now()}` };
        topics.push(item);
        return item;
      },
      update: async ({ where, data }: any) => {
        const item = topics.find((t) => t.id === where.id);
        if (item) Object.assign(item, data);
        return item;
      },
    },
    examSet: {
      findMany: async ({ where }: any = {}) => {
        return examSets.filter((e) => {
          if (where?.course_id && e.course_id !== where.course_id) return false;
          if (where?.kind && e.kind !== where.kind) return false;
          if (where?.status && e.status !== where.status) return false;
          return true;
        });
      },
      findUnique: async ({ where }: any) => examSets.find((e) => e.id === where.id) || null,
      create: async ({ data }: any) => {
        const item = { ...data, id: data.id || `exam-${Date.now()}` };
        examSets.push(item);
        return item;
      },
      update: async ({ where, data }: any) => {
        const item = examSets.find((e) => e.id === where.id);
        if (item) Object.assign(item, data);
        return item;
      },
    },
    exam: {
      findMany: async ({ where }: any = {}) => {
        return examSets
          .filter((e) => {
            if (where?.course_id && e.course_id !== where.course_id) return false;
            if (where?.kind && e.kind !== where.kind) return false;
            if (where?.status && e.status !== where.status) return false;
            return true;
          })
          .map((e) => ({
            ...e,
            exam_questions: e.exam_questions || [],
            duration_min: e.duration_min || 90,
            is_free_trial: e.is_free_trial || false,
            university: e.university || { id: 'uni-1', code: 'AAU', name_en: 'AAU' },
          }));
      },
      findUnique: async ({ where }: any) => examSets.find((e) => e.id === where.id) || null,
      create: async ({ data }: any) => {
        const item = { ...data, id: data.id || `exam-${Date.now()}` };
        examSets.push(item);
        return item;
      },
      update: async ({ where, data }: any) => {
        const item = examSets.find((e) => e.id === where.id);
        if (item) Object.assign(item, data);
        return item;
      },
    },
    quizChapter: {
      findMany: async ({ where }: any = {}) => {
        return quizChapters
          .filter((q) => {
            if (where?.course_id && q.course_id !== where.course_id) return false;
            if (where?.quiz_no && q.quiz_no !== where.quiz_no) return false;
            if (q.status === PublicationStatus.ARCHIVED) return false;
            return true;
          })
          .map((q) => ({
            ...q,
            topic: q.topic || {
              id: 'top-1',
              title_en: q.title_en || 'Topic 1',
              title_am: q.title_am || 'ርዕስ 1',
              is_free_trial: true,
            },
          }));
      },
      findUnique: async ({ where }: any) => quizChapters.find((q) => q.id === where.id) || null,
      create: async ({ data }: any) => {
        const item = { ...data, id: data.id || `quiz-${Date.now()}` };
        quizChapters.push(item);
        return item;
      },
      update: async ({ where, data }: any) => {
        const item = quizChapters.find((q) => q.id === where.id);
        if (item) Object.assign(item, data);
        return item;
      },
    },
    question: {
      count: async () => 10,
    },
    cocSet: {
      findMany: async ({ where }: any = {}) => {
        return cocSets
          .filter((c) => !where?.status || c.status === where.status)
          .map((c) => ({
            ...c,
            duration_min: c.duration_min || 180,
            coc_set_questions: c.coc_set_questions || [],
          }));
      },
      findUnique: async ({ where }: any) => cocSets.find((c) => c.id === where.id) || null,
      create: async ({ data }: any) => {
        const item = { ...data, id: data.id || `coc-${Date.now()}` };
        cocSets.push(item);
        return item;
      },
      update: async ({ where, data }: any) => {
        const item = cocSets.find((c) => c.id === where.id);
        if (item) Object.assign(item, data);
        return item;
      },
    },
    student: {
      findUnique: async ({ where }: any) => students.find((s) => s.id === where.id) || null,
    },
    studentCourse: {
      findMany: async () => [],
    },
    entitlement: {
      findMany: async () => [],
    },
    readingProgress: {
      findMany: async () => [],
    },
    attempt: {
      findMany: async () => [],
    },
    auditLog: {
      create: async () => ({ id: `audit-${Date.now()}` }),
    },
    $transaction: async (fn: any) => (typeof fn === 'function' ? fn(mockPrisma) : Promise.all(fn)),
  };

  const auditService = { log: async () => {}, logAction: async () => {} } as any;

  const catalogService = new CatalogService(mockPrisma, auditService);
  const contentService = new ContentService(mockPrisma, auditService);
  const examsService = new ExamsService(mockPrisma);
  const quizzesService = new QuizzesService(mockPrisma);
  const cocService = new CocService(mockPrisma);
  const learningService = new LearningService(mockPrisma);

  console.log("--- 1. University Parity ---");
  const createdUni = await catalogService.createAdminUniversity(adminId, {
    shortName: "AAU",
    name: "Addis Ababa University",
    status: "PUBLISHED",
  } as any);
  let studentUnis = await catalogService.getUniversities();
  assert(studentUnis.some((u) => u.code === "AAU"), "Admin creates university -> student sees it");

  await catalogService.updateAdminUniversity(adminId, createdUni.id, {
    shortName: "AAU",
    name: "Addis Ababa University",
    status: "DRAFT",
    reason: "Curriculum overhaul",
  } as any);
  studentUnis = await catalogService.getUniversities();
  assert(!studentUnis.some((u) => u.code === "AAU"), "Admin marks university inactive -> student hides it");

  // Re-publish university for children
  await catalogService.updateAdminUniversity(adminId, createdUni.id, {
    shortName: "AAU",
    name: "Addis Ababa University",
    status: "PUBLISHED",
  } as any);

  console.log("\n--- 2. Program Parity ---");
  const createdProg = await catalogService.createAdminProgram(adminId, {
    universityId: createdUni.id,
    name: "Pre Engineering",
  } as any);
  let studentProgs = await catalogService.getPrograms(createdUni.id);
  assert(studentProgs.some((p) => p.name === "Pre Engineering"), "Admin creates program -> student sees it");

  await catalogService.updateAdminProgram(adminId, createdProg.id, {
    name: "Pre Engineering",
    status: "DRAFT",
    reason: "Revising program",
  } as any);
  studentProgs = await catalogService.getPrograms(createdUni.id);
  assert(!studentProgs.some((p) => p.name === "Pre Engineering"), "Admin marks program inactive -> student hides it");

  // Re-publish program for semester
  await catalogService.updateAdminProgram(adminId, createdProg.id, {
    name: "Pre Engineering",
    status: "PUBLISHED",
  } as any);

  console.log("\n--- 3. Semester Parity ---");
  let studentSems = await catalogService.getSemesters(createdProg.id);
  const semTarget = studentSems[0]!;
  assert(studentSems.some((s) => s.id === semTarget.id), "Admin creates semester -> student sees it");

  await catalogService.updateAdminSemester(adminId, semTarget.id, {
    status: "DRAFT",
    reason: "Semester break",
  } as any);
  studentSems = await catalogService.getSemesters(createdProg.id);
  assert(!studentSems.some((s) => s.id === semTarget.id), "Admin marks semester inactive -> student hides it");

  // Re-publish semester so courses can be linked
  await catalogService.updateAdminSemester(adminId, semTarget.id, {
    status: "PUBLISHED",
  } as any);

  console.log("\n--- 4. Course Parity ---");
  students[0].semester_id = semTarget.id;
  const createdCourse = await catalogService.createAdminCourse(adminId, {
    semesterId: semTarget.id,
    code: "MATH101",
    title: "Calculus I",
    stream: "NATURAL",
    freeTrialItems: 7,
    status: "PUBLISHED",
  } as any);
  let studentCourses = await learningService.getMyCourses(studentId);
  assert(studentCourses.some((c) => c.course.code === "MATH101"), "Admin creates course -> student sees it");

  await catalogService.updateAdminCourse(adminId, createdCourse.id, {
    code: "MATH101",
    title: "Calculus I",
    stream: "NATURAL",
    freeTrialItems: 7,
    status: "DRAFT",
    reason: "Updating syllabus",
  } as any);
  studentCourses = await learningService.getMyCourses(studentId);
  assert(!studentCourses.some((c) => c.course.code === "MATH101"), "Admin marks course inactive -> student hides it");

  // Re-publish course for content, exams, and tests
  await catalogService.updateAdminCourse(adminId, createdCourse.id, {
    code: "MATH101",
    title: "Calculus I",
    stream: "NATURAL",
    freeTrialItems: 7,
    status: "PUBLISHED",
  } as any);

  console.log("\n--- 5. Content (Topics) Parity ---");
  const mod1 = await mockPrisma.module.create({
    data: {
      course_id: createdCourse.id,
      title_en: "Module 1: Differential Calculus",
      title_am: "ሞጁል 1",
      sort_order: 1,
      status: PublicationStatus.PUBLISHED,
    },
  });

  const createdTopic = await mockPrisma.topic.create({
    data: {
      module_id: mod1.id,
      chapter_number: 1,
      title_en: "Limits & Continuity",
      title_am: "ወሰን እና ቀጣይነት",
      sort_order: 1,
      status: PublicationStatus.PUBLISHED,
      module: mod1,
    },
  });
  let studentTopics = await contentService.getCourseTopics(studentId, createdCourse.id);
  assert(studentTopics.some((t) => t.title.en === "Limits & Continuity"), "Admin creates topic -> student sees it");

  await mockPrisma.topic.update({
    where: { id: createdTopic.id },
    data: { status: PublicationStatus.ARCHIVED },
  });
  studentTopics = await contentService.getCourseTopics(studentId, createdCourse.id);
  assert(!studentTopics.some((t) => t.title.en === "Limits & Continuity"), "Admin marks topic inactive -> student hides it");

  console.log("\n--- 6. Exam Parity ---");
  const createdExam = await mockPrisma.examSet.create({
    data: {
      course_id: createdCourse.id,
      title_en: "Midterm Exam 2024",
      title_am: "የአጋማሽ ፈተና 2024",
      kind: ExamKind.MID,
      duration_minutes: 90,
      status: PublicationStatus.PUBLISHED,
      university_id: createdUni.id,
      university: createdUni,
    },
  });
  let studentExams = await examsService.getCourseExams(createdCourse.id, ExamKind.MID);
  assert(studentExams.some((e) => e.exam.id === createdExam.id), "Admin creates exam -> student sees it");

  await mockPrisma.examSet.update({
    where: { id: createdExam.id },
    data: { status: PublicationStatus.ARCHIVED },
  });
  studentExams = await examsService.getCourseExams(createdCourse.id, ExamKind.MID);
  assert(!studentExams.some((e) => e.exam.id === createdExam.id), "Admin marks exam inactive -> student hides it");

  console.log("\n--- 7. Tests (Quizzes) Parity ---");
  const createdQuiz = await mockPrisma.quizChapter.create({
    data: {
      course_id: createdCourse.id,
      chapter_number: 1,
      quiz_no: 1,
      title_en: "Practice Quiz 1",
      title_am: "የልምምድ ፈተና 1",
      duration_minutes: 30,
      question_count: 10,
      is_free: true,
      status: PublicationStatus.PUBLISHED,
    },
  });
  let studentQuizzes = await quizzesService.getCourseQuizChapters(createdCourse.id, 1);
  assert(studentQuizzes.some((q) => q.id === createdQuiz.id), "Admin creates quiz -> student sees it");

  await mockPrisma.quizChapter.update({
    where: { id: createdQuiz.id },
    data: { status: PublicationStatus.ARCHIVED },
  });
  studentQuizzes = await quizzesService.getCourseQuizChapters(createdCourse.id, 1);
  assert(!studentQuizzes.some((q) => q.id === createdQuiz.id), "Admin marks quiz inactive -> student hides it");

  console.log("\n--- 8. COC Parity ---");
  const createdCoc = await mockPrisma.cocSet.create({
    data: {
      title_en: "National Exit Exam 2024",
      title_am: "ብሔራዊ የመውጫ ፈተና 2024",
      duration_minutes: 180,
      question_count: 50,
      is_free: false,
      status: PublicationStatus.PUBLISHED,
    },
  });
  let studentCocSets = await cocService.getCocSets();
  assert(studentCocSets.some((c) => c.id === createdCoc.id), "Admin creates COC set -> student sees it");

  await mockPrisma.cocSet.update({
    where: { id: createdCoc.id },
    data: { status: PublicationStatus.ARCHIVED },
  });
  studentCocSets = await cocService.getCocSets();
  assert(!studentCocSets.some((c) => c.id === createdCoc.id), "Admin marks COC set inactive -> student hides it");

  console.log("\n========================================");
  console.log(`Parity Tests Summary: ${passed} passed, ${failed} failed`);
  console.log("========================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runParityTests().catch((err) => {
  console.error("Parity test crashed:", err);
  process.exit(1);
});
