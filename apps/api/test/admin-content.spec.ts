import "reflect-metadata";
import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { Role, PublicationStatus } from "@mastara/database";
import {
  contentCourseSchema,
  contentSummarySchema,
  adminModuleSchema,
  adminTopicSchema,
  adminNoteSchema,
} from "@mastara/contracts";
import { ContentService } from "../src/modules/content/services/content.service";
import { AdminContentController } from "../src/modules/content/controllers/admin-content.controller";
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

async function runAdminContentTests() {
  console.log("=== Testing Admin Content Service, Controller & Contract Alignment ===\n");

  // In-memory data store for testing
  let courses: any[] = [
    {
      id: "course-uuid-1",
      code: "CS101",
      title_en: "Computer Science 101",
      title_am: "ኮምፒውተር ሳይንስ 101",
      semester: {
        number: 1,
        program: {
          name_en: "Software Engineering",
          university: {
            code: "AAU",
          },
        },
      },
    },
  ];

  let modules: any[] = [];
  let topics: any[] = [];
  let contents: any[] = [];
  let auditLogs: any[] = [];

  const mockPrisma = {
    course: {
      findMany: async () => courses,
      findUnique: async ({ where }: any) => courses.find((c) => c.id === where.id) || null,
      findFirst: async ({ where }: any) => {
        if (where.id) return courses.find((c) => c.id === where.id) || null;
        if (where.code?.equals) {
          const target = String(where.code.equals).toLowerCase();
          return courses.find((c) => c.code.toLowerCase() === target || c.id.toLowerCase() === target) || null;
        }
        return courses[0] || null;
      },
    },
    module: {
      findMany: async ({ where, orderBy }: any) => {
        let list = modules.filter((m) => m.course_id === where.course_id);
        if (where.status) list = list.filter((m) => m.status === where.status);
        return list.map((m) => ({
          ...m,
          topics: topics
            .filter((t) => t.module_id === m.id)
            .map((t) => ({
              ...t,
              contents: contents
                .filter((c) => c.topic_id === t.id)
                .sort((a, b) => b.version - a.version),
            })),
        }));
      },
      findUnique: async ({ where }: any) => {
        const found = modules.find((m) => m.id === where.id);
        if (!found) return null;
        return {
          ...found,
          course: courses.find((c) => c.id === found.course_id),
          topics: topics
            .filter((t) => t.module_id === found.id)
            .map((t) => ({
              ...t,
              contents: contents
                .filter((c) => c.topic_id === t.id)
                .sort((a, b) => b.version - a.version),
            })),
        };
      },
      findFirst: async ({ where, orderBy }: any) => {
        const list = modules.filter((m) => m.course_id === where.course_id);
        if (orderBy?.sort_order === "desc") {
          return list.sort((a, b) => b.sort_order - a.sort_order)[0] || null;
        }
        return list[0] || null;
      },
      create: async ({ data }: any) => {
        const created = {
          id: `mod-${Date.now()}-${Math.random()}`,
          ...data,
          created_at: new Date(),
          updated_at: new Date(),
        };
        modules.push(created);
        return { ...created, topics: [] };
      },
      update: async ({ where, data }: any) => {
        const idx = modules.findIndex((m) => m.id === where.id);
        modules[idx] = { ...modules[idx], ...data, updated_at: new Date() };
        return {
          ...modules[idx],
          topics: topics.filter((t) => t.module_id === modules[idx].id),
        };
      },
    },
    topic: {
      findMany: async ({ where }: any) => {
        let list = topics;
        if (where.module?.course_id) {
          const modIds = new Set(
            modules.filter((m) => m.course_id === where.module.course_id).map((m) => m.id),
          );
          list = list.filter((t) => modIds.has(t.module_id));
        }
        return list.map((t) => ({
          ...t,
          module: modules.find((m) => m.id === t.module_id),
          contents: contents
            .filter((c) => c.topic_id === t.id)
            .sort((a, b) => b.version - a.version),
        }));
      },
      findUnique: async ({ where }: any) => {
        const found = topics.find((t) => t.id === where.id);
        if (!found) return null;
        return {
          ...found,
          module: modules.find((m) => m.id === found.module_id),
          contents: contents
            .filter((c) => c.topic_id === found.id)
            .sort((a, b) => b.version - a.version),
        };
      },
      findFirst: async ({ where, orderBy }: any) => {
        const list = topics.filter((t) => t.module_id === where.module_id);
        if (orderBy?.chapter_number === "desc") {
          return list.sort((a, b) => b.chapter_number - a.chapter_number)[0] || null;
        }
        return list[0] || null;
      },
      create: async ({ data }: any) => {
        const topicId = `topic-${Date.now()}-${Math.random()}`;
        const created = {
          id: topicId,
          module_id: data.module_id,
          chapter_number: data.chapter_number,
          title_en: data.title_en,
          title_am: data.title_am,
          is_free_trial: data.is_free_trial ?? false,
          sort_order: data.sort_order ?? 1,
          created_at: new Date(),
          updated_at: new Date(),
        };
        topics.push(created);

        if (data.contents?.create) {
          const content = {
            id: `content-${Date.now()}-${Math.random()}`,
            topic_id: topicId,
            ...data.contents.create,
            created_at: new Date(),
            updated_at: new Date(),
          };
          contents.push(content);
        }

        return {
          ...created,
          module: modules.find((m) => m.id === created.module_id),
          contents: contents.filter((c) => c.topic_id === topicId),
        };
      },
      update: async ({ where, data }: any) => {
        const idx = topics.findIndex((t) => t.id === where.id);
        topics[idx] = { ...topics[idx], ...data, updated_at: new Date() };
        return topics[idx];
      },
    },
    content: {
      create: async ({ data }: any) => {
        const created = {
          id: `content-${Date.now()}-${Math.random()}`,
          ...data,
          created_at: new Date(),
          updated_at: new Date(),
        };
        contents.push(created);
        return created;
      },
      update: async ({ where, data }: any) => {
        const idx = contents.findIndex((c) => c.id === where.id);
        contents[idx] = { ...contents[idx], ...data, updated_at: new Date() };
        return contents[idx];
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        auditLogs.push(data);
        return data;
      },
    },
  };

  const moduleFixture: TestingModule = await Test.createTestingModule({
    controllers: [AdminContentController],
    providers: [
      ContentService,
      {
        provide: PrismaService,
        useValue: mockPrisma,
      },
    ],
  }).compile();

  const service = moduleFixture.get<ContentService>(ContentService);
  const controller = moduleFixture.get<AdminContentController>(AdminContentController);

  // 1. List Courses
  const courseList = await service.listAdminCourses();
  assert(courseList.length === 1, "Lists 1 course");
  const parsedCourse = contentCourseSchema.safeParse(courseList[0]);
  assert(parsedCourse.success, "Course matches contentCourseSchema");
  assert(courseList[0]!.programName === "Software Engineering", "Course programName matches");
  assert(courseList[0]!.universityShortName === "AAU", "Course universityShortName matches");

  // 2. Create Module
  const createdMod = await service.createAdminModule(
    {
      courseId: "course-uuid-1",
      title: { en: "Introduction to Algorithms", am: "የአልጎሪዝም መግቢያ" },
      status: "PUBLISHED",
    },
    "admin-123",
  );
  assert(createdMod.number === 1, "First module has number 1");
  assert(createdMod.status === "PUBLISHED", "Module status is PUBLISHED");
  const parsedMod = adminModuleSchema.safeParse(createdMod);
  assert(parsedMod.success, "Created module matches adminModuleSchema");
  assert(auditLogs.some((a) => a.action === "MODULE_CREATED"), "Logged MODULE_CREATED");

  // 3. Update Module (Unpublishing requires reason)
  let rejectedNoReason = false;
  try {
    await service.updateAdminModule(
      createdMod.id,
      {
        courseId: "course-uuid-1",
        title: { en: "Introduction to Algorithms", am: "የአልጎሪዝም መግቢያ" },
        status: "DRAFT",
      },
      "admin-123",
    );
  } catch (err: any) {
    rejectedNoReason = err instanceof BadRequestException;
  }
  assert(rejectedNoReason, "Throws BadRequestException when unpublishing without reason");

  const unpubMod = await service.updateAdminModule(
    createdMod.id,
    {
      courseId: "course-uuid-1",
      title: { en: "Introduction to Algorithms v2", am: "የአልጎሪዝም መግቢያ v2" },
      status: "DRAFT",
      reason: "Revision required before release",
    },
    "admin-123",
  );
  assert(unpubMod.status === "DRAFT", "Updated module status to DRAFT");
  assert(auditLogs.some((a) => a.action === "CONTENT_UNPUBLISHED"), "Logged CONTENT_UNPUBLISHED");

  // 4. Add Topic
  const createdTopic = await service.createAdminTopic(
    {
      moduleId: createdMod.id,
      title: { en: "Asymptotic Complexity", am: "አሲምፕቶቲክ ውስብስብነት" },
    },
    "admin-123",
  );
  assert(createdTopic.number === 1, "Topic chapter number is 1");
  assert(createdTopic.code === "1.1", "Topic code is 1.1");
  const parsedTopic = adminTopicSchema.safeParse(createdTopic);
  assert(parsedTopic.success, "Created topic matches adminTopicSchema");
  assert(auditLogs.some((a) => a.action === "TOPIC_ADDED"), "Logged TOPIC_ADDED");

  // 5. Create Note (Publishing requires both languages)
  let rejectedIncompletePublish = false;
  try {
    await service.createAdminNote(
      {
        courseId: "course-uuid-1",
        moduleId: createdMod.id,
        title: { en: "Big-O Notation", am: "" },
        body: { en: "Complexity is $O(n)$", am: "" },
        isFree: true,
        status: "PUBLISHED",
      },
      "admin-123",
    );
  } catch (err: any) {
    rejectedIncompletePublish = err instanceof BadRequestException;
  }
  assert(rejectedIncompletePublish, "Throws BadRequestException when publishing incomplete note");

  const createdNote = await service.createAdminNote(
    {
      courseId: "course-uuid-1",
      moduleId: createdMod.id,
      title: { en: "Big-O Notation", am: "ቢግ-ኦ ኖቴሽን" },
      body: { en: "Time is $O(n)$ with $$T(n)=2n$$", am: "ጊዜ $O(n)$ ነው" },
      isFree: true,
      status: "PUBLISHED",
    },
    "admin-123",
  );
  assert(createdNote.version === 1, "Published note version is 1");
  assert(createdNote.isFree === true, "Note isFree is true");
  const parsedNote = adminNoteSchema.safeParse(createdNote);
  assert(parsedNote.success, "Created note matches adminNoteSchema");
  assert(auditLogs.some((a) => a.action === "CONTENT_PUBLISHED"), "Logged CONTENT_PUBLISHED");

  // 6. Update Note (Bumps version on republish)
  const updatedNote = await service.updateAdminNote(
    createdNote.id,
    {
      courseId: "course-uuid-1",
      moduleId: createdMod.id,
      title: { en: "Big-O & Theta Notation", am: "ቢግ-ኦ እና ቴታ ኖቴሽን" },
      body: { en: "Updated $O(n)$ body", am: "የተሻሻለ አካል" },
      isFree: false,
      status: "PUBLISHED",
    },
    "admin-123",
  );
  assert(updatedNote.version === 2, "Republished note version incremented to 2");
  assert(updatedNote.title.en === "Big-O & Theta Notation", "Title updated correctly");

  // 7. Save Amharic Note
  const amharicNote = await service.saveAdminAmharicNote(
    createdNote.id,
    {
      title: "ቢግ-ኦ የተሻሻለ ርዕስ",
      body: "ሙሉ የአማርኛ ዝርዝር መግለጫ",
    },
    "admin-123",
  );
  assert(amharicNote.title.am === "ቢግ-ኦ የተሻሻለ ርዕስ", "Amharic title saved");
  assert(amharicNote.version === 3, "Version incremented to 3 on Amharic publish");

  // 8. List Modules & Notes
  const modList = await service.listAdminModules("course-uuid-1");
  assert(modList.length === 1, "listAdminModules returns 1 module");
  assert(modList[0]!.topics.length >= 1, "Module has topics");
  assert(modList[0]!.notes.length >= 1, "Module has notes");

  const noteList = await service.listAdminNotes("course-uuid-1");
  assert(noteList.length >= 1, "listAdminNotes returns notes");
  assert(noteList[0]!.moduleNumber === 1, "Note moduleNumber is resolved");

  // 9. Content Summary
  const summary = await service.getAdminContentSummary("course-uuid-1");
  const parsedSummary = contentSummarySchema.safeParse(summary);
  assert(parsedSummary.success, "Summary matches contentSummarySchema");
  assert(summary.moduleCount === 1, "Summary moduleCount is 1");
  assert(summary.quizCount === 3, "Summary quizCount is 3");
  assert(summary.recent.length > 0, "Summary has recent updates");

  // 10. Controller Verification
  const ctrlCourses = await controller.listCourses();
  assert(ctrlCourses.length === 1, "Controller listCourses returns list");
  const ctrlSummary = await controller.getSummary("course-uuid-1");
  assert(ctrlSummary.courseId === "course-uuid-1", "Controller getSummary returns summary");
  const ctrlModules = await controller.listModules("course-uuid-1");
  assert(ctrlModules.length === 1, "Controller listModules returns modules");
  const ctrlNotes = await controller.listNotes("course-uuid-1");
  assert(ctrlNotes.length >= 1, "Controller listNotes returns notes");

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runAdminContentTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
