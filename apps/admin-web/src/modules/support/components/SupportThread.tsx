// apps/admin-web/src/modules/support/components/SupportThread.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { AdminTicket } from '@mastara/contracts';
import { agoText, formatDate } from '@/core/format';
import { adminText } from '@/core/i18n';
import { Icon } from '@/shared/ui';
import { SupportReplyBox } from './SupportReplyBox';
import styles from './Support.module.css';

interface SupportThreadProps {
  ticket: AdminTicket | null;
  onSendReply: (text: string) => Promise<void>;
  onResolve: (id: string) => Promise<void>;
  onReopen: (id: string) => Promise<void>;
  busy?: boolean;
}

export function SupportThread({
  ticket,
  onSendReply,
  onResolve,
  onReopen,
  busy = false,
}: SupportThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const now = new Date();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages.length]);

  if (!ticket) {
    return (
      <div className={styles.threadPanel}>
        <div className={styles.threadPlaceholder}>
          <Icon name="headset" size={48} />
          <h3>{adminText('admin.support.title')}</h3>
          <p>{adminText('admin.support.selectPrompt')}</p>
        </div>
      </div>
    );
  }

  const initials = ticket.studentName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isResolved = ticket.status === 'RESOLVED';

  return (
    <div className={styles.threadPanel}>
      {/* Header */}
      <div className={styles.threadHeader}>
        <div className={styles.threadHeaderTop}>
          <div className={styles.threadTitleWrap}>
            <h3 className={styles.threadSubject}>{ticket.subject}</h3>
            <div className={styles.threadBadges}>
              {ticket.status === 'OPEN' && (
                <span className={styles.badgeOpen}>{adminText('admin.support.tab.open')}</span>
              )}
              {ticket.status === 'ANSWERED' && (
                <span className={styles.badgeAnswered}>{adminText('admin.support.tab.answered')}</span>
              )}
              {ticket.status === 'RESOLVED' && (
                <span className={styles.badgeResolved}>{adminText('admin.support.tab.resolved')}</span>
              )}

              <span className={styles.categoryTag}>
                {adminText(`admin.support.category.${ticket.category}` as any)}
              </span>
            </div>
          </div>

          <div className={styles.threadActions}>
            {!isResolved ? (
              <button
                type="button"
                className={styles.btnAction}
                onClick={() => onResolve(ticket.id)}
                disabled={busy}
              >
                <Icon name="check" size={14} />
                <span>{adminText('admin.support.markResolved')}</span>
              </button>
            ) : (
              <button
                type="button"
                className={styles.btnAction}
                onClick={() => onReopen(ticket.id)}
                disabled={busy}
              >
                <Icon name="clock" size={14} />
                <span>{adminText('admin.support.reopen')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Student Profile Strip */}
        <div className={styles.studentStrip}>
          <div className={styles.studentStripLeft}>
            <div className={styles.avatarLarge}>{initials}</div>
            <div className={styles.studentStripInfo}>
              <strong>{ticket.studentName}</strong>
              <span>
                {ticket.studentUniversity ?? 'University'} · {ticket.studentProgram ?? 'Program'}
              </span>
            </div>
          </div>

          <div className={styles.studentStripRight}>
            <span>📞 {ticket.studentIdentifier}</span>
            <span>🆔 {ticket.studentId}</span>
            <Link
              href={`/students/${ticket.studentId}`}
              className={styles.studentLink}
            >
              View Student Profile →
            </Link>
          </div>
        </div>
      </div>

      {/* Messages Thread */}
      <div className={styles.messagesArea}>
        {ticket.messages.map((msg) => {
          const isStudent = msg.from === 'STUDENT';

          return (
            <div
              key={msg.id}
              className={`${styles.messageRow} ${
                isStudent ? styles.messageStudent : styles.messageAdmin
              }`}
            >
              <div className={styles.messageHeader}>
                <span
                  className={`${styles.senderBadge} ${
                    isStudent ? styles.senderStudent : styles.senderAdmin
                  }`}
                >
                  {isStudent ? ticket.studentName : 'Mastara Admin'}
                </span>
                <span>{agoText(msg.createdAt, now)}</span>
              </div>

              <div
                className={`${styles.bubble} ${
                  isStudent ? styles.bubbleStudent : styles.bubbleAdmin
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Composer */}
      <SupportReplyBox onSendReply={onSendReply} busy={busy} />
    </div>
  );
}
