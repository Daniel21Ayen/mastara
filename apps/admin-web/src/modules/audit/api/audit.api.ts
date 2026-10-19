// apps/admin-web/src/modules/audit/api/audit.api.ts
import type { AuditEntry } from '@mastara/contracts';
import { listAudit } from '@/core/mock/data';

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

export async function fetchAuditLogs(filters: AuditFilterParams = {}): Promise<AuditEntry[]> {
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
