// apps/admin-web/src/core/mock/data/audit.ts
import type { AuditEntry } from '@mastara/contracts';

/**
 * In-memory "server" audit log shared by every mock admin API. Later phases call `recordAudit`
 * when an admin approves a payment, revokes a device and so on, so the dashboard and the Audit Log
 * page show the same history. Replaced by the real audit module in backend phase B6.
 */

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

type Seed = Omit<AuditEntry, 'id' | 'at'> & { agoMs: number };

const SEEDS: readonly Seed[] = [
  {
    agoMs: 2 * MINUTE_MS,
    actor: 'ADMIN',
    action: 'PAYMENT_APPROVED',
    target: 'Semester Bundle · Selam Getachew',
  },
  {
    agoMs: 12 * MINUTE_MS,
    actor: 'STUDENT',
    action: 'DEVICE_RELEASED_BY_STUDENT',
    target: 'Student ST003',
  },
  { agoMs: HOUR_MS, actor: 'ADMIN', action: 'EXAM_PUBLISHED', target: 'Mid · AASTU' },
  {
    agoMs: 3 * HOUR_MS,
    actor: 'ADMIN',
    action: 'DEVICE_REVOKED',
    target: 'Student ST003',
    reason: 'Phone lost',
  },
  {
    agoMs: 5 * HOUR_MS,
    actor: 'ADMIN',
    action: 'PRICE_CHANGED',
    target: 'Semester Bundle',
    reason: 'Seasonal pricing',
  },
  { agoMs: DAY_MS, actor: 'ADMIN', action: 'CONTENT_PUBLISHED', target: 'English · Grammar v3' },
  {
    agoMs: 2 * DAY_MS,
    actor: 'ADMIN',
    action: 'ACCESS_EXTENDED',
    target: 'Student ST004 · Calculus I',
    reason: 'Receipt issue',
  },
];

let counter = 0;
const entries: AuditEntry[] = SEEDS.map((seed): AuditEntry => {
  counter += 1;
  const { agoMs, ...rest } = seed;
  return { ...rest, id: `audit-${counter}`, at: new Date(Date.now() - agoMs).toISOString() };
});

/** Newest first. */
export function listAudit(): AuditEntry[] {
  return [...entries].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

export function recordAudit(entry: Omit<AuditEntry, 'id' | 'at'>, now = Date.now()): AuditEntry {
  counter += 1;
  const created: AuditEntry = { ...entry, id: `audit-${counter}`, at: new Date(now).toISOString() };
  entries.push(created);
  return created;
}
