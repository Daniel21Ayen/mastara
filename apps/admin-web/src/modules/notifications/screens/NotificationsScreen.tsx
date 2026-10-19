// apps/admin-web/src/modules/notifications/screens/NotificationsScreen.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AdminNotification, BroadcastAudience, BroadcastPriority, StudentBroadcast } from '@/core/mock/data';

import { PageHeader, Icon, Badge } from '@/shared/ui';
import {
  fetchAdminNotifications,
  fetchBroadcasts,
  markAllAsRead,
  markAsRead,
  removeNotification,
  sendBroadcast,
} from '../api/notifications.api';
import styles from '../components/Notifications.module.css';

export function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState<'broadcasts' | 'system'>('broadcasts');

  // Broadcasts state
  const [broadcasts, setBroadcasts] = useState<StudentBroadcast[]>([]);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastAudience, setBroadcastAudience] = useState<BroadcastAudience>('ALL');
  const [broadcastPriority, setBroadcastPriority] = useState<BroadcastPriority>('INFO');
  const [broadcastActionUrl, setBroadcastActionUrl] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // System Notifications state
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');

  useEffect(() => {
    let mounted = true;
    fetchBroadcasts().then((data) => {
      if (mounted) setBroadcasts(data);
    });
    fetchAdminNotifications().then((data) => {
      if (mounted) setNotifications(data);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastBody.trim()) return;

    setIsSending(true);
    try {
      const created = await sendBroadcast({
        title: broadcastTitle,
        body: broadcastBody,
        audience: broadcastAudience,
        priority: broadcastPriority,
        actionUrl: broadcastActionUrl,
      });

      setBroadcasts((prev) => [created, ...prev]);
      setBroadcastTitle('');
      setBroadcastBody('');
      setBroadcastActionUrl('');
      setToastMessage(`Broadcast "${created.title}" sent to ${created.recipientCount} students.`);
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsSending(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    const updated = await markAsRead(id);
    setNotifications(updated);
  };

  const handleMarkAllAsRead = async () => {
    const updated = await markAllAsRead();
    setNotifications(updated);
  };

  const handleRemove = async (id: string) => {
    const updated = await removeNotification(id);
    setNotifications(updated);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filterType === 'ALL') return true;
    return n.type === filterType;
  });

  return (
    <div className={styles.container}>
      <PageHeader
        title="Notifications & Broadcasts"
        subtitle="Dispatch push announcements to mobile app students and monitor portal administrative alerts."
      />

      {/* Tabs */}
      <div className={styles.tabBar}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'broadcasts' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('broadcasts')}
        >
          <Icon name="megaphone" size={18} />
          <span>Student Announcements ({broadcasts.length})</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'system' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('system')}
        >
          <Icon name="bell" size={18} />
          <span>System Alerts</span>
          {unreadCount > 0 && <span className={styles.badgeCount}>{unreadCount}</span>}
        </button>
      </div>

      {toastMessage && (
        <div className={styles.successToast}>
          <Icon name="check" size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Broadcasts Tab */}
      {activeTab === 'broadcasts' && (
        <div className={styles.broadcastGrid}>
          {/* Announcement Builder Form */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>Send Push Broadcast</h3>
                <p className={styles.cardSubtitle}>
                  Delivers an immediate in-app notice and push alert to student mobile devices.
                </p>
              </div>
              <Icon name="send" size={20} />
            </div>

            <form onSubmit={handleSendBroadcast} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Broadcast Title *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. 2026 Model COC Exam Sets Released"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Target Audience</label>
                  <select
                    className={styles.select}
                    value={broadcastAudience}
                    onChange={(e) => setBroadcastAudience(e.target.value as BroadcastAudience)}
                  >
                    <option value="ALL">All Enrolled Students (148)</option>
                    <option value="NATURAL_SCIENCE">Natural Science Stream (92)</option>
                    <option value="SOCIAL_SCIENCE">Social Science Stream (56)</option>
                    <option value="AASTU">AASTU Students (35)</option>
                    <option value="BDU">Bahir Dar Univ. Students (30)</option>
                    <option value="JU">Jimma Univ. Students (28)</option>
                    <option value="MU">Mekelle Univ. Students (25)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Alert Priority</label>
                  <select
                    className={styles.select}
                    value={broadcastPriority}
                    onChange={(e) => setBroadcastPriority(e.target.value as BroadcastPriority)}
                  >
                    <option value="INFO">General Information</option>
                    <option value="EXAM">Exam / Quiz Release</option>
                    <option value="URGENT">Urgent Deadline / Alert</option>
                    <option value="MAINTENANCE">Maintenance / Notice</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Announcement Body Message *</label>
                <textarea
                  className={styles.textarea}
                  placeholder="Type the message that will display in the mobile notification center and splash banner..."
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Action Deep Link (Optional)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. /exam/coc or /course/calculus-1"
                  value={broadcastActionUrl}
                  onChange={(e) => setBroadcastActionUrl(e.target.value)}
                />
              </div>

              <button type="submit" className={styles.submitBtn} disabled={isSending}>
                <Icon name="send" size={16} />
                <span>{isSending ? 'Sending Announcement…' : 'Publish & Dispatch Broadcast'}</span>
              </button>
            </form>
          </div>

          {/* Past Broadcasts List */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>Recent Dispatched Broadcasts</h3>
                <p className={styles.cardSubtitle}>
                  Audit record of recent announcements broadcasted to students.
                </p>
              </div>
              <Badge tone="neutral">{broadcasts.length} Sent</Badge>
            </div>

            <div className={styles.broadcastList}>
              {broadcasts.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>
                  No broadcasts dispatched yet.
                </div>
              ) : (
                broadcasts.map((b) => (
                  <div key={b.id} className={styles.broadcastItem}>
                    <div className={styles.broadcastItemHeader}>
                      <h4 className={styles.broadcastItemTitle}>{b.title}</h4>
                      <Badge
                        tone={
                          b.priority === 'URGENT'
                            ? 'danger'
                            : b.priority === 'EXAM'
                            ? 'primary'
                            : 'neutral'
                        }
                      >
                        {b.priority}
                      </Badge>
                    </div>

                    <p className={styles.broadcastBody}>{b.body}</p>

                    <div className={styles.broadcastFooter}>
                      <span>Audience: <strong>{b.audience}</strong> ({b.recipientCount} students)</span>
                      <span>{new Date(b.sentAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* System Notifications Tab */}
      {activeTab === 'system' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className={styles.notifToolbar}>
            <div className={styles.notifFilterGroup}>
              <button
                type="button"
                className={`${styles.filterBtn} ${filterType === 'ALL' ? styles.filterBtnActive : ''}`}
                onClick={() => setFilterType('ALL')}
              >
                All Alerts
              </button>
              <button
                type="button"
                className={`${styles.filterBtn} ${filterType === 'PAYMENT' ? styles.filterBtnActive : ''}`}
                onClick={() => setFilterType('PAYMENT')}
              >
                Payments
              </button>
              <button
                type="button"
                className={`${styles.filterBtn} ${filterType === 'STUDENT' ? styles.filterBtnActive : ''}`}
                onClick={() => setFilterType('STUDENT')}
              >
                Students
              </button>
              <button
                type="button"
                className={`${styles.filterBtn} ${filterType === 'EXAM' ? styles.filterBtnActive : ''}`}
                onClick={() => setFilterType('EXAM')}
              >
                Exams
              </button>
              <button
                type="button"
                className={`${styles.filterBtn} ${filterType === 'SECURITY' ? styles.filterBtnActive : ''}`}
                onClick={() => setFilterType('SECURITY')}
              >
                Security
              </button>
            </div>

            {unreadCount > 0 && (
              <button type="button" className={styles.markAllBtn} onClick={handleMarkAllAsRead}>
                Mark all as read
              </button>
            )}
          </div>

          <div className={styles.notifList}>
            {filteredNotifications.length === 0 ? (
              <div className={styles.card} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                No notifications under this category.
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const iconBoxClass =
                  notif.type === 'PAYMENT'
                    ? styles.notifIconPayment
                    : notif.type === 'STUDENT'
                    ? styles.notifIconStudent
                    : notif.type === 'EXAM'
                    ? styles.notifIconExam
                    : notif.type === 'SECURITY'
                    ? styles.notifIconSecurity
                    : styles.notifIconSystem;

                const iconName =
                  notif.type === 'PAYMENT'
                    ? 'creditCard'
                    : notif.type === 'STUDENT'
                    ? 'users'
                    : notif.type === 'EXAM'
                    ? 'graduationCap'
                    : notif.type === 'SECURITY'
                    ? 'shield'
                    : 'bell';

                return (
                  <div
                    key={notif.id}
                    className={`${styles.notifItem} ${!notif.read ? styles.notifUnread : ''}`}
                  >
                    <div className={`${styles.notifIconBox} ${iconBoxClass}`}>
                      <Icon name={iconName} size={20} />
                    </div>

                    <div className={styles.notifContent}>
                      <div className={styles.notifTitleRow}>
                        <h4 className={styles.notifTitle}>{notif.title}</h4>
                        {!notif.read && <Badge tone="primary">New</Badge>}
                      </div>
                      <p className={styles.notifDescription}>{notif.description}</p>
                      <span className={styles.notifTime}>{notif.timestamp}</span>
                    </div>

                    <div className={styles.notifActions}>
                      {notif.linkHref && (
                        <Link href={notif.linkHref} className={styles.actionBtn}>
                          <span>{notif.actionLabel ?? 'View'}</span>
                          <Icon name="chevronRight" size={14} />
                        </Link>
                      )}
                      {!notif.read && (
                        <button
                          type="button"
                          className={styles.dismissBtn}
                          onClick={() => handleMarkAsRead(notif.id)}
                          title="Mark read"
                        >
                          <Icon name="check" size={16} />
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.dismissBtn}
                        onClick={() => handleRemove(notif.id)}
                        title="Dismiss"
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
