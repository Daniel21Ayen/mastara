// apps/admin-web/src/modules/scans/api/scans.api.ts
import {
  adminScanSchema,
  scanCourseOptionSchema,
  scanInputSchema,
  scanListResultSchema,
} from '@mastara/contracts';
import type {
  AdminScan,
  ScanCourseOption,
  ScanInput,
  ScanListQuery,
  ScanListResult,
} from '@mastara/contracts';
import type { Stream } from '@mastara/domain';

import { env } from '@/core/config/env';
import { createScan, getScan, listScanCourses, listScans, recordAudit } from '@/core/mock/data';
import { simulateLatency } from '@/core/mock/delay';

/**
 * A scan joins its pages into one PDF and carries the details that say where it belongs. Adding one is
 * recorded in the audit log. Courses are offered only for a matching program, semester and stream.
 */
export interface ScansApi {
  listScans(query: ScanListQuery): Promise<ScanListResult>;
  getScan(id: string): Promise<AdminScan>;
  listCourses(
    programId: string,
    semesterNumber: 1 | 2,
    stream: Stream,
  ): Promise<ScanCourseOption[]>;
  createScan(input: ScanInput): Promise<AdminScan>;
}

const KIND_TEXT = { COC: 'COC', EXAM: 'Exam', MATERIAL: 'Material', QUIZ: 'Quiz' } as const;

const mockScansApi: ScansApi = {
  async listScans(query) {
    await simulateLatency();
    return scanListResultSchema.parse(listScans(query));
  },

  async getScan(id) {
    await simulateLatency(100);
    return adminScanSchema.parse(getScan(id));
  },

  async listCourses(programId, semesterNumber, stream) {
    await simulateLatency(100);
    return listScanCourses(programId, semesterNumber, stream).map((item) =>
      scanCourseOptionSchema.parse(item),
    );
  },

  async createScan(input) {
    await simulateLatency();
    const scan = createScan(scanInputSchema.parse(input));
    recordAudit({
      actor: 'ADMIN',
      action: 'SCAN_ADDED',
      target: `${KIND_TEXT[scan.kind]} scan ${scan.id} · ${scan.courseCode ?? scan.universityShortName}`,
    });
    return adminScanSchema.parse(scan);
  },
};

function createScansApi(): ScansApi {
  if (env.useMocks) return mockScansApi;
  throw new Error('The real scans API is added in the backend integration phase.');
}

export const scansApi = createScansApi();
