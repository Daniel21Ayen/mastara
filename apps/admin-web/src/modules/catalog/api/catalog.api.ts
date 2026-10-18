// apps/admin-web/src/modules/catalog/api/catalog.api.ts
import {
  adminCourseSchema,
  adminProgramSchema,
  adminSemesterSchema,
  adminUniversitySchema,
  courseListResultSchema,
  createCourseSchema,
  programInputSchema,
  semesterStatusSchema,
  universityInputSchema,
  updateCourseSchema,
} from '@mastara/contracts';
import type {
  AdminCourse,
  AdminProgram,
  AdminSemester,
  AdminUniversity,
  CourseListQuery,
  CourseListResult,
  CreateCourseInput,
  ProgramInput,
  SemesterStatusInput,
  UniversityInput,
  UpdateCourseInput,
} from '@mastara/contracts';
import { statusChange } from '@mastara/domain';
import type { AuditAction, CatalogStatus } from '@mastara/domain';

import { env } from '@/core/config/env';
import {
  createCatalogCourse,
  createCatalogProgram,
  createCatalogUniversity,
  deleteCatalogCourse,
  deleteCatalogProgram,
  deleteCatalogSemester,
  deleteCatalogUniversity,
  listCatalogCourses,
  listCatalogPrograms,
  listCatalogSemesters,
  listCatalogUniversities,
  recordAudit,
  updateCatalogCourse,
  updateCatalogProgram,
  updateCatalogSemester,
  updateCatalogUniversity,
} from '@/core/mock/data';
import { simulateLatency } from '@/core/mock/delay';
import { httpClient } from '@/core/network';

/**
 * Making an entry inactive needs a reason. Every write is recorded in the audit log. Semesters are
 * created with their program. An entry that programs, courses or students still use cannot be deleted
 * (the call fails with IN_USE); make it inactive instead.
 */
export interface CatalogApi {
  listCourses(query: CourseListQuery): Promise<CourseListResult>;
  createCourse(input: CreateCourseInput): Promise<AdminCourse>;
  updateCourse(id: string, input: UpdateCourseInput): Promise<AdminCourse>;
  deleteCourse(id: string): Promise<AdminCourse>;
  listUniversities(): Promise<AdminUniversity[]>;
  createUniversity(input: UniversityInput): Promise<AdminUniversity>;
  updateUniversity(id: string, input: UniversityInput): Promise<AdminUniversity>;
  deleteUniversity(id: string): Promise<AdminUniversity>;
  listPrograms(): Promise<AdminProgram[]>;
  createProgram(input: ProgramInput): Promise<AdminProgram>;
  updateProgram(id: string, input: ProgramInput): Promise<AdminProgram>;
  deleteProgram(id: string): Promise<AdminProgram>;
  listSemesters(): Promise<AdminSemester[]>;
  updateSemester(id: string, input: SemesterStatusInput): Promise<AdminSemester>;
  deleteSemester(id: string): Promise<AdminSemester>;
}

/** Which audit entry an edit writes: unpublish and publish are named, other edits are "updated". */
function editAction(
  before: CatalogStatus,
  after: CatalogStatus,
  names: { published: AuditAction; unpublished: AuditAction; updated: AuditAction },
): AuditAction {
  const change = statusChange(before, after);
  if (change === 'PUBLISH') return names.published;
  if (change === 'UNPUBLISH') return names.unpublished;
  return names.updated;
}

const mockCatalogApi: CatalogApi = {
  async listCourses(query) {
    await simulateLatency();
    return courseListResultSchema.parse(listCatalogCourses(query));
  },

  async createCourse(input) {
    await simulateLatency();
    const course = createCatalogCourse(createCourseSchema.parse(input));
    recordAudit({
      actor: 'ADMIN',
      action: 'COURSE_CREATED',
      target: `${course.code} · ${course.universityShortName}`,
    });
    return adminCourseSchema.parse(course);
  },

  async updateCourse(id, input) {
    await simulateLatency();
    const parsed = updateCourseSchema.parse(input);
    const { course, before } = updateCatalogCourse(id, parsed);
    recordAudit({
      actor: 'ADMIN',
      action: editAction(before, course.status, {
        published: 'COURSE_PUBLISHED',
        unpublished: 'COURSE_UNPUBLISHED',
        updated: 'COURSE_UPDATED',
      }),
      target: `${course.code} · ${course.universityShortName}`,
      reason: parsed.reason,
    });
    return adminCourseSchema.parse(course);
  },

  async deleteCourse(id) {
    await simulateLatency();
    const removed = deleteCatalogCourse(id);
    recordAudit({
      actor: 'ADMIN',
      action: 'COURSE_DELETED',
      target: `${removed.code} · ${removed.universityShortName}`,
    });
    return adminCourseSchema.parse(removed);
  },

  async listUniversities() {
    await simulateLatency();
    return listCatalogUniversities().map((item) => adminUniversitySchema.parse(item));
  },

  async createUniversity(input) {
    await simulateLatency();
    const university = createCatalogUniversity(universityInputSchema.parse(input));
    recordAudit({
      actor: 'ADMIN',
      action: 'CATALOG_ADDED',
      target: `University ${university.shortName}`,
    });
    return adminUniversitySchema.parse(university);
  },

  async updateUniversity(id, input) {
    await simulateLatency();
    const parsed = universityInputSchema.parse(input);
    const { university, before } = updateCatalogUniversity(id, parsed);
    recordAudit({
      actor: 'ADMIN',
      action: editAction(before, university.status, {
        published: 'CATALOG_UPDATED',
        unpublished: 'CATALOG_UNPUBLISHED',
        updated: 'CATALOG_UPDATED',
      }),
      target: `University ${university.shortName}`,
      reason: parsed.reason,
    });
    return adminUniversitySchema.parse(university);
  },

  async deleteUniversity(id) {
    await simulateLatency();
    const removed = deleteCatalogUniversity(id);
    recordAudit({
      actor: 'ADMIN',
      action: 'CATALOG_DELETED',
      target: `University ${removed.shortName}`,
    });
    return adminUniversitySchema.parse(removed);
  },

  async listPrograms() {
    await simulateLatency();
    return listCatalogPrograms().map((item) => adminProgramSchema.parse(item));
  },

  async createProgram(input) {
    await simulateLatency();
    const program = createCatalogProgram(programInputSchema.parse(input));
    recordAudit({
      actor: 'ADMIN',
      action: 'CATALOG_ADDED',
      target: `Program ${program.name} · ${program.universityShortName}`,
    });
    return adminProgramSchema.parse(program);
  },

  async updateProgram(id, input) {
    await simulateLatency();
    const parsed = programInputSchema.parse(input);
    const { program, before } = updateCatalogProgram(id, parsed);
    recordAudit({
      actor: 'ADMIN',
      action: editAction(before, program.status, {
        published: 'CATALOG_UPDATED',
        unpublished: 'CATALOG_UNPUBLISHED',
        updated: 'CATALOG_UPDATED',
      }),
      target: `Program ${program.name} · ${program.universityShortName}`,
      reason: parsed.reason,
    });
    return adminProgramSchema.parse(program);
  },

  async deleteProgram(id) {
    await simulateLatency();
    const removed = deleteCatalogProgram(id);
    recordAudit({
      actor: 'ADMIN',
      action: 'CATALOG_DELETED',
      target: `Program ${removed.name} · ${removed.universityShortName}`,
    });
    return adminProgramSchema.parse(removed);
  },

  async listSemesters() {
    await simulateLatency();
    return listCatalogSemesters().map((item) => adminSemesterSchema.parse(item));
  },

  async updateSemester(id, input) {
    await simulateLatency();
    const parsed = semesterStatusSchema.parse(input);
    const { semester, before } = updateCatalogSemester(id, parsed);
    recordAudit({
      actor: 'ADMIN',
      action: editAction(before, semester.status, {
        published: 'CATALOG_UPDATED',
        unpublished: 'CATALOG_UNPUBLISHED',
        updated: 'CATALOG_UPDATED',
      }),
      target: `Semester ${semester.number} · ${semester.programName} · ${semester.universityShortName}`,
      reason: parsed.reason,
    });
    return adminSemesterSchema.parse(semester);
  },

  async deleteSemester(id) {
    await simulateLatency();
    const removed = deleteCatalogSemester(id);
    recordAudit({
      actor: 'ADMIN',
      action: 'CATALOG_DELETED',
      target: `Semester ${removed.number} · ${removed.programName} · ${removed.universityShortName}`,
    });
    return adminSemesterSchema.parse(removed);
  },
};

export const realCatalogApi: CatalogApi = {
  async listCourses(query) {
    const params = new URLSearchParams();
    if (query.q && query.q.trim()) params.set('q', query.q.trim());
    if (query.universityId) params.set('universityId', query.universityId);
    if (query.programId) params.set('programId', query.programId);
    if (query.semesterNumber) params.set('semesterNumber', String(query.semesterNumber));
    if (query.stream) params.set('stream', query.stream);
    if (query.status) params.set('status', query.status);
    if (query.page) params.set('page', String(query.page));

    const qs = params.toString();
    const url = `/catalog/admin/courses${qs ? `?${qs}` : ''}`;
    const result = await httpClient.get<CourseListResult>(url);
    return courseListResultSchema.parse(result);
  },

  async createCourse(input) {
    const parsed = createCourseSchema.parse(input);
    const result = await httpClient.post<AdminCourse>('/catalog/admin/courses', parsed);
    return adminCourseSchema.parse(result);
  },

  async updateCourse(id, input) {
    const parsed = updateCourseSchema.parse(input);
    const result = await httpClient.put<AdminCourse>(
      `/catalog/admin/courses/${encodeURIComponent(id)}`,
      parsed,
    );
    return adminCourseSchema.parse(result);
  },

  async deleteCourse(id) {
    const result = await httpClient.delete<AdminCourse>(
      `/catalog/admin/courses/${encodeURIComponent(id)}`,
    );
    return adminCourseSchema.parse(result);
  },

  async listUniversities() {
    const result = await httpClient.get<AdminUniversity[]>('/catalog/admin/universities');
    return result.map((item) => adminUniversitySchema.parse(item));
  },

  async createUniversity(input) {
    const parsed = universityInputSchema.parse(input);
    const result = await httpClient.post<AdminUniversity>('/catalog/admin/universities', parsed);
    return adminUniversitySchema.parse(result);
  },

  async updateUniversity(id, input) {
    const parsed = universityInputSchema.parse(input);
    const result = await httpClient.put<AdminUniversity>(
      `/catalog/admin/universities/${encodeURIComponent(id)}`,
      parsed,
    );
    return adminUniversitySchema.parse(result);
  },

  async deleteUniversity(id) {
    const result = await httpClient.delete<AdminUniversity>(
      `/catalog/admin/universities/${encodeURIComponent(id)}`,
    );
    return adminUniversitySchema.parse(result);
  },

  async listPrograms() {
    const result = await httpClient.get<AdminProgram[]>('/catalog/admin/programs');
    return result.map((item) => adminProgramSchema.parse(item));
  },

  async createProgram(input) {
    const parsed = programInputSchema.parse(input);
    const result = await httpClient.post<AdminProgram>('/catalog/admin/programs', parsed);
    return adminProgramSchema.parse(result);
  },

  async updateProgram(id, input) {
    const parsed = programInputSchema.parse(input);
    const result = await httpClient.put<AdminProgram>(
      `/catalog/admin/programs/${encodeURIComponent(id)}`,
      parsed,
    );
    return adminProgramSchema.parse(result);
  },

  async deleteProgram(id) {
    const result = await httpClient.delete<AdminProgram>(
      `/catalog/admin/programs/${encodeURIComponent(id)}`,
    );
    return adminProgramSchema.parse(result);
  },

  async listSemesters() {
    const result = await httpClient.get<AdminSemester[]>('/catalog/admin/semesters');
    return result.map((item) => adminSemesterSchema.parse(item));
  },

  async updateSemester(id, input) {
    const parsed = semesterStatusSchema.parse(input);
    const result = await httpClient.put<AdminSemester>(
      `/catalog/admin/semesters/${encodeURIComponent(id)}`,
      parsed,
    );
    return adminSemesterSchema.parse(result);
  },

  async deleteSemester(id) {
    const result = await httpClient.delete<AdminSemester>(
      `/catalog/admin/semesters/${encodeURIComponent(id)}`,
    );
    return adminSemesterSchema.parse(result);
  },
};

function createCatalogApi(): CatalogApi {
  if (env.useMocks) return mockCatalogApi;
  return realCatalogApi;
}

export const catalogApi = createCatalogApi();
