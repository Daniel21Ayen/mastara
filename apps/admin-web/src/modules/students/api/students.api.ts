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
import { httpClient } from '@/core/network';

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

export const realStudentsApi: StudentsApi = {
  async list(query) {
    const params = new URLSearchParams();
    if (query.access) params.set('access', query.access);
    if (query.universityId) params.set('universityId', query.universityId);
    if (query.stream) params.set('stream', query.stream);
    if (query.q && query.q.trim()) params.set('q', query.q.trim());
    if (query.page) params.set('page', String(query.page));

    const qs = params.toString();
    const url = `/identity/students${qs ? `?${qs}` : ''}`;
    const result = await httpClient.get<StudentListResult>(url);
    return studentListResultSchema.parse(result);
  },

  async get(id) {
    const result = await httpClient.get<StudentDetail>(`/identity/students/${encodeURIComponent(id)}`);
    return studentDetailSchema.parse(result);
  },

  async getOptions() {
    return httpClient.get<StudentOptions>('/identity/students/options');
  },

  async create(input) {
    const parsed = createStudentSchema.parse(input);
    const result = await httpClient.post<StudentDetail>('/identity/students', parsed);
    return studentDetailSchema.parse(result);
  },

  async suspend(id, input) {
    const parsed = studentActionSchema.parse(input);
    const result = await httpClient.post<StudentDetail>(
      `/identity/students/${encodeURIComponent(id)}/suspend`,
      parsed,
    );
    return studentDetailSchema.parse(result);
  },

  async reactivate(id, input) {
    const parsed = studentActionSchema.parse(input);
    const result = await httpClient.post<StudentDetail>(
      `/identity/students/${encodeURIComponent(id)}/reactivate`,
      parsed,
    );
    return studentDetailSchema.parse(result);
  },

  async revokeDevice(id, input) {
    const parsed = studentActionSchema.parse(input);
    const result = await httpClient.post<StudentDetail>(
      `/identity/students/${encodeURIComponent(id)}/revoke-device`,
      parsed,
    );
    return studentDetailSchema.parse(result);
  },

  async grantAccess(id, input) {
    const parsed = grantAccessSchema.parse(input);
    const result = await httpClient.post<StudentDetail>(
      `/identity/students/${encodeURIComponent(id)}/grant-access`,
      parsed,
    );
    return studentDetailSchema.parse(result);
  },
};

export const studentsApi: StudentsApi = realStudentsApi;
