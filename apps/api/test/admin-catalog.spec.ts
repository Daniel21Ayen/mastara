import "reflect-metadata";
import { PublicationStatus, Stream } from "@mastara/database";
import {
  adminCourseSchema,
  adminProgramSchema,
  adminSemesterSchema,
  adminUniversitySchema,
  courseListResultSchema,
} from "@mastara/contracts";
import { CatalogService } from "../src/modules/catalog/services/catalog.service";
import { AdminCatalogController } from "../src/modules/catalog/controllers/admin-catalog.controller";

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

async function runAdminCatalogTests() {
  console.log("=== Testing Admin Catalog Service, Controller & Contract Alignment ===\n");

  const mockUniversities: any[] = [
    {
      id: "uni-1",
      code: "AAU",
      name_en: "Addis Ababa University",
      name_am: "አዲስ አበባ ዩኒቨርሲቲ",
      logo_url: "https://assets.mastara.edu.et/aau.png",
      status: PublicationStatus.PUBLISHED,
      sort_order: 1,
      _count: { programs: 1, students: 0 },
    },
    {
      id: "uni-2",
      code: "ASTU",
      name_en: "Adama Science and Technology",
      name_am: "አዳማ ሳይንስና ቴክኖሎጂ",
      logo_url: null,
      status: PublicationStatus.DRAFT,
      sort_order: 2,
      _count: { programs: 0, students: 0 },
    },
  ];

  const mockPrograms: any[] = [
    {
      id: "prog-1",
      university_id: "uni-1",
      code: "PREENG",
      name_en: "Pre-Engineering",
      name_am: "ቅድመ ምህንድስና",
      status: PublicationStatus.PUBLISHED,
      sort_order: 1,
      university: mockUniversities[0],
      semesters: [],
      _count: { students: 0 },
    },
  ];

  const mockSemesters: any[] = [
    {
      id: "sem-1",
      program_id: "prog-1",
      code: "SEM1",
      name_en: "Semester 1",
      name_am: "ሴሚስተር 1",
      sort_order: 1,
      status: PublicationStatus.PUBLISHED,
      program: mockPrograms[0],
      courses: [],
      _count: { courses: 1, students: 0 },
    },
  ];
  mockPrograms[0].semesters = mockSemesters;

  const mockCourses: any[] = [
    {
      id: "course-1",
      semester_id: "sem-1",
      code: "MATH101",
      title_en: "Calculus I",
      title_am: "ካልኩለስ 1",
      stream: Stream.NATURAL,
      is_promotional: true,
      trial_expiry_days: 3,
      status: PublicationStatus.PUBLISHED,
      sort_order: 1,
      semester: mockSemesters[0],
      _count: { student_courses: 0, order_items: 0, entitlements: 0 },
    },
  ];
  mockSemesters[0].courses = mockCourses;

  const auditLogs: any[] = [];

  const mockPrisma: any = {
    university: {
      findMany: async () => mockUniversities,
      findUnique: async ({ where }: any) =>
        mockUniversities.find((u) => u.id === where.id || u.code === where.code) || null,
      findFirst: async ({ where }: any) => {
        if (where?.id?.not) {
          return (
            mockUniversities.find(
              (u) =>
                u.id !== where.id.not &&
                where.OR?.some((cond: any) => cond.code === u.code || cond.name_en === u.name_en),
            ) || null
          );
        }
        if (where?.OR) {
          return (
            mockUniversities.find((u) =>
              where.OR.some((cond: any) => cond.code === u.code || cond.name_en === u.name_en),
            ) || null
          );
        }
        return mockUniversities.find((u) => u.id === where.id || u.code === where.code) || null;
      },
      create: async ({ data }: any) => {
        const created = {
          id: `uni-${Date.now()}`,
          ...data,
          logo_url: data.logo_url ?? null,
          sort_order: mockUniversities.length + 1,
          _count: { programs: 0, students: 0 },
        };
        mockUniversities.push(created);
        return created;
      },
      update: async ({ where, data }: any) => {
        const u = mockUniversities.find((item) => item.id === where.id);
        if (u) Object.assign(u, data);
        return u;
      },
      delete: async ({ where }: any) => {
        const idx = mockUniversities.findIndex((item) => item.id === where.id);
        if (idx >= 0) return mockUniversities.splice(idx, 1)[0];
        return null;
      },
    },
    program: {
      findMany: async () => mockPrograms,
      findUnique: async ({ where }: any) => mockPrograms.find((p) => p.id === where.id) || null,
      findFirst: async ({ where }: any) => {
        if (where?.id?.not) {
          return (
            mockPrograms.find(
              (p) =>
                p.id !== where.id.not &&
                p.university_id === where.university_id &&
                p.name_en === where.name_en,
            ) || null
          );
        }
        return (
          mockPrograms.find(
            (p) =>
              (where?.university_id ? p.university_id === where.university_id : true) &&
              (where?.name_en ? p.name_en === where.name_en : true) &&
              (where?.code ? p.code === where.code : true),
          ) || null
        );
      },
      create: async ({ data }: any) => {
        const uni = mockUniversities.find((u) => u.id === data.university_id);
        const created = {
          id: `prog-${Date.now()}`,
          ...data,
          sort_order: mockPrograms.length + 1,
          university: uni,
          semesters: [],
          _count: { students: 0 },
        };
        mockPrograms.push(created);
        return created;
      },
      update: async ({ where, data }: any) => {
        const p = mockPrograms.find((item) => item.id === where.id);
        if (p) Object.assign(p, data);
        return p;
      },
      delete: async ({ where }: any) => {
        const idx = mockPrograms.findIndex((item) => item.id === where.id);
        if (idx >= 0) return mockPrograms.splice(idx, 1)[0];
        return null;
      },
    },
    semester: {
      findMany: async () => mockSemesters,
      findUnique: async ({ where }: any) => mockSemesters.find((s) => s.id === where.id) || null,
      findFirst: async ({ where }: any) =>
        mockSemesters.find(
          (s) =>
            (where?.program_id ? s.program_id === where.program_id : true) &&
            (where?.sort_order ? s.sort_order === where.sort_order : true),
        ) || null,
      create: async ({ data }: any) => {
        const prog = mockPrograms.find((p) => p.id === data.program_id);
        const created = {
          id: `sem-${Date.now()}`,
          ...data,
          program: prog,
          courses: [],
          _count: { courses: 0, students: 0 },
        };
        mockSemesters.push(created);
        if (prog) prog.semesters.push(created);
        return created;
      },
      createMany: async ({ data }: any) => {
        for (const item of data) {
          const prog = mockPrograms.find((p) => p.id === item.program_id);
          const created = {
            id: `sem-${Date.now()}-${item.code}`,
            ...item,
            program: prog,
            courses: [],
            _count: { courses: 0, students: 0 },
          };
          mockSemesters.push(created);
          if (prog) prog.semesters.push(created);
        }
      },
      update: async ({ where, data }: any) => {
        const s = mockSemesters.find((item) => item.id === where.id);
        if (s) Object.assign(s, data);
        return s;
      },
      delete: async ({ where }: any) => {
        const idx = mockSemesters.findIndex((item) => item.id === where.id);
        if (idx >= 0) return mockSemesters.splice(idx, 1)[0];
        return null;
      },
    },
    course: {
      count: async () => mockCourses.length,
      findMany: async () => mockCourses,
      findUnique: async ({ where }: any) => mockCourses.find((c) => c.id === where.id) || null,
      findFirst: async ({ where }: any) =>
        mockCourses.find(
          (c) =>
            c.semester_id === where.semester_id &&
            c.code === where.code &&
            (!where.id?.not || c.id !== where.id.not),
        ) || null,
      create: async ({ data, include }: any) => {
        const sem = mockSemesters.find((s) => s.id === data.semester_id);
        const created = {
          id: `course-${Date.now()}`,
          ...data,
          semester: sem,
          _count: { student_courses: 0, order_items: 0, entitlements: 0 },
        };
        mockCourses.push(created);
        if (sem) sem.courses.push(created);
        return created;
      },
      update: async ({ where, data }: any) => {
        const c = mockCourses.find((item) => item.id === where.id);
        if (c) Object.assign(c, data);
        return c;
      },
      delete: async ({ where }: any) => {
        const idx = mockCourses.findIndex((item) => item.id === where.id);
        if (idx >= 0) return mockCourses.splice(idx, 1)[0];
        return null;
      },
    },
    $transaction: async (cb: any) => cb(mockPrisma),
  };

  const mockAuditService: any = {
    log: async (entry: any) => {
      auditLogs.push(entry);
    },
  };

  const service = new CatalogService(mockPrisma, mockAuditService);
  const controller = new AdminCatalogController(service);

  // 1. Test Universities CRUD
  const universities = await service.listAdminUniversities();
  assert(universities.length === 2, "Lists 2 universities");
  assert(adminUniversitySchema.safeParse(universities[0]).success, "University matches adminUniversitySchema");

  const createdUni = await service.createAdminUniversity("admin-1", {
    name: "Bahir Dar University",
    shortName: "BDU",
    status: "PUBLISHED",
  });
  assert(createdUni.shortName === "BDU", "Created university shortName is BDU");
  assert(auditLogs.some((l) => l.action === "CATALOG_ADDED" && l.targetId === createdUni.id), "Logged CATALOG_ADDED for university");

  const updatedUni = await service.updateAdminUniversity("admin-1", createdUni.id, {
    name: "Bahir Dar University",
    shortName: "BDU",
    status: "DRAFT",
    reason: "Updating university curriculum guidelines",
  });
  assert(updatedUni.status === "DRAFT", "Updated university status to DRAFT");
  assert(auditLogs.some((l) => l.action === "CATALOG_UNPUBLISHED" && l.targetId === createdUni.id), "Logged CATALOG_UNPUBLISHED for university");

  // IN_USE delete protection test
  let threwUniInUse = false;
  try {
    await service.deleteAdminUniversity("admin-1", "uni-1");
  } catch {
    threwUniInUse = true;
  }
  assert(threwUniInUse, "Throws conflict when deleting university in use");

  // Successful deletion of unused university
  const deletedUni = await service.deleteAdminUniversity("admin-1", createdUni.id);
  assert(deletedUni.id === createdUni.id, "Deleted unused university successfully");
  assert(auditLogs.some((l) => l.action === "CATALOG_DELETED" && l.targetId === createdUni.id), "Logged CATALOG_DELETED for university");

  // 2. Test Programs CRUD & automatic semester generation
  const programs = await service.listAdminPrograms();
  assert(programs.length === 1, "Lists 1 program");
  assert(adminProgramSchema.safeParse(programs[0]).success, "Program matches adminProgramSchema");

  const createdProg = await service.createAdminProgram("admin-1", {
    universityId: "uni-1",
    name: "Computer Science",
    status: "PUBLISHED",
  });
  assert(createdProg.name === "Computer Science", "Created program name matches");
  assert(
    mockSemesters.some((s) => s.program_id === createdProg.id && s.code === "SEM1"),
    "Automatically generated Semester 1 for new program",
  );
  assert(
    mockSemesters.some((s) => s.program_id === createdProg.id && s.code === "SEM2"),
    "Automatically generated Semester 2 for new program",
  );

  // 3. Test Semesters status update
  const semesters = await service.listAdminSemesters();
  assert(semesters.length >= 3, "Lists semesters");
  assert(adminSemesterSchema.safeParse(semesters[0]).success, "Semester matches adminSemesterSchema");

  const updatedSem = await service.updateAdminSemester("admin-1", "sem-1", {
    status: "DRAFT",
    reason: "Curriculum overhaul for semester 1",
  });
  assert(updatedSem.status === "DRAFT", "Updated semester status to DRAFT");
  assert(auditLogs.some((l) => l.action === "CATALOG_UNPUBLISHED" && l.targetId === "sem-1"), "Logged CATALOG_UNPUBLISHED for semester");

  // 4. Test Courses CRUD & CourseListQuery
  const coursesList = await service.listAdminCourses({ page: 1 });
  assert(coursesList.items.length === 1, "Lists courses");
  assert(courseListResultSchema.safeParse(coursesList).success, "CourseListResult matches courseListResultSchema");
  assert(adminCourseSchema.safeParse(coursesList.items[0]).success, "Course matches adminCourseSchema");

  const createdCourse = await service.createAdminCourse("admin-1", {
    universityId: "uni-1",
    semesterId: "sem-1",
    code: "PHYS101",
    title: "General Physics",
    stream: "COMMON",
    freeTrialItems: 2,
    status: "PUBLISHED",
  });
  assert(createdCourse.code === "PHYS101", "Created course code matches");
  assert(createdCourse.promotional === true, "Course with trial items is promotional");
  assert(auditLogs.some((l) => l.action === "COURSE_CREATED" && l.targetId === createdCourse.id), "Logged COURSE_CREATED");

  const updatedCourse = await service.updateAdminCourse("admin-1", createdCourse.id, {
    code: "PHYS101",
    title: "General Physics I",
    stream: "COMMON",
    freeTrialItems: 0,
    status: "PUBLISHED",
  });
  assert(updatedCourse.title === "General Physics I", "Updated course title matches");
  assert(updatedCourse.promotional === false, "Course with 0 trial items is not promotional");

  // 5. Test Controller endpoints
  const controllerCourses = await controller.listCourses({ page: 1 });
  assert(controllerCourses.total >= 2, "Controller listCourses returns list");

  const controllerUnis = await controller.listUniversities();
  assert(controllerUnis.length >= 2, "Controller listUniversities returns list");

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runAdminCatalogTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
