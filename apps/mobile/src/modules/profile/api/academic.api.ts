// apps/mobile/src/modules/profile/api/academic.api.ts
import type { Program, Semester, University } from '@mastara/contracts';

import { cacheReads } from '@/core/db';
import { httpClient } from '@/core/network';

export interface AcademicApi {
  getUniversities(): Promise<University[]>;
  getPrograms(universityId: string): Promise<Program[]>;
  getSemesters(programId: string): Promise<Semester[]>;
}

// Fallback seed metadata for offline zero-network onboarding (SRS 6.2, 6.4)
import seedCatalog from '../../../../assets/seedCatalog.json';

export const realAcademicApi: AcademicApi = {
  async getUniversities() {
    try {
      const list = await httpClient.get<Array<{ id: string; name: string; shortName: string }>>('/catalog/universities');
      return (list ?? []).map((u) => ({
        id: u.id,
        name: u.name,
        shortName: u.shortName,
      }));
    } catch {
      return (seedCatalog.metadata?.universities ?? []).map((u: any) => ({
        id: u.id,
        name: u.name,
        shortName: u.code,
      }));
    }
  },
  async getPrograms(universityId) {
    try {
      const list = await httpClient.get<Array<{ id: string; universityId: string; name: string }>>(
        `/catalog/universities/${encodeURIComponent(universityId)}/programs`,
      );
      return (list ?? []).map((p) => ({
        id: p.id,
        universityId: p.universityId,
        name: p.name,
      }));
    } catch {
      return (seedCatalog.metadata?.programs ?? []).map((p: any) => ({
        id: p.id,
        universityId,
        name: p.name,
      }));
    }
  },
  async getSemesters(programId) {
    try {
      const list = await httpClient.get<Array<{ id: string; programId: string; number: number }>>(
        `/catalog/programs/${encodeURIComponent(programId)}/semesters`,
      );
      return (list ?? []).map((s) => ({
        id: s.id,
        programId: s.programId,
        number: s.number === 2 ? 2 : 1,
      }));
    } catch {
      return (seedCatalog.metadata?.semesters ?? []).map((s: any, idx: number) => ({
        id: s.id,
        programId,
        number: (idx + 1 === 2 ? 2 : 1) as 1 | 2,
      }));
    }
  },
};

/** Reads are saved in SQLite api_cache and used when offline; writes always need the server. */
export const academicApi = cacheReads('academic', realAcademicApi, ['getUniversities', 'getPrograms', 'getSemesters']);
