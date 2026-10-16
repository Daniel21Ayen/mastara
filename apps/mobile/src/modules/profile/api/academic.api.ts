// apps/mobile/src/modules/profile/api/academic.api.ts
import type { Program, Semester, University } from '@mastara/contracts';

import { env } from '@/core/config/env';
import { cacheReads } from '@/core/db';
import { programs, semesters, universities } from '@/core/mock/data';
import { simulateLatency } from '@/core/mock/delay';

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
    return programs.filter((program) => program.universityId === universityId);
  },
  async getSemesters(programId) {
    await simulateLatency();
    return semesters.filter((semester) => semester.programId === programId);
  },
};

function createAcademicApi(): AcademicApi {
  if (env.useMocks) return mockAcademicApi;
  throw new Error('The real academic API is added in the backend integration phase.');
}

/** Reads are saved on the phone and used when it is offline; writes always need the server. */
export const academicApi = cacheReads('academic', createAcademicApi(), ['getUniversities', 'getPrograms', 'getSemesters']);
