// apps/admin-web/src/modules/dashboard/screens/DashboardScreen.tsx
'use client';

import { RENEWAL_WINDOW_DAYS } from '@mastara/domain';
import Link from 'next/link';

import { adminText } from '@/core/i18n';
import { Button, Card, CardTitle, PageHeader, StateMessage } from '@/shared/ui';

import { ActivityList } from '../components/ActivityList';
import { AttentionList } from '../components/AttentionList';
import { StatCard } from '../components/StatCard';
import { WeeklyBars } from '../components/WeeklyBars';
import { useDashboard } from '../hooks/useDashboard';

import styles from './DashboardScreen.module.css';

export function DashboardScreen() {
  const { data, error, loading, reload } = useDashboard();

  return (
    <>
      <PageHeader title={adminText('admin.dashboard.title')} />

      {error ? (
        <StateMessage tone="alert">
          <span>{adminText('admin.dashboard.error')}</span>
          <Button variant="outline" onClick={reload}>
            {adminText('admin.common.retry')}
          </Button>
        </StateMessage>
      ) : null}

      {loading && !data ? <StateMessage>{adminText('admin.common.loading')}</StateMessage> : null}

      {data ? (
        <div className={styles.page}>
          <div className={styles.stats}>
            <StatCard
              label={adminText('admin.dashboard.stat.activeStudents')}
              value={data.activeStudents}
            />
            <StatCard
              label={adminText('admin.dashboard.stat.pendingPayments')}
              value={data.pendingPayments}
            />
            <StatCard
              label={adminText('admin.dashboard.stat.activeEntitlements')}
              value={data.activeEntitlements}
            />
            <StatCard
              label={adminText('admin.dashboard.stat.expiringSoon', { days: RENEWAL_WINDOW_DAYS })}
              value={data.expiringSoon}
            />
          </div>

          <div className={styles.columns}>
            <Card aria-labelledby="trend-title">
              <CardTitle id="trend-title">{adminText('admin.dashboard.trend.title')}</CardTitle>
              <WeeklyBars days={data.newStudents} />
            </Card>
            <Card aria-labelledby="attention-title">
              <CardTitle id="attention-title">
                {adminText('admin.dashboard.attention.title')}
              </CardTitle>
              <AttentionList attention={data.attention} />
            </Card>
          </div>

          <Card aria-labelledby="activity-title">
            <CardTitle id="activity-title">{adminText('admin.dashboard.activity.title')}</CardTitle>
            <ActivityList entries={data.recentActivity} />
            <Link href="/audit" className={styles.viewAll}>
              {adminText('admin.dashboard.activity.viewAudit')}
            </Link>
          </Card>
        </div>
      ) : null}
    </>
  );
}
