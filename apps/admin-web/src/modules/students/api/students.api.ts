// apps/admin-web/src/modules/students/api/students.api.ts
import {
  createStudentSchema,
  grantAccessSchema,
  studentActionSchema,
  studentDetailSchema,
  studentListResultSchema,
} from '@mastara/contracts';
import type {
  CreateStudentInput,
  GrantAccessInput,
  Program,
  Semester,
  StudentActionInput,
  StudentDetail,
  StudentListQuery,
  StudentListResult,
  University,
} from '@mastara/contracts';

import { env } from '@/core/config/env';
import {
  courseById,
  createStudent,
  getStudent,
  grantStudentAccess,
  isProgramPublished,
  isUniversityPublished,
  listStudents,
  programs,
  recordAudit,
  revokeStudentDevice,
  semesters,
  setStudentStatus,
  universities,
} from '@/core/mock/data';
import { simulateLatency } from '@/core/mock/delay';

export interface StudentOptions {
  universities: readonly University[];
  programs: readonly Program[];
  semesters: readonly Semester[];
}

/** Every write needs a reason, except adding a student. Each write is recorded in the audit log. */
export interface StudentsApi {
  list(query: StudentListQuery): Promise<StudentListResult>;
  get(id: string): Promise<StudentDetail>;
  /** Published universities, programs and semesters for the filters and the Add student form. */
  getOptions(): Promise<StudentOptions>;
  create(input: CreateStudentInput): Promise<StudentDetail>;
  suspend(id: string, input: StudentActionInput): Promise<StudentDetail>;
  reactivate(id: string, input: StudentActionInput): Promise<StudentDetail>;
  revokeDevice(id: string, input: StudentActionInput): Promise<StudentDetail>;
  grantAccess(id: string, input: GrantAccessInput): Promise<StudentDetail>;
}

const mockStudentsApi: StudentsApi = {
  async list(query) {
    await simulateLatency();
    return studentListResultSchema.parse(listStudents(query));
  },

  async get(id) {
    await simulateLatency();
    return studentDetailSchema.parse(getStudent(id));
  },

  async getOptions() {
    await simulateLatency(100);
    // Drafts are not offered when adding a student.
    const livePrograms = programs.filter(
      (program) => isProgramPublished(program.id) && isUniversityPublished(program.universityId),
    );
    return {
      universities: universities.filter((university) => isUniversityPublished(university.id)),
      programs: livePrograms,
      semesters: semesters.filter((semester) =>
        livePrograms.some((program) => program.id === semester.programId),
      ),
    };
  },

  async create(input) {
    await simulateLatency();
    const detail = createStudent(createStudentSchema.parse(input));
    recordAudit({ actor: 'ADMIN', action: 'STUDENT_ADDED', target: `Student ${detail.id}` });
    return studentDetailSchema.parse(detail);
  },

  async suspend(id, input) {
    await simulateLatency();
    const { reason } = studentActionSchema.parse(input);
    const detail = setStudentStatus(id, 'SUSPENDED');
    recordAudit({ actor: 'ADMIN', action: 'STUDENT_SUSPENDED', target: `Student ${id}`, reason });
    return studentDetailSchema.parse(detail);
  },

  async reactivate(id, input) {
    await simulateLatency();
    const { reason } = studentActionSchema.parse(input);
    const detail = setStudentStatus(id, 'ACTIVE');
    recordAudit({ actor: 'ADMIN', action: 'STUDENT_REACTIVATED', target: `Student ${id}`, reason });
    return studentDetailSchema.parse(detail);
  },

  async revokeDevice(id, input) {
    await simulateLatency();
    const { reason } = studentActionSchema.parse(input);
    const detail = revokeStudentDevice(id);
    recordAudit({ actor: 'ADMIN', action: 'DEVICE_REVOKED', target: `Student ${id}`, reason });
    return studentDetailSchema.parse(detail);
  },

  async grantAccess(id, input) {
    await simulateLatency();
    const { courseId, days, reason } = grantAccessSchema.parse(input);
    const { detail, extended } = grantStudentAccess(id, courseId, days);
    const courseTitle = courseById(courseId)?.title ?? courseId;
    recordAudit({
      actor: 'ADMIN',
      action: extended ? 'ACCESS_EXTENDED' : 'ACCESS_GRANTED',
      target: `Student ${id} · ${courseTitle}`,
      reason,
    });
    return studentDetailSchema.parse(detail);
  },
};

function createStudentsApi(): StudentsApi {
  if (env.useMocks) return mockStudentsApi;
  throw new Error('The real students API is added in the backend integration phase.');
}

export const studentsApi = createStudentsApi();
