// packages/contracts/src/admin.ts
import { AUDIT_ACTIONS, AUDIT_ACTORS, DASHBOARD_TREND_DAYS } from '@mastara/domain';
import { z } from 'zod';

import { loginSchema } from './auth';

/** Admin sign-in uses the same email-or-phone and password rules as the student app. */
export const adminLoginSchema = loginSchema;

export const adminScopeSchema = z.object({
  id: z.string().optional(),
  universityId: z.string().nullable().optional(),
  programId: z.string().nullable().optional(),
  courseId: z.string().nullable().optional(),
});

export const adminUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  identifier: z.string(),
  /** Always ADMIN: the server decides the role, the client only displays it. */
  role: z.literal('ADMIN'),
  adminRole: z.enum(['SUPER_ADMIN', 'ACADEMIC_ADMIN', 'OPERATIONS_ADMIN']),
  permissions: z.array(z.string()),
  scopes: z.array(adminScopeSchema).optional(),
});

export const adminAuthResultSchema = z.object({
  user: adminUserSchema,
  token: z.string(),
});

/** One line of the audit log. Sensitive actions carry a reason. */
export const auditEntrySchema = z.object({
  id: z.string(),
  /** ISO date-time. */
  at: z.string(),
  actor: z.enum(AUDIT_ACTORS),
  action: z.enum(AUDIT_ACTIONS),
  /** What the action was done to, for example "Student ST003" or "Semester Bundle". */
  target: z.string(),
  reason: z.string().optional(),
});

export const dashboardSummarySchema = z.object({
  activeStudents: z.number().int().min(0),
  pendingPayments: z.number().int().min(0),
  activeEntitlements: z.number().int().min(0),
  /** Entitlements that end inside the renewal window. */
  expiringSoon: z.number().int().min(0),
  /** New students per day, oldest first. */
  newStudents: z
    .array(z.object({ date: z.string(), count: z.number().int().min(0) }))
    .length(DASHBOARD_TREND_DAYS),
  attention: z.object({
    paymentsWaiting: z.number().int().min(0),
    duplicateReferences: z.number().int().min(0),
    scanJobsFailed: z.number().int().min(0),
    contentInDraft: z.number().int().min(0),
  }),
  recentActivity: z.array(auditEntrySchema),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type AdminUser = z.infer<typeof adminUserSchema>;
export type AdminAuthResult = z.infer<typeof adminAuthResultSchema>;
export type AuditEntry = z.infer<typeof auditEntrySchema>;
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
