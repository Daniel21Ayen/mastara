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
import { httpClient } from '@/core/network';

/**
 * Real Catalog API: communicates with the backend NestJS service.
 * Making an entry inactive needs a reason. Every write is recorded in the audit log.
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
    const result = await httpClient.get<AdminUniversity[] | { items: AdminUniversity[] }>(
      '/catalog/admin/universities',
    );
    const items = Array.isArray(result) ? result : (result?.items ?? []);
    return items.map((u) => adminUniversitySchema.parse(u));
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
    const result = await httpClient.get<AdminProgram[] | { items: AdminProgram[] }>(
      '/catalog/admin/programs',
    );
    const items = Array.isArray(result) ? result : (result?.items ?? []);
    return items.map((p) => adminProgramSchema.parse(p));
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
    const result = await httpClient.get<AdminSemester[] | { items: AdminSemester[] }>(
      '/catalog/admin/semesters',
    );
    const items = Array.isArray(result) ? result : (result?.items ?? []);
    return items.map((s) => adminSemesterSchema.parse(s));
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

export const catalogApi: CatalogApi = realCatalogApi;
