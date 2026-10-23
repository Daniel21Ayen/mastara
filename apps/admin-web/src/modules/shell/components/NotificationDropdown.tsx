// apps/admin-web/src/modules/shell/components/NotificationDropdown.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { AdminNotification, NotificationType } from '@/modules/notifications/api/notifications.api';
import { Icon } from '@/shared/ui';
import styles from './NotificationDropdown.module.css';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AdminNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClear: (id: string) => void;
}

export function NotificationDropdown({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClear,
}: NotificationDropdownProps) {
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'PAYMENTS'>('ALL');

  if (!isOpen) return null;

  const filtered = notifications.filter((item) => {
    if (filter === 'UNREAD') return !item.read;
    if (filter === 'PAYMENTS') return item.type === 'PAYMENT';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIconForType = (type: NotificationType) => {
    switch (type) {
      case 'PAYMENT':
        return <Icon name="creditCard" size={16} />;
      case 'STUDENT':
        return <Icon name="users" size={16} />;
      case 'EXAM':
        return <Icon name="quiz" size={16} />;
      case 'SECURITY':
        return <Icon name="shield" size={16} />;
      default:
        return <Icon name="bell" size={16} />;
    }
  };

  const getTypeClass = (type: NotificationType) => {
    switch (type) {
      case 'PAYMENT':
        return styles.typePayment;
      case 'STUDENT':
        return styles.typeStudent;
      case 'EXAM':
        return styles.typeExam;
      case 'SECURITY':
        return styles.typeSecurity;
      default:
        return styles.typeSystem;
    }
  };

  return (
    <div className={styles.dropdown} onClick={(e) => e.stopPropagation()}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.title}>Notifications</span>
          {unreadCount > 0 && (
            <span className={styles.unreadBadge}>{unreadCount} unread</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            className={styles.markAllBtn}
            onClick={onMarkAllRead}
          >
            Mark all read
          </button>
        )}
      </div>

      <div className={styles.filterTabs}>
        <button
          type="button"
          className={`${styles.tabBtn} ${filter === 'ALL' ? styles.activeTab : ''}`}
          onClick={() => setFilter('ALL')}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${filter === 'UNREAD' ? styles.activeTab : ''}`}
          onClick={() => setFilter('UNREAD')}
        >
          Unread ({unreadCount})
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${filter === 'PAYMENTS' ? styles.activeTab : ''}`}
          onClick={() => setFilter('PAYMENTS')}
        >
          Payments
        </button>
      </div>

      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Icon name="bell" size={24} />
            </div>
            <p className={styles.emptyText}>No notifications found</p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className={`${styles.item} ${!item.read ? styles.unreadItem : ''}`}
              onClick={() => onMarkRead(item.id)}
            >
              <div className={`${styles.iconWrap} ${getTypeClass(item.type)}`}>
                {getIconForType(item.type)}
              </div>

              <div className={styles.content}>
                <div className={styles.titleRow}>
                  <strong className={styles.itemTitle}>{item.title}</strong>
                  <span className={styles.time}>{item.timestamp}</span>
                </div>
                <p className={styles.description}>{item.description}</p>

                <div className={styles.itemActions}>
                  {item.linkHref && (
                    <Link
                      href={item.linkHref}
                      className={styles.actionLink}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkRead(item.id);
                        onClose();
                      }}
                    >
                      {item.actionLabel ?? 'View Details'} →
                    </Link>
                  )}
                  <button
                    type="button"
                    className={styles.clearBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      onClear(item.id);
                    }}
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {!item.read && <span className={styles.dot} />}
            </div>
          ))
        )}
      </div>

      <div className={styles.footer}>
        <Link
          href="/commerce/payments"
          className={styles.footerLink}
          onClick={onClose}
        >
          View all payment receipts &amp; queue →
        </Link>
      </div>
    </div>
  );
}
