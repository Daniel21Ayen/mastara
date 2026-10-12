// apps/mobile/src/modules/profile/api/academic.api.ts
import type { Program, Semester, University } from '@mastara/contracts';

import { cacheReads } from '@/core/db';
import { httpClient } from '@/core/network';

export interface AcademicApi {
  getUniversities(): Promise<University[]>;
  getPrograms(universityId: string): Promise<Program[]>;
  getSemesters(programId: string): Promise<Semester[]>;
}

const realAcademicApi: AcademicApi = {
  async getUniversities() {
    return httpClient.get<University[]>('/catalog/universities');
  },
  async getPrograms(universityId) {
    return httpClient.get<Program[]>(`/catalog/universities/${universityId}/programs`);
  },
  async getSemesters(programId) {
    return httpClient.get<Semester[]>(`/catalog/programs/${programId}/semesters`);
  },
};

/** Reads are saved on the phone and used when it is offline; writes always need the server. */
export const academicApi = cacheReads('academic', realAcademicApi, [
  'getUniversities',
  'getPrograms',
  'getSemesters',
]);
