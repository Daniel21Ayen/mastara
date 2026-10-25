// apps/admin-web/src/modules/audit/api/audit.api.ts
import type { AuditEntry } from '@mastara/contracts';
import { auditEntrySchema } from '@mastara/contracts';
import { httpClient } from '@/core/network';

export interface AuditFilterParams {
  actor?: 'ALL' | 'ADMIN' | 'STUDENT' | 'SYSTEM';
  actionGroup?: 'ALL' | 'PAYMENTS' | 'SECURITY' | 'CONTENT' | 'COMMERCE' | 'STUDENT';
  query?: string;
  range?: 'ALL' | 'TODAY' | 'WEEK' | 'MONTH';
}

/**
 * Fetches audit log records directly from the real platform audit API.
 */
export async function fetchAuditLogs(filters: AuditFilterParams = {}): Promise<AuditEntry[]> {
  const params = new URLSearchParams();
  if (filters.actor && filters.actor !== 'ALL') params.set('actor', filters.actor);
  if (filters.actionGroup && filters.actionGroup !== 'ALL') params.set('actionGroup', filters.actionGroup);
  if (filters.range && filters.range !== 'ALL') params.set('range', filters.range);
  if (filters.query?.trim()) params.set('query', filters.query.trim());

  const qs = params.toString();
  const url = `/platform/admin/audit${qs ? `?${qs}` : ''}`;
  const data = await httpClient.get<AuditEntry[]>(url);
  return (data ?? []).map((entry) => auditEntrySchema.parse(entry));
}

/**
 * Fetches recent attention-required audit entries for quick alerts and drawer panels.
 */
export async function fetchAttentionAuditLogs(limit = 8): Promise<AuditEntry[]> {
  const data = await httpClient.get<AuditEntry[]>('/platform/admin/audit/attention');
  return (data ?? []).map((entry) => auditEntrySchema.parse(entry)).slice(0, limit);
}
