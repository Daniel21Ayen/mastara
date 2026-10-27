// apps/mobile/src/modules/profile/api/academic.api.ts
import type { Program, Semester, University } from '@mastara/contracts';

import { cacheReads } from '@/core/db';
import { httpClient, isApiBreakerOpen, isOnline } from '@/core/network';

// Bundled catalog: generated from packages/database/data/curriculum.json by scripts/generate-seed-catalog.mjs.
// Its ids are the same ones the server uses, so it works for onboarding with no network (SRS 6.2, 6.4).
import seedCatalog from '../../../../assets/seedCatalog.json';

export interface AcademicApi {
  getUniversities(): Promise<University[]>;
  getPrograms(universityId: string): Promise<Program[]>;
  getSemesters(programId: string): Promise<Semester[]>;
}

/** Student-facing screens must never wait on a slow or missing server for lists that are also bundled. */
const FAST_READ = { timeoutMs: 4000, retries: 0 } as const;

const seedUniversities = (): University[] =>
  seedCatalog.metadata.universities.map((u) => ({ id: u.id, name: u.nameEn, nameAm: u.nameAm, shortName: u.code }));

const seedPrograms = (universityId: string): Program[] =>
  seedCatalog.metadata.programs
    .filter((p) => p.universityId === universityId)
    .map((p) => ({ id: p.id, universityId: p.universityId, name: p.nameEn, nameAm: p.nameAm }));

const seedSemesters = (programId: string): Semester[] =>
  seedCatalog.metadata.semesters
    .filter((s) => s.programId === programId)
    .map((s) => ({ id: s.id, programId: s.programId, number: s.number === 2 ? 2 : 1 }));

/** True when a request would only waste the student's time: no connection, or the server just failed to answer. */
const serverUnavailable = (): boolean => !isOnline() || isApiBreakerOpen();

export const realAcademicApi: AcademicApi = {
  async getUniversities() {
    if (serverUnavailable()) return seedUniversities();
    try {
      const list = await httpClient.get<Array<{ id: string; name: string; shortName: string; nameAm?: string }>>(
        '/catalog/universities',
        FAST_READ,
      );
      if (!list || list.length === 0) return seedUniversities();
      return list.map((u) => ({ id: u.id, name: u.name, nameAm: u.nameAm, shortName: u.shortName }));
    } catch {
      return seedUniversities();
    }
  },

  async getPrograms(universityId) {
    if (serverUnavailable()) return seedPrograms(universityId);
    try {
      const list = await httpClient.get<Array<{ id: string; universityId: string; name: string; nameAm?: string }>>(
        `/catalog/universities/${encodeURIComponent(universityId)}/programs`,
        FAST_READ,
      );
      if (!list || list.length === 0) return seedPrograms(universityId);
      return list.map((p) => ({ id: p.id, universityId: p.universityId, name: p.name, nameAm: p.nameAm }));
    } catch {
      return seedPrograms(universityId);
    }
  },

  async getSemesters(programId) {
    if (serverUnavailable()) return seedSemesters(programId);
    try {
      const list = await httpClient.get<Array<{ id: string; programId: string; number: number }>>(
        `/catalog/programs/${encodeURIComponent(programId)}/semesters`,
        FAST_READ,
      );
      if (!list || list.length === 0) return seedSemesters(programId);
      return list.map((s) => ({ id: s.id, programId: s.programId, number: s.number === 2 ? 2 : 1 }));
    } catch {
      return seedSemesters(programId);
    }
  },
};

/**
 * Reads are saved in SQLite api_cache and used when offline; writes always need the server.
 * The "v2" prefix retires answers saved by earlier builds, which could contain the old placeholder ids.
 */
export const academicApi = cacheReads('academic.v2', realAcademicApi, ['getUniversities', 'getPrograms', 'getSemesters']);
