// apps/admin-web/src/core/mock/data/dashboard.ts
import type { DashboardSummary } from '@mastara/contracts';
import { DASHBOARD_RECENT_LIMIT, DASHBOARD_TREND_DAYS } from '@mastara/domain';

import { listAudit } from './audit';
import { paymentStats } from './paymentsAdmin';
import { studentStats } from './students';

/**
 * Dashboard numbers. Students, entitlements and expiries are computed from the Students mock (F11b) and the pending payments from the Payments mock (F11g).
 * The rest are fixed samples until their phases exist: scan jobs (F11e), drafts (F11d).
 */
const SAMPLE = {
  scanJobsFailed: 1,
  contentInDraft: 7,
  newStudentsPerDay: [22, 31, 27, 44, 36, 61, 52],
} as const;

function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function buildDashboardSummary(now = new Date()): DashboardSummary {
  const newStudents = SAMPLE.newStudentsPerDay
    .slice(-DASHBOARD_TREND_DAYS)
    .map((count, index, all) => {
      const day = new Date(now);
      day.setDate(now.getDate() - (all.length - 1 - index));
      return { date: isoDay(day), count };
    });

  const stats = studentStats(now.getTime());
  const payments = paymentStats();

  return {
    activeStudents: stats.activeStudents,
    pendingPayments: payments.pending,
    activeEntitlements: stats.activeEntitlements,
    expiringSoon: stats.expiringSoon,
    newStudents,
    attention: {
      paymentsWaiting: payments.pending,
      duplicateReferences: payments.duplicateReferences,
      scanJobsFailed: SAMPLE.scanJobsFailed,
      contentInDraft: SAMPLE.contentInDraft,
    },
    recentActivity: listAudit().slice(0, DASHBOARD_RECENT_LIMIT),
  };
}
