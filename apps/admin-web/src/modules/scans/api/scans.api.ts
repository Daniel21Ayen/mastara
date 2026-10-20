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

export interface PresignedUrlItem {
  name: string;
  key: string;
  uploadUrl: string;
  publicUrl?: string;
}

export interface ScanJobStatusResult {
  id: string;
  title: string;
  status: 'DRAFT' | 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
  error_message?: string | null;
  output_asset_id?: string | null;
  metadata?: any;
}

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
  getPresignedUploadUrls(files: Array<{ name: string; mime: string; sizeBytes: number }>): Promise<PresignedUrlItem[]>;
  uploadFileToPresignedUrl(uploadUrl: string, fileData: Blob | ArrayBuffer, mime: string): Promise<void>;
  checkJobStatus(id: string): Promise<ScanJobStatusResult>;
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

  async getPresignedUploadUrls(files) {
    await simulateLatency(80);
    const ts = Date.now();
    return files.map((f, i) => ({
      name: f.name,
      key: `scans/staging/${ts}-${i}-${f.name}`,
      uploadUrl: `mock-presigned-upload-url-for-${encodeURIComponent(f.name)}`,
      publicUrl: `https://storage.mastara.demo/scans/${f.name}`,
    }));
  },

  async uploadFileToPresignedUrl() {
    await simulateLatency(100);
  },

  async checkJobStatus(id) {
    await simulateLatency(50);
    return {
      id,
      title: 'Scanned document',
      status: 'SUCCEEDED',
      output_asset_id: `asset-${id}`,
    };
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

  async getPresignedUploadUrls(files: Array<{ name: string; mime: string; sizeBytes: number }>): Promise<PresignedUrlItem[]> {
    const res = await httpClient.post<{ urls: PresignedUrlItem[] }>(
      '/content/admin/scans/upload-urls',
      { files },
    );
    return res.urls;
  },

  async uploadFileToPresignedUrl(uploadUrl: string, fileData: Blob | ArrayBuffer, mime: string): Promise<void> {
    const isMock = uploadUrl.startsWith('mock-');
    if (isMock) {
      await simulateLatency(50);
      return;
    }

    // Direct PUT to S3 / MinIO presigned URL or local storage endpoint
    await fetch(uploadUrl, {
      method: uploadUrl.includes('storage-upload') ? 'PUT' : 'PUT',
      headers: {
        'Content-Type': mime || 'application/octet-stream',
      },
      body: fileData as BodyInit,
    });
  },

  async checkJobStatus(id: string): Promise<ScanJobStatusResult> {
    return httpClient.get<ScanJobStatusResult>(`/content/admin/scans/${id}/status`);
  },
};

function createScansApi(): ScansApi {
  if (env.useMocks) return mockScansApi;
  return realScansApi;
}

export const scansApi = createScansApi();
