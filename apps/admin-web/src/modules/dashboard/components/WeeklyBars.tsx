// apps/admin-web/src/modules/dashboard/components/WeeklyBars.tsx
import { adminText } from '@/core/i18n';

import styles from './WeeklyBars.module.css';

interface DayCount {
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  count: number;
}

function weekdayShort(date: string): string {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'short' });
}

/** Seven bars scaled to the busiest day. The numbers are printed too, so colour and height are not the only signal. */
export function WeeklyBars({ days }: { days: readonly DayCount[] }) {
  const max = Math.max(1, ...days.map((day) => day.count));
  const summary = adminText('admin.dashboard.trend.summary', {
    values: days.map((day) => `${weekdayShort(day.date)} ${day.count}`).join(', '),
  });

  return (
    <div className={styles.chart} role="img" aria-label={summary}>
      {days.map((day) => (
        <div key={day.date} className={styles.column} aria-hidden="true">
          <span className={styles.value}>{day.count}</span>
          <div className={styles.track}>
            <div
              className={styles.bar}
              style={{ height: `${Math.round((day.count / max) * 100)}%` }}
            />
          </div>
          <span className={styles.day}>{weekdayShort(day.date)}</span>
        </div>
      ))}
    </div>
  );
}
