import "reflect-metadata";
import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { Role } from "@mastara/database";
import {
  adminQuestionSchema,
  questionListResultSchema,
  quizSummarySchema,
  testsOverviewSchema,
} from "@mastara/contracts";
import { AdminTestsService } from "../src/modules/assessment/quizzes/services/admin-tests.service";
import { AdminTestsController } from "../src/modules/assessment/quizzes/controllers/admin-tests.controller";
import { PrismaService } from "../src/infrastructure/database/prisma.service";

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

async function runAdminTestsSuite() {
  console.log("=== Testing Admin Tests Service, Controller & Contract Alignment ===\n");

  const testCourse = {
    id: "course-uuid-1",
    code: "CS101",
    title_en: "Computer Science 101",
    title_am: "ኮምፒውተር ሳይንስ 101",
  };

  const testModule = {
    id: "mod-1",
    course_id: "course-uuid-1",
    sort_order: 1,
    title_en: "Module 1",
  };

  const testTopic = {
    id: "topic-uuid-1",
    module_id: "mod-1",
    chapter_number: 1,
    title_en: "Time Complexity",
    module: testModule,
  };

  let questions: any[] = [];
  let settings: any[] = [];
  let auditLogs: any[] = [];

  const mockPrisma = {
    course: {
      findUnique: async ({ where }: any) => {
        if (where.id === testCourse.id) return testCourse;
        return null;
      },
    },
    topic: {
      findUnique: async ({ where }: any) => {
        if (where.id === testTopic.id) return testTopic;
        return null;
      },
    },
    systemSetting: {
      findUnique: async ({ where }: any) => {
        const found = settings.find((s) => s.key === where.key);
        return found ? { ...found } : null;
      },
      upsert: async ({ where, update, create }: any) => {
        const existingIdx = settings.findIndex((s) => s.key === where.key);
        if (existingIdx >= 0) {
          settings[existingIdx] = {
            ...settings[existingIdx],
            ...update,
            value: update.value,
          };
          return settings[existingIdx];
        }
        const created = {
          id: `setting-${Date.now()}`,
          key: create.key,
          value: create.value,
          updated_by: create.updated_by,
        };
        settings.push(created);
        return created;
      },
    },
    question: {
      findMany: async ({ where, orderBy }: any) => {
        let list = [...questions];
        if (where?.course_id) {
          list = list.filter((q) => q.course_id === where.course_id);
        }
        return list.map((q) => ({
          ...q,
          course: testCourse,
          topic: testTopic,
        }));
      },
      findUnique: async ({ where }: any) => {
        const found = questions.find((q) => q.id === where.id);
        if (!found) return null;
        return {
          ...found,
          course: testCourse,
          topic: testTopic,
        };
      },
      create: async ({ data }: any) => {
        const newQ = {
          id: `q-uuid-${questions.length + 1}`,
          course_id: data.course_id,
          topic_id: data.topic_id,
          type: data.type,
          prompt_en: data.prompt_en,
          options: data.options,
          correct_answers: data.correct_answers,
          is_active: data.is_active,
          created_at: new Date(),
          updated_at: new Date(),
          course: testCourse,
          topic: testTopic,
        };
        questions.push(newQ);
        return newQ;
      },
      update: async ({ where, data }: any) => {
        const idx = questions.findIndex((q) => q.id === where.id);
        if (idx === -1) throw new Error("Question not found");
        questions[idx] = {
          ...questions[idx],
          ...data,
          correct_answers: data.correct_answers,
          updated_at: new Date(),
        };
        return {
          ...questions[idx],
          course: testCourse,
          topic: testTopic,
        };
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        const entry = { id: `audit-${auditLogs.length + 1}`, ...data, created_at: new Date() };
        auditLogs.push(entry);
        return entry;
      },
    },
  };

  const moduleRef: TestingModule = await Test.createTestingModule({
    controllers: [AdminTestsController],
    providers: [
      AdminTestsService,
      { provide: PrismaService, useValue: mockPrisma },
    ],
  }).compile();

  const controller = moduleRef.get<AdminTestsController>(AdminTestsController);
  const service = moduleRef.get<AdminTestsService>(AdminTestsService);

  const adminId = "admin-uuid-001";

  // Test 1: Get Overview for course with no initial questions
  const initialOverview = await controller.getOverview(testCourse.id);
  assert(
    testsOverviewSchema.safeParse(initialOverview).success,
    "TestsOverview matches contracts schema",
  );
  assert(initialOverview.quizzes.length === 3, "Overview returns quizzes 1, 2, and 3");
  assert(initialOverview.quizzes[0]!.questionCount === 0, "Initial quiz 1 questionCount is 0");
  assert(initialOverview.recent.length === 0, "Initial recent list is empty");

  // Test 2: Cannot publish quiz 1 when questionCount is 0
  let publishBlocked = false;
  try {
    await controller.updateQuiz(
      testCourse.id,
      1,
      { minutes: 20, status: "PUBLISHED" },
      adminId,
    );
  } catch (err: any) {
    publishBlocked = err instanceof BadRequestException;
  }
  assert(
    publishBlocked,
    "Cannot publish quiz 1 when it has zero published questions",
  );

  // Test 3: Create Question (Draft Multiple Choice)
  const draftQ = await controller.createQuestion(
    {
      courseId: testCourse.id,
      quizNo: 1,
      topicId: testTopic.id,
      title: "Binary search complexity",
      form: "MULTIPLE_CHOICE",
      prompt: "What is the worst-case time complexity of binary search?",
      options: ["O(n)", "O(log n)", "O(1)", "O(n^2)"],
      correctOption: 1,
      acceptedAnswers: [],
      status: "DRAFT",
    },
    adminId,
  );
  assert(adminQuestionSchema.safeParse(draftQ).success, "Created draft question matches schema");
  assert(draftQ.status === "DRAFT", "Question status is DRAFT");
  assert(draftQ.options.length === 4, "Question has 4 options");
  assert(
    auditLogs.some((a) => a.action === "QUESTION_CREATED"),
    "Recorded QUESTION_CREATED audit log",
  );

  // Test 4: Cannot publish invalid question without correct option
  let invalidPublishBlocked = false;
  try {
    await controller.createQuestion(
      {
        courseId: testCourse.id,
        quizNo: 1,
        topicId: testTopic.id,
        title: "Broken MC question",
        form: "MULTIPLE_CHOICE",
        prompt: "Broken question prompt",
        options: ["Option A", "Option B"],
        correctOption: null,
        acceptedAnswers: [],
        status: "PUBLISHED",
      },
      adminId,
    );
  } catch (err: any) {
    invalidPublishBlocked = err instanceof BadRequestException;
  }
  assert(
    invalidPublishBlocked,
    "Cannot publish MULTIPLE_CHOICE question missing correctOption",
  );

  // Test 5: Create and Publish Valid Question
  const publishedQ = await controller.createQuestion(
    {
      courseId: testCourse.id,
      quizNo: 1,
      topicId: testTopic.id,
      title: "Linear search complexity",
      form: "MULTIPLE_CHOICE",
      prompt: "What is the worst-case time complexity of linear search?",
      options: ["O(n)", "O(log n)", "O(1)", "O(n^2)"],
      correctOption: 0,
      acceptedAnswers: [],
      status: "PUBLISHED",
    },
    adminId,
  );
  assert(publishedQ.status === "PUBLISHED", "Published question created successfully");
  assert(
    auditLogs.some((a) => a.action === "QUESTION_PUBLISHED"),
    "Recorded QUESTION_PUBLISHED audit log",
  );

  // Test 6: Now Quiz 1 CAN be published since it has a published question
  const updatedQuiz = await controller.updateQuiz(
    testCourse.id,
    1,
    { minutes: 25, status: "PUBLISHED" },
    adminId,
  );
  assert(quizSummarySchema.safeParse(updatedQuiz).success, "Quiz summary matches schema");
  assert(updatedQuiz.status === "PUBLISHED", "Quiz 1 is now PUBLISHED");
  assert(updatedQuiz.minutes === 25, "Quiz duration updated to 25 minutes");
  assert(
    auditLogs.some((a) => a.action === "QUIZ_PUBLISHED"),
    "Recorded QUIZ_PUBLISHED audit log",
  );

  // Test 7: Unpublishing Quiz requires a reason
  let unpublishMissingReasonBlocked = false;
  try {
    await controller.updateQuiz(
      testCourse.id,
      1,
      { minutes: 25, status: "DRAFT" },
      adminId,
    );
  } catch (err: any) {
    unpublishMissingReasonBlocked = err instanceof BadRequestException;
  }
  assert(
    unpublishMissingReasonBlocked,
    "Unpublishing quiz without reason is rejected",
  );

  // Test 8: Unpublishing Quiz WITH reason succeeds
  const unpublishedQuiz = await controller.updateQuiz(
    testCourse.id,
    1,
    { minutes: 25, status: "DRAFT", reason: "Revising question distribution" },
    adminId,
  );
  assert(unpublishedQuiz.status === "DRAFT", "Quiz unpublishing with reason succeeded");
  assert(
    auditLogs.some((a) => a.action === "QUIZ_UNPUBLISHED"),
    "Recorded QUIZ_UNPUBLISHED audit log",
  );

  // Test 9: Create TRUE_FALSE question
  const tfQuestion = await controller.createQuestion(
    {
      courseId: testCourse.id,
      quizNo: 2,
      topicId: testTopic.id,
      title: "Hash table lookup average",
      form: "TRUE_FALSE",
      prompt: "Average case lookup time in a hash table is O(1).",
      options: [],
      trueIsCorrect: true,
      acceptedAnswers: [],
      status: "PUBLISHED",
    },
    adminId,
  );
  assert(tfQuestion.form === "TRUE_FALSE", "Created TRUE_FALSE question");
  assert(tfQuestion.trueIsCorrect === true, "TRUE_FALSE correct answer is true");

  // Test 10: List and Filter Questions in Question Bank
  const listQuiz1 = await controller.listQuestions({
    quizNo: 1,
    courseId: testCourse.id,
  });
  assert(
    questionListResultSchema.safeParse(listQuiz1).success,
    "QuestionListResult matches schema",
  );
  assert(listQuiz1.total === 2, "Quiz 1 has 2 questions listed");
  assert(listQuiz1.items[0]!.nextId !== null, "First question links to next question via nextId");

  // Test 11: Text search filter
  const searchResult = await controller.listQuestions({
    quizNo: 1,
    courseId: testCourse.id,
    q: "linear",
  });
  assert(searchResult.total === 1, "Search for 'linear' returns 1 question");
  assert(
    searchResult.items[0]!.title === "Linear search complexity",
    "Search matched correct question title",
  );

  // Test 12: Update Question and Unpublish requires reason
  let unpublishQMissingReason = false;
  try {
    await controller.updateQuestion(
      publishedQ.id,
      {
        courseId: testCourse.id,
        quizNo: 1,
        topicId: testTopic.id,
        title: "Linear search complexity revised",
        form: "MULTIPLE_CHOICE",
        prompt: "Updated prompt for linear search",
        options: ["O(n)", "O(log n)", "O(1)", "O(n^2)"],
        correctOption: 0,
        acceptedAnswers: [],
        status: "DRAFT",
      },
      adminId,
    );
  } catch (err: any) {
    unpublishQMissingReason = err instanceof BadRequestException;
  }
  assert(
    unpublishQMissingReason,
    "Unpublishing question without reason is rejected",
  );

  // Test 13: Update Question with reason succeeds
  const updatedQ = await controller.updateQuestion(
    publishedQ.id,
    {
      courseId: testCourse.id,
      quizNo: 1,
      topicId: testTopic.id,
      title: "Linear search complexity revised",
      form: "MULTIPLE_CHOICE",
      prompt: "Updated prompt for linear search",
      options: ["O(n)", "O(log n)", "O(1)", "O(n^2)"],
      correctOption: 0,
      acceptedAnswers: [],
      status: "DRAFT",
      reason: "Updating question options for clarification",
    },
    adminId,
  );
  assert(updatedQ.status === "DRAFT", "Question unpublished successfully with reason");
  assert(
    auditLogs.some((a) => a.action === "QUESTION_UNPUBLISHED"),
    "Recorded QUESTION_UNPUBLISHED audit log",
  );

  // Test 14: Get Question details by ID
  const fetchedQ = await controller.getQuestion(draftQ.id);
  assert(adminQuestionSchema.safeParse(fetchedQ).success, "Fetched question details match schema");
  assert(fetchedQ.id === draftQ.id, "Fetched question ID matches");

  // Test 15: Nonexistent Question returns 404
  let notFoundCaught = false;
  try {
    await controller.getQuestion("nonexistent-uuid");
  } catch (err: any) {
    notFoundCaught = err instanceof NotFoundException;
  }
  assert(notFoundCaught, "Fetching nonexistent question throws NotFoundException");

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runAdminTestsSuite().catch((err) => {
  console.error("Unhandled error during test run:", err);
  process.exit(1);
});
