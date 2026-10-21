import "reflect-metadata";
import {
  adminScanSchema,
  scanListResultSchema,
  scanCourseOptionSchema,
} from "@mastara/contracts";
import { AdminScansService } from "../src/modules/content/scan-jobs/services/admin-scans.service";
import { AdminScansController } from "../src/modules/content/scan-jobs/controllers/admin-scans.controller";
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

async function runAdminScansTests() {
  console.log("=== Testing Admin Scans Service, Controller & Contract Alignment ===\n");

  const now = new Date();
  const scanJobs: any[] = [
    {
      id: "scan-uuid-1",
      title: "Mid-Term Examination Paper 2024",
      course_id: "course-uuid-1",
      topic_id: null,
      status: "SUCCEEDED",
      created_by: "admin-uuid-1",
      created_at: now,
      updated_at: now,
      metadata: {
        kind: "EXAM",
        subKind: "MID",
        examSetId: "ES-101",
        universityShortName: "AAU",
        programName: "Software Engineering",
        semesterNumber: 1,
        stream: "NATURAL",
        courseCode: "SWE101",
        courseTitle: "Introduction to Software Engineering",
        year: 2024,
        title: "Mid-Term Examination Paper 2024",
        description: "Official scanned copy",
        answers: [
          {
            questionId: "Q-1",
            text: "A",
            questionType: "MULTIPLE_CHOICE",
            file: null,
          },
        ],
        pages: [{ name: "page1.jpg", mime: "image/jpeg", sizeBytes: 250000 }],
      },
      scan_pages: [
        {
          id: "page-uuid-1",
          page_number: 1,
          storage_key: "scans/scan-uuid-1/page1.jpg",
          ocr_text: "Question 1: What is software engineering?",
          image_url: "http://localhost:3000/uploads/scans/scan-uuid-1/page1.jpg",
        },
      ],
      course: {
        id: "course-uuid-1",
        code: "SWE101",
        title_en: "Introduction to Software Engineering",
        semester: {
          sort_order: 1,
          program: {
            name_en: "Software Engineering",
            university: { code: "AAU" },
          },
        },
      },
    },
  ];

  const mockPrisma = {
    scanJob: {
      count: async () => scanJobs.length,
      findMany: async () => scanJobs,
      findFirst: async ({ where }: any) => {
        if (!where) return scanJobs[0] || null;
        return scanJobs.find((s) => s.id === where.id || s.id === where?.OR?.[0]?.id) || scanJobs[0] || null;
      },
      findUnique: async ({ where }: any) => scanJobs.find((s) => s.id === where.id) || null,
      create: async ({ data }: any) => {
        const item = {
          id: `scan-uuid-${scanJobs.length + 1}`,
          ...data,
          created_at: new Date(),
          updated_at: new Date(),
          scan_pages: [],
          course: scanJobs[0].course,
        };
        scanJobs.push(item);
        return item;
      },
    },
    course: {
      findFirst: async () => scanJobs[0].course,
      findUnique: async () => scanJobs[0].course,
      findMany: async () => [
        {
          id: "course-uuid-1",
          code: "SWE101",
          title_en: "Introduction to Software Engineering",
          stream: "NATURAL",
        },
      ],
    },
    student: {
      findFirst: async () => ({ id: "admin-uuid-1", role: "ADMIN" }),
    },
    university: {
      findUnique: async () => ({ id: "uni-1", code: "AAU" }),
      findFirst: async () => ({ id: "uni-1", code: "AAU" }),
    },
    program: {
      findUnique: async () => ({ id: "prog-1", name_en: "Software Engineering" }),
      findFirst: async () => ({ id: "prog-1", name_en: "Software Engineering" }),
    },
    semester: {
      findFirst: async () => ({ id: "sem-1" }),
      findUnique: async () => ({ id: "sem-1" }),
    },
    auditLog: {
      create: async () => ({}),
    },
    topic: {
      findUnique: async () => null,
    },
  } as unknown as PrismaService;

  const scansService = new AdminScansService(mockPrisma);
  const controller = new AdminScansController(scansService);

  // 1. List Scans
  console.log("Testing listScans()...");
  const listResult = await controller.listScans({ page: 1 });
  assert(listResult.items.length === 1, "listScans returns items");
  assert(listResult.total === 1, "listScans returns total count");
  const parseList = scanListResultSchema.safeParse(listResult);
  if (!parseList.success) {
    console.error("Parse list error:", parseList.error);
  }
  assert(parseList.success, "listResult matches scanListResultSchema");

  // 2. Get Scan by ID
  console.log("Testing getScan()...");
  const scanDetail = await controller.getScan("scan-uuid-1");
  assert(scanDetail.id === "scan-uuid-1", "getScan returns correct ID");
  assert(scanDetail.title === "Mid-Term Examination Paper 2024", "getScan returns title");
  const parseDetail = adminScanSchema.safeParse(scanDetail);
  if (!parseDetail.success) {
    console.error("Parse detail error:", parseDetail.error);
  }
  assert(parseDetail.success, "scanDetail matches adminScanSchema");

  // 3. List Course Options
  console.log("Testing listCourses()...");
  const courses = await controller.listCourses({
    programId: "prog-1",
    semesterNumber: 1,
    stream: "NATURAL",
  });
  assert(courses.length > 0, "listCourses returns courses for program/semester/stream");
  assert(scanCourseOptionSchema.safeParse(courses[0]).success, "first course matches scanCourseOptionSchema");

  // 4. Create New Scan
  console.log("Testing createScan()...");
  const newScan = await controller.createScan(
    {
      kind: "EXAM",
      examKind: "FINAL",
      courseId: "course-uuid-1",
      year: 2024,
      pages: [
        {
          name: "exam-page1.png",
          mime: "image/png",
          sizeBytes: 150000,
        },
      ],
      answers: [
        {
          questionId: "Q-1",
          text: "C",
          questionType: "MULTIPLE_CHOICE",
          file: null,
        },
      ],
    },
    "admin-uuid-1",
  );
  assert(!!newScan.id, "createScan returns newly created scan");
  assert(newScan.kind === "EXAM", "createScan preserves kind");
  const parseNew = adminScanSchema.safeParse(newScan);
  if (!parseNew.success) {
    console.error("Parse new scan error:", parseNew.error);
  }
  assert(parseNew.success, "newScan matches adminScanSchema");

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

runAdminScansTests();
