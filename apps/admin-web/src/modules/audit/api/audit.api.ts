// apps/admin-web/src/modules/audit/api/audit.api.ts
import type { AuditEntry } from '@mastara/contracts';
import { auditEntrySchema } from '@mastara/contracts';
import { ATTENTION_AUDIT_ACTIONS, type AuditAction } from '@mastara/domain';
import { listAudit } from '@/core/mock/data';
import { env } from '@/core/config/env';
import { httpClient } from '@/core/network';

export interface AuditFilterParams {
  actor?: 'ALL' | 'ADMIN' | 'STUDENT' | 'SYSTEM';
  actionGroup?: 'ALL' | 'PAYMENTS' | 'SECURITY' | 'CONTENT' | 'COMMERCE' | 'STUDENT';
  query?: string;
  range?: 'ALL' | 'TODAY' | 'WEEK' | 'MONTH';
}

function matchesActionGroup(action: string, group?: string): boolean {
  if (!group || group === 'ALL') return true;
  switch (group) {
    case 'PAYMENTS':
      return action.startsWith('PAYMENT_');
    case 'SECURITY':
      return action.includes('DEVICE_') || action.includes('SUSPENDED') || action.includes('REACTIVATED');
    case 'CONTENT':
      return action.includes('CONTENT_') || action.includes('EXAM_') || action.includes('QUESTION_') || action.includes('SCAN_');
    case 'COMMERCE':
      return action.includes('PRICE_') || action.includes('ACCESS_');
    case 'STUDENT':
      return action.startsWith('STUDENT_');
    default:
      return true;
  }
}

function matchesRange(dateIso: string, range?: string): boolean {
  if (!range || range === 'ALL') return true;
  const time = Date.parse(dateIso);
  const now = Date.now();
  const diffHours = (now - time) / (1000 * 60 * 60);

  if (range === 'TODAY') return diffHours <= 24;
  if (range === 'WEEK') return diffHours <= 24 * 7;
  if (range === 'MONTH') return diffHours <= 24 * 30;
  return true;
}

function filterMockAuditLogs(filters: AuditFilterParams): AuditEntry[] {
  const all = listAudit();
  const q = (filters.query ?? '').toLowerCase().trim();

  return all.filter((entry) => {
    if (filters.actor && filters.actor !== 'ALL' && entry.actor !== filters.actor) {
      return false;
    }
    if (!matchesActionGroup(entry.action, filters.actionGroup)) {
      return false;
    }
    if (!matchesRange(entry.at, filters.range)) {
      return false;
    }
    if (q) {
      const matchAction = entry.action.toLowerCase().includes(q);
      const matchTarget = entry.target.toLowerCase().includes(q);
      const matchReason = entry.reason?.toLowerCase().includes(q) ?? false;
      const matchActor = entry.actor.toLowerCase().includes(q);
      if (!matchAction && !matchTarget && !matchReason && !matchActor) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Fetches audit log records, prioritizing live attention-filtered logs from API
 * with mock fallback in offline or mock test modes.
 */
export async function fetchAuditLogs(filters: AuditFilterParams = {}): Promise<AuditEntry[]> {
  if (!env.useMocks) {
    try {
      const params = new URLSearchParams();
      if (filters.actor && filters.actor !== 'ALL') params.set('actor', filters.actor);
      if (filters.actionGroup && filters.actionGroup !== 'ALL') params.set('actionGroup', filters.actionGroup);
      if (filters.range && filters.range !== 'ALL') params.set('range', filters.range);
      if (filters.query?.trim()) params.set('query', filters.query.trim());

      const qs = params.toString();
      const url = `/platform/admin/audit${qs ? `?${qs}` : ''}`;
      const data = await httpClient.get<AuditEntry[]>(url);
      return data.map((entry) => auditEntrySchema.parse(entry));
    } catch {
      // Graceful fallback to mock data if network or server unavailable
    }
  }

  return filterMockAuditLogs(filters);
}

/**
 * Fetches recent attention-required audit entries for quick alerts and drawer panels.
 */
export async function fetchAttentionAuditLogs(limit = 8): Promise<AuditEntry[]> {
  if (!env.useMocks) {
    try {
      const data = await httpClient.get<AuditEntry[]>(`/platform/admin/audit/attention`);
      return data.map((entry) => auditEntrySchema.parse(entry)).slice(0, limit);
    } catch {
      // Graceful fallback
    }
  }

  return listAudit()
    .filter((e) => (ATTENTION_AUDIT_ACTIONS as readonly string[]).includes(e.action))
    .slice(0, limit);
}
