// apps/mobile/src/modules/profile/api/academic.api.ts
import type { Program, Semester, University } from '@mastara/contracts';

import { env } from '@/core/config/env';
import { cacheReads } from '@/core/db';
import { programs, semesters, universities } from '@/core/mock/data';
import { simulateLatency } from '@/core/mock/delay';
import { httpClient } from '@/core/network';

export interface AcademicApi {
  getUniversities(): Promise<University[]>;
  getPrograms(universityId: string): Promise<Program[]>;
  getSemesters(programId: string): Promise<Semester[]>;
}

const mockAcademicApi: AcademicApi = {
  async getUniversities() {
    await simulateLatency();
    return [...universities];
  },
  async getPrograms(universityId) {
    await simulateLatency();
    return [...programs.filter((p) => p.universityId === universityId)];
  },
  async getSemesters(programId) {
    await simulateLatency();
    return [...semesters.filter((s) => s.programId === programId)];
  },
};

export const realAcademicApi: AcademicApi = {
  async getUniversities() {
    try {
      const list = await httpClient.get<Array<{ id: string; name: string; shortName: string }>>('/catalog/universities');
      if (list && list.length > 0) {
        return list.map((u) => ({
          id: u.id,
          name: u.name,
          shortName: u.shortName,
        }));
      }
      return mockAcademicApi.getUniversities();
    } catch {
      return mockAcademicApi.getUniversities();
    }
  },
  async getPrograms(universityId) {
    try {
      const list = await httpClient.get<Array<{ id: string; universityId: string; name: string }>>(
        `/catalog/universities/${universityId}/programs`,
      );
      if (list && list.length > 0) {
        return list.map((p) => ({
          id: p.id,
          universityId: p.universityId,
          name: p.name,
        }));
      }
      return mockAcademicApi.getPrograms(universityId);
    } catch {
      return mockAcademicApi.getPrograms(universityId);
    }
  },
  async getSemesters(programId) {
    try {
      const list = await httpClient.get<Array<{ id: string; programId: string; number: number }>>(
        `/catalog/programs/${programId}/semesters`,
      );
      if (list && list.length > 0) {
        return list.map((s) => ({
          id: s.id,
          programId: s.programId,
          number: s.number === 2 ? 2 : 1,
        }));
      }
      return mockAcademicApi.getSemesters(programId);
    } catch {
      return mockAcademicApi.getSemesters(programId);
    }
  },
};

const baseApi: AcademicApi = env.useMocks ? mockAcademicApi : realAcademicApi;

/** Reads are saved on the phone and used when it is offline; writes always need the server. */
export const academicApi = cacheReads('academic', baseApi, ['getUniversities', 'getPrograms', 'getSemesters']);
