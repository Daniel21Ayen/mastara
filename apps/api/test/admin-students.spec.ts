import "reflect-metadata";
import {
  DeviceBindingStatus,
  DevicePlatform,
  EntitlementStatus,
  OrderStatus,
  PublicationStatus,
  Role,
  Stream,
  StudentStatus,
} from "@mastara/database";
import {
  studentDetailSchema,
  studentListResultSchema,
} from "@mastara/contracts";
import { StudentsService } from "../src/modules/identity/students/services/students.service";
import { AdminStudentsController } from "../src/modules/identity/students/controllers/admin-students.controller";

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

async function runAdminStudentsTests() {
  console.log("=== Testing Admin Students Service, Controller & Contract Alignment ===\n");

  const now = new Date();
  const futureDate = new Date(now.getTime() + 30 * 86400000);
  const pastDate = new Date(now.getTime() - 10 * 86400000);

  // In-memory mock data
  const mockUniversities = [
    { id: "uni-1", code: "AAU", name_en: "Addis Ababa University", status: PublicationStatus.PUBLISHED, sort_order: 1 },
    { id: "uni-2", code: "ASTU", name_en: "Adama Science and Technology", status: PublicationStatus.PUBLISHED, sort_order: 2 },
  ];

  const mockPrograms = [
    { id: "prog-1", university_id: "uni-1", name_en: "Pre-Engineering", status: PublicationStatus.PUBLISHED, sort_order: 1 },
  ];

  const mockSemesters = [
    { id: "sem-1", program_id: "prog-1", code: "SEM1", name_en: "Semester 1", status: PublicationStatus.PUBLISHED, sort_order: 1 },
    { id: "sem-2", program_id: "prog-1", code: "SEM2", name_en: "Semester 2", status: PublicationStatus.PUBLISHED, sort_order: 2 },
  ];

  const mockCourses = [
    { id: "c-1", semester_id: "sem-1", code: "MATH101", title_en: "Calculus I", stream: Stream.NATURAL },
    { id: "c-2", semester_id: "sem-1", code: "PHYS101", title_en: "General Physics", stream: Stream.COMMON },
  ];

  const mockStudents: any[] = [
    {
      id: "student-uuid-1",
      student_code: "MS0001",
      first_name: "Abebe",
      last_name: "Kebede",
      phone: "+251911000001",
      email: "abebe@example.com",
      role: Role.STUDENT,
      status: StudentStatus.ACTIVE,
      university_id: "uni-1",
      program_id: "prog-1",
      semester_id: "sem-1",
      stream_pref: Stream.NATURAL,
      created_at: now,
      university: mockUniversities[0],
      program: mockPrograms[0],
      semester: mockSemesters[0],
      device_binding: {
        id: "dev-1",
        student_id: "student-uuid-1",
        device_name: "Samsung Galaxy A54",
        platform: DevicePlatform.ANDROID,
        status: DeviceBindingStatus.ACTIVE,
        bound_at: pastDate,
        last_seen_at: now,
      },
      courses: [
        { course_id: "c-1", course: mockCourses[0], is_active: true },
        { course_id: "c-2", course: mockCourses[1], is_active: true },
      ],
      entitlements: [
        {
          id: "ent-1",
          course_id: "c-1",
          course: mockCourses[0],
          starts_at: pastDate,
          expires_at: futureDate,
          status: EntitlementStatus.ACTIVE,
        },
      ],
      orders: [],
    },
    {
      id: "student-uuid-2",
      student_code: "MS0002",
      first_name: "Tigist",
      last_name: "Alemu",
      phone: "+251911000002",
      email: "tigist@example.com",
      role: Role.STUDENT,
      status: StudentStatus.SUSPENDED,
      university_id: "uni-1",
      program_id: "prog-1",
      semester_id: "sem-2",
      stream_pref: Stream.SOCIAL,
      created_at: pastDate,
      university: mockUniversities[0],
      program: mockPrograms[0],
      semester: mockSemesters[1],
      device_binding: null,
      courses: [],
      entitlements: [],
      orders: [
        {
          id: "ord-1",
          status: OrderStatus.PAYMENT_SUBMITTED,
          items: [{ course_id: "c-1", course: mockCourses[0] }],
        },
      ],
    },
  ];

  const auditLogs: any[] = [];

  const mockPrisma: any = {
    student: {
      count: async ({ where }: any) => {
        return mockStudents.filter((s) => {
          if (where?.role && s.role !== where.role) return false;
          if (where?.university_id && s.university_id !== where.university_id) return false;
          if (where?.stream_pref && s.stream_pref !== where.stream_pref) return false;
          return true;
        }).length;
      },
      findMany: async ({ where, skip = 0, take = 10 }: any) => {
        const filtered = mockStudents.filter((s) => {
          if (where?.role && s.role !== where.role) return false;
          if (where?.university_id && s.university_id !== where.university_id) return false;
          if (where?.stream_pref && s.stream_pref !== where.stream_pref) return false;
          return true;
        });
        return filtered.slice(skip, skip + take);
      },
      findUnique: async ({ where }: any) => {
        return mockStudents.find((s) => s.id === where.id) || null;
      },
      findFirst: async ({ where }: any) => {
        if (where?.OR) {
          return (
            mockStudents.find((s) =>
              where.OR.some(
                (cond: any) =>
                  (cond.phone && s.phone === cond.phone) ||
                  (cond.email && s.email === cond.email),
              ),
            ) || null
          );
        }
        return (
          mockStudents.find((s) =>
            (where?.id && s.id === where.id) ||
            (where?.student_code && (s.student_code === where.student_code || s.id === where.student_code)),
          ) || null
        );
      },
      create: async ({ data }: any) => {
        const created: any = {
          id: `student-uuid-${mockStudents.length + 1}`,
          ...data,
          university: mockUniversities.find((u) => u.id === data.university_id),
          program: mockPrograms.find((p) => p.id === data.program_id),
          semester: mockSemesters.find((s) => s.id === data.semester_id),
          device_binding: null,
          courses: [],
          entitlements: [],
          orders: [],
        };
        mockStudents.push(created);
        return created;
      },
      update: async ({ where, data }: any) => {
        const s = mockStudents.find((item) => item.id === where.id);
        if (s) {
          Object.assign(s, data);
        }
        return s;
      },
    },
    university: {
      findMany: async () => mockUniversities,
      findUnique: async ({ where }: any) => mockUniversities.find((u) => u.id === where.id) || null,
    },
    program: {
      findMany: async () => mockPrograms,
      findUnique: async ({ where }: any) => mockPrograms.find((p) => p.id === where.id) || null,
    },
    semester: {
      findMany: async () => mockSemesters,
      findUnique: async ({ where }: any) => mockSemesters.find((s) => s.id === where.id) || null,
    },
    course: {
      findMany: async () => mockCourses,
      findUnique: async ({ where }: any) => mockCourses.find((c) => c.id === where.id) || null,
    },
    deviceBinding: {
      findUnique: async ({ where }: any) => {
        const s = mockStudents.find((item) => item.id === where.student_id);
        return s?.device_binding || null;
      },
      update: async ({ where, data }: any) => {
        const s = mockStudents.find((item) => item.id === where.student_id);
        if (s && s.device_binding) {
          Object.assign(s.device_binding, data);
          return s.device_binding;
        }
        return null;
      },
    },
    entitlement: {
      create: async ({ data }: any) => {
        const created = { id: `ent-${Date.now()}`, course: mockCourses.find((c) => c.id === data.course_id), ...data };
        const s = mockStudents.find((item) => item.id === data.student_id);
        if (s) {
          s.entitlements.push(created);
        }
        return created;
      },
      update: async ({ where, data }: any) => {
        for (const s of mockStudents) {
          const e = s.entitlements.find((item: any) => item.id === where.id);
          if (e) {
            Object.assign(e, data);
            return e;
          }
        }
        return null;
      },
    },
    studentCourse: {
      createMany: async ({ data }: any) => {
        for (const item of data) {
          const s = mockStudents.find((st) => st.id === item.student_id);
          if (s) {
            const course = mockCourses.find((c) => c.id === item.course_id);
            s.courses.push({ course_id: item.course_id, course, is_active: item.is_active });
          }
        }
      },
      upsert: async ({ create, where }: any) => {
        const s = mockStudents.find((item) => item.id === where.student_id_course_id.student_id);
        if (s) {
          const existing = s.courses.find((c: any) => c.course_id === where.student_id_course_id.course_id);
          if (existing) {
            existing.is_active = true;
          } else {
            const course = mockCourses.find((c) => c.id === create.course_id);
            s.courses.push({ course_id: create.course_id, course, is_active: true });
          }
        }
      },
    },
  };

  const mockAuditService: any = {
    log: async (entry: any) => {
      auditLogs.push(entry);
    },
  };

  const service = new StudentsService(mockPrisma, mockAuditService);
  const controller = new AdminStudentsController(service);

  // 1. Test listAdminStudents
  const listResult = await service.listAdminStudents({ page: 1 });
  assert(listResult.items.length === 2, "Lists 2 students");
  assert(listResult.total === 2, "Total is 2");

  const parsedList = studentListResultSchema.safeParse(listResult);
  assert(parsedList.success, "StudentListResult validates against @mastara/contracts schema");

  const student1InList = listResult.items.find((s) => s.id === "student-uuid-1");
  assert(student1InList?.access === "PAID", "Student 1 has derived access PAID");
  assert(student1InList?.device === "BOUND", "Student 1 device status is BOUND");

  const student2InList = listResult.items.find((s) => s.id === "student-uuid-2");
  assert(student2InList?.access === "PENDING", "Student 2 has derived access PENDING");
  assert(student2InList?.device === "RELEASED", "Student 2 device status is RELEASED");

  // 2. Test getStudentOptions
  const options = await service.getStudentOptions();
  assert(options.universities.length === 2, "Returns 2 universities");
  assert(options.programs.length === 1, "Returns 1 program");
  assert(options.semesters.length === 2, "Returns 2 semesters");
  assert(options.semesters[0]?.number === 1, "Semester 1 has number 1");
  assert(options.semesters[1]?.number === 2, "Semester 2 has number 2");

  // 3. Test getAdminStudentById
  const detail = await service.getAdminStudentById("student-uuid-1");
  assert(detail.id === "student-uuid-1", "Fetches student 1 detail");
  assert(detail.programName === "Pre-Engineering", "Program name matches");
  assert(detail.semesterNumber === 1, "Semester number is 1");
  assert(detail.boundAt !== undefined, "boundAt is populated");
  assert(detail.courses.length >= 2, "Returns courses list");

  const parsedDetail = studentDetailSchema.safeParse(detail);
  assert(parsedDetail.success, "StudentDetail validates against @mastara/contracts schema");

  // 4. Test suspendStudent
  const suspended = await service.suspendStudent("admin-1", "student-uuid-1", "Disciplinary review pending");
  assert(suspended.status === "SUSPENDED", "Student status updated to SUSPENDED");
  assert(
    auditLogs.some((l) => l.action === "STUDENT_SUSPENDED" && l.targetId === "student-uuid-1"),
    "Logged STUDENT_SUSPENDED audit entry",
  );

  let threwSuspendConflict = false;
  try {
    await service.suspendStudent("admin-1", "student-uuid-1", "Duplicate suspend");
  } catch {
    threwSuspendConflict = true;
  }
  assert(threwSuspendConflict, "Throws conflict when suspending already-suspended student");

  // 5. Test reactivateStudent
  const reactivated = await service.reactivateStudent("admin-1", "student-uuid-1", "Review cleared by committee");
  assert(reactivated.status === "ACTIVE", "Student status updated to ACTIVE");
  assert(
    auditLogs.some((l) => l.action === "STUDENT_REACTIVATED" && l.targetId === "student-uuid-1"),
    "Logged STUDENT_REACTIVATED audit entry",
  );

  // 6. Test revokeStudentDevice
  const revoked = await service.revokeStudentDevice("admin-1", "student-uuid-1", "Lost phone reported by student");
  assert(revoked.device === "RELEASED", "Device status updated to RELEASED");
  assert(
    auditLogs.some((l) => l.action === "DEVICE_REVOKED" && l.targetId === "student-uuid-1"),
    "Logged DEVICE_REVOKED audit entry",
  );

  let threwRevokeConflict = false;
  try {
    await service.revokeStudentDevice("admin-1", "student-uuid-1", "Revoke again");
  } catch {
    threwRevokeConflict = true;
  }
  assert(threwRevokeConflict, "Throws conflict when revoking device that is not bound");

  // 7. Test grantStudentAccess (Extension of active access)
  const initialExpiry = new Date(detail.courses[0]?.expiresAt || now).getTime();
  const granted = await service.grantStudentAccess(
    "admin-1",
    "student-uuid-1",
    "c-1",
    15,
    "Merit scholarship 15-day extension",
  );
  const newExpiry = new Date(granted.courses.find((c) => c.courseId === "c-1")!.expiresAt!).getTime();
  assert(newExpiry > initialExpiry, "Access expiry extended into the future");
  assert(
    auditLogs.some((l) => l.action === "ACCESS_EXTENDED" && l.metadata.days === 15),
    "Logged ACCESS_EXTENDED audit entry",
  );

  // 8. Test createAdminStudent
  const newStudent = await service.createAdminStudent("admin-1", {
    name: "Kidus Yohannes",
    identifier: "+251911998877",
    universityId: "uni-1",
    programId: "prog-1",
    semesterId: "sem-1",
    stream: "NATURAL",
  });
  assert(newStudent.name === "Kidus Yohannes", "Created student name matches");
  assert(newStudent.status === "ACTIVE", "New student status is ACTIVE");
  assert(newStudent.device === "RELEASED", "New student device is RELEASED");
  assert(
    auditLogs.some((l) => l.action === "STUDENT_ADDED" && l.targetId === newStudent.id),
    "Logged STUDENT_ADDED audit entry",
  );

  // Duplicate identifier check
  let threwDuplicateConflict = false;
  try {
    await service.createAdminStudent("admin-1", {
      name: "Another Kidus",
      identifier: "+251911998877",
      universityId: "uni-1",
      programId: "prog-1",
      semesterId: "sem-1",
      stream: "NATURAL",
    });
  } catch {
    threwDuplicateConflict = true;
  }
  assert(threwDuplicateConflict, "Throws conflict when creating student with duplicate identifier");

  // 9. Controller endpoints verification
  const controllerList = await controller.listStudents({ page: 1 });
  assert(controllerList.items.length === 3, "Controller listStudents returns 3 students");

  const controllerOptions = await controller.getOptions();
  assert(controllerOptions.universities.length === 2, "Controller getOptions returns universities");

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runAdminStudentsTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
