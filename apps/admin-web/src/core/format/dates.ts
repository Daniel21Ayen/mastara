// apps/admin-web/src/core/format/dates.ts
import { timeAgo } from '@mastara/domain';

import { adminText } from '@/core/i18n';

/** Dates are stored in UTC and shown in Ethiopian local time (SRS: UTC and Addis Ababa display). */
const TIME_ZONE = 'Africa/Addis_Ababa';

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: TIME_ZONE,
});

/** "12 Mar 2026" */
export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

/** "5 min ago", "3 h ago", "2 days ago" or "Just now". */
export function agoText(iso: string, now: Date = new Date()): string {
  const ago = timeAgo(new Date(iso), now);
  switch (ago.unit) {
    case 'now':
      return adminText('admin.time.now');
    case 'minute':
      return adminText('admin.time.minutes', { n: ago.value });
    case 'hour':
      return adminText('admin.time.hours', { n: ago.value });
    case 'day':
      return adminText('admin.time.days', { n: ago.value });
  }
}
