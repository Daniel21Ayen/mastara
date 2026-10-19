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
import { z } from 'zod';

import { env } from '@/core/config/env';
import { httpClient } from '@/core/network';
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

export const realScansApi: ScansApi = {
  async listScans(query: ScanListQuery): Promise<ScanListResult> {
    const params = new URLSearchParams();
    if (query.kind) params.set('kind', query.kind);
    if (query.q) params.set('q', query.q);
    if (query.page) params.set('page', String(query.page));
    const qs = params.toString();
    const url = `/content/admin/scans${qs ? `?${qs}` : ''}`;
    const raw = await httpClient.get<ScanListResult>(url);
    return scanListResultSchema.parse(raw);
  },

  async getScan(id: string): Promise<AdminScan> {
    const raw = await httpClient.get<AdminScan>(`/content/admin/scans/${id}`);
    return adminScanSchema.parse(raw);
  },

  async listCourses(
    programId: string,
    semesterNumber: 1 | 2,
    stream: Stream,
  ): Promise<ScanCourseOption[]> {
    const params = new URLSearchParams({
      programId,
      semesterNumber: String(semesterNumber),
      stream,
    });
    const raw = await httpClient.get<ScanCourseOption[]>(
      `/content/admin/scans/courses?${params.toString()}`,
    );
    return z.array(scanCourseOptionSchema).parse(raw);
  },

  async createScan(input: ScanInput): Promise<AdminScan> {
    const payload = scanInputSchema.parse(input);
    const raw = await httpClient.post<AdminScan>('/content/admin/scans', payload);
    return adminScanSchema.parse(raw);
  },
};

function createScansApi(): ScansApi {
  if (env.useMocks) return mockScansApi;
  return realScansApi;
}

export const scansApi = createScansApi();
