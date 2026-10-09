// packages/contracts/src/notification.ts
import { NOTIFICATION_KINDS } from '@mastara/domain';
import { z } from 'zod';

/** Language-neutral: the app turns `kind` and `params` into text in the student's language. */
export const notificationSchema = z.object({
  id: z.string(),
  kind: z.enum(NOTIFICATION_KINDS),
  params: z.record(z.union([z.string(), z.number()])),
  /** ISO date-time. */
  createdAt: z.string(),
  read: z.boolean(),
});

export type AppNotification = z.infer<typeof notificationSchema>;
