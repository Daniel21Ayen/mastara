// apps/admin-web/src/modules/shell/components/AdminProfileModal.tsx
'use client';

import React, { useEffect, useState } from 'react';
import type { AdminUser, AuditEntry } from '@mastara/contracts';
import type { AuditAction } from '@mastara/domain';
import { ATTENTION_AUDIT_ACTIONS } from '@mastara/domain';
import { Icon } from '@/shared/ui';
import { listAudit } from '@/core/mock/data';
import { agoText } from '@/core/format';
import { fetchAttentionAuditLogs } from '@/modules/audit/api/audit.api';
import styles from './AdminProfileModal.module.css';

/** Actions that require admin attention — shown in the profile audit panel. */
const ATTENTION_ACTIONS = new Set<AuditAction>(ATTENTION_AUDIT_ACTIONS);

/** Colour chip per severity. */
function AttentionChip({ action }: { action: AuditAction }) {
  const danger = action === 'PAYMENT_REJECTED' || action === 'STUDENT_SUSPENDED';
  const warning = action === 'DEVICE_REVOKED';
  return (
    <span className={danger ? styles.chipDanger : warning ? styles.chipWarning : styles.chipInfo}>
      {danger ? '⚠ Critical' : warning ? '⚡ Security' : '● Info'}
    </span>
  );
}

/** Inline audit panel – only "needs attention" entries, newest first, max 8. */
function AuditAttentionPanel() {
  const [entries, setEntries] = useState<AuditEntry[]>(() => {
    return listAudit()
      .filter((e) => ATTENTION_ACTIONS.has(e.action as AuditAction))
      .slice(0, 8);
  });

  useEffect(() => {
    let mounted = true;
    fetchAttentionAuditLogs(8)
      .then((data) => {
        if (mounted && data) {
          setEntries(data);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const now = new Date();

  return (
    <div className={styles.section}>
      <div className={styles.auditHeader}>
        <h3 className={styles.sectionTitle}>Audit · Needs Attention</h3>
        {entries.length > 0 && (
          <span className={styles.auditBadge}>{entries.length}</span>
        )}
      </div>

      {entries.length === 0 ? (
        <div className={styles.auditEmpty}>
          <Icon name="check" size={15} />
          <span>No flagged actions — everything looks good.</span>
        </div>
      ) : (
        <ul className={styles.auditList}>
          {entries.map((entry) => (
            <li key={entry.id} className={styles.auditItem}>
              <div className={styles.auditLeft}>
                <AttentionChip action={entry.action as AuditAction} />
                <span className={styles.auditAction}>
                  {entry.action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                </span>
                <span className={styles.auditTarget}>{entry.target}</span>
              </div>
              <time className={styles.auditTime} dateTime={entry.at}>
                {agoText(entry.at, now)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface AdminProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser;
}

export function AdminProfileModal({ isOpen, onClose, user }: AdminProfileModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerTitleRow}>
            <div className={styles.avatarLarge}>
              <span>{user.name.slice(0, 2).toUpperCase()}</span>
            </div>
            <div>
              <h2 className={styles.name}>{user.name}</h2>
              <span className={styles.roleBadge}>System Administrator</span>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Account Details</h3>
            <div className={styles.grid}>
              <div className={styles.field}>
                <span className={styles.label}>Identifier / Email</span>
                <span className={styles.value}>{user.identifier}</span>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Admin ID</span>
                <span className={styles.value}>{user.id}</span>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Role Level</span>
                <span className={styles.value}>Full Root Admin (Level 1)</span>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Status</span>
                <span className={styles.statusActive}>● Active &amp; Verified</span>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Granted Permissions &amp; Access</h3>
            <div className={styles.permissionList}>
              <div className={styles.permissionItem}>
                <div className={styles.permIconCheck}>
                  <Icon name="check" size={14} />
                </div>
                <div>
                  <strong>Student Payments &amp; Birr Revenue</strong>
                  <p>Approve, reject, and reconcile Telebirr, CBE Mobile, and CBE Birr student payments.</p>
                </div>
              </div>

              <div className={styles.permissionItem}>
                <div className={styles.permIconCheck}>
                  <Icon name="check" size={14} />
                </div>
                <div>
                  <strong>Products &amp; Pricing Management</strong>
                  <p>Update semester bundle prices, freshman package rates, and trial access limits.</p>
                </div>
              </div>

              <div className={styles.permissionItem}>
                <div className={styles.permIconCheck}>
                  <Icon name="check" size={14} />
                </div>
                <div>
                  <strong>Content &amp; Question Bank Publishing</strong>
                  <p>Upload scans, manage OCR materials, create quizzes, and publish COC/mock exams.</p>
                </div>
              </div>

              <div className={styles.permissionItem}>
                <div className={styles.permIconCheck}>
                  <Icon name="check" size={14} />
                </div>
                <div>
                  <strong>Security &amp; Device Binding</strong>
                  <p>Revoke or release student devices and audit all system-wide actions.</p>
                </div>
              </div>
            </div>
          </div>

          <AuditAttentionPanel />
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.doneBtn} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
