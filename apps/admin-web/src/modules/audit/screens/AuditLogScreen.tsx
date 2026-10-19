// apps/admin-web/src/modules/audit/screens/AuditLogScreen.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { AuditEntry } from '@mastara/contracts';

import { PageHeader, Icon, Modal } from '@/shared/ui';
import { fetchAuditLogs, type AuditFilterParams } from '../api/audit.api';
import styles from '../components/AuditLog.module.css';

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - Date.parse(isoString);
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatReadableAction(action: string): string {
  return action
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function AuditLogScreen() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  // Filters
  const [query, setQuery] = useState('');
  const [actor, setActor] = useState<AuditFilterParams['actor']>('ALL');
  const [actionGroup, setActionGroup] = useState<AuditFilterParams['actionGroup']>('ALL');
  const [range, setRange] = useState<AuditFilterParams['range']>('ALL');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchAuditLogs({ query, actor, actionGroup, range })
      .then((data) => {
        if (mounted) {
          setLogs(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [query, actor, actionGroup, range]);

  // Overall statistics from current audit trail
  const stats = useMemo(() => {
    const total = logs.length;
    const adminCount = logs.filter((l) => l.actor === 'ADMIN').length;
    const securityCount = logs.filter(
      (l) => l.action.includes('DEVICE_') || l.action.includes('SUSPENDED') || l.action.includes('REACTIVATED'),
    ).length;
    const paymentsCount = logs.filter((l) => l.action.startsWith('PAYMENT_')).length;

    return { total, adminCount, securityCount, paymentsCount };
  }, [logs]);

  const handleExportCsv = () => {
    if (logs.length === 0) return;
    const headers = ['ID', 'Timestamp', 'Actor', 'Action', 'Target', 'Reason'];
    const rows = logs.map((l) => [
      l.id,
      l.at,
      l.actor,
      l.action,
      `"${(l.target ?? '').replace(/"/g, '""')}"`,
      `"${(l.reason ?? '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `mastara-audit-log-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.container}>
      <PageHeader
        title="System Audit Trail"
        subtitle="Complete chronological log of administrative overrides, security actions, and commerce changes."
        actions={
          <button type="button" className={styles.exportBtn} onClick={handleExportCsv} title="Export CSV Report">
            <Icon name="upload" size={16} />
            <span>Export CSV</span>
          </button>
        }
      />

      {/* Metrics Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Total Logged Events</span>
            <span className={styles.statIcon}><Icon name="fileText" size={18} /></span>
          </div>
          <span className={styles.statValue}>{stats.total}</span>
          <span className={styles.statSubtext}>Recorded across portal sessions</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Admin Overrides</span>
            <span className={styles.statIcon}><Icon name="shieldCheck" size={18} /></span>
          </div>
          <span className={styles.statValue}>{stats.adminCount}</span>
          <span className={styles.statSubtext}>Actions initiated by staff</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Security Interventions</span>
            <span className={styles.statIcon}><Icon name="shield" size={18} /></span>
          </div>
          <span className={styles.statValue}>{stats.securityCount}</span>
          <span className={styles.statSubtext}>Device releases & access updates</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Payment Decisions</span>
            <span className={styles.statIcon}><Icon name="creditCard" size={18} /></span>
          </div>
          <span className={styles.statValue}>{stats.paymentsCount}</span>
          <span className={styles.statSubtext}>Approvals and rejections</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={styles.filterCard}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>
            <Icon name="search" size={16} />
          </span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search target, actor, action or reason..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className={styles.filterRow}>
          <select
            className={styles.select}
            value={actor}
            onChange={(e) => setActor(e.target.value as AuditFilterParams['actor'])}
          >
            <option value="ALL">All Actors</option>
            <option value="ADMIN">Admin Staff</option>
            <option value="STUDENT">Student</option>
            <option value="SYSTEM">System Automations</option>
          </select>

          <select
            className={styles.select}
            value={actionGroup}
            onChange={(e) => setActionGroup(e.target.value as AuditFilterParams['actionGroup'])}
          >
            <option value="ALL">All Action Categories</option>
            <option value="PAYMENTS">Payments & Orders</option>
            <option value="SECURITY">Security & Devices</option>
            <option value="CONTENT">Content & Exams</option>
            <option value="COMMERCE">Pricing & Access</option>
            <option value="STUDENT">Student Profiles</option>
          </select>

          <select
            className={styles.select}
            value={range}
            onChange={(e) => setRange(e.target.value as AuditFilterParams['range'])}
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Last 24 Hours</option>
            <option value="WEEK">Last 7 Days</option>
            <option value="MONTH">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target Resource</th>
                <th>Reason / Context</th>
                <th style={{ textAlign: 'right' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>
                    <div className={styles.emptyTitle}>No matching audit entries found</div>
                    <div>Try adjusting your filter criteria or search query.</div>
                  </td>
                </tr>
              ) : (
                logs.map((entry) => {
                  const actorClass =
                    entry.actor === 'ADMIN'
                      ? styles.actorAdmin
                      : entry.actor === 'STUDENT'
                      ? styles.actorStudent
                      : styles.actorSystem;

                  return (
                    <tr key={entry.id}>
                      <td>
                        <div className={styles.timeCol}>
                          <span className={styles.timeRelative}>{formatRelativeTime(entry.at)}</span>
                          <span className={styles.timeIso}>{new Date(entry.at).toLocaleString()}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.actorBadge} ${actorClass}`}>
                          {entry.actor}
                        </span>
                      </td>
                      <td>
                        <span className={styles.actionText}>
                          {formatReadableAction(entry.action)}
                        </span>
                      </td>
                      <td>
                        <span className={styles.targetText}>{entry.target}</span>
                      </td>
                      <td>
                        <span className={styles.reasonText}>
                          {entry.reason ? `"${entry.reason}"` : '—'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className={styles.viewDetailBtn}
                          onClick={() => setSelectedEntry(entry)}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspection Modal */}
      {selectedEntry && (
        <Modal
          title={`Audit Record: ${selectedEntry.id}`}
          onClose={() => setSelectedEntry(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', fontSize: '14px' }}>
              <strong>Timestamp:</strong>
              <span>{new Date(selectedEntry.at).toISOString()} ({formatRelativeTime(selectedEntry.at)})</span>

              <strong>Actor:</strong>
              <span>{selectedEntry.actor}</span>

              <strong>Action:</strong>
              <span>{selectedEntry.action}</span>

              <strong>Target:</strong>
              <span>{selectedEntry.target}</span>

              <strong>Reason:</strong>
              <span>{selectedEntry.reason ?? 'None provided'}</span>
            </div>

            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px', color: '#64748b' }}>
                RAW AUDIT RECORD PAYLOAD
              </div>
              <pre className={styles.jsonBox}>
                {JSON.stringify(selectedEntry, null, 2)}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
