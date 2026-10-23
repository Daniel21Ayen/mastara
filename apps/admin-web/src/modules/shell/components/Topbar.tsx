// apps/admin-web/src/modules/shell/components/Topbar.tsx
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { adminText } from '@/core/i18n';
import {
  fetchAdminNotifications,
  markAsRead,
  markAllAsRead,
  removeNotification,
} from '@/modules/notifications/api/notifications.api';
import type { AdminNotification } from '@/modules/notifications/api/notifications.api';
import { useAdminSession } from '@/core/session';
import { Icon } from '@/shared/ui';

import { AdminProfileDropdown } from './AdminProfileDropdown';
import { AdminProfileModal } from './AdminProfileModal';
import { AdminSettingsModal } from './AdminSettingsModal';
import { NotificationDropdown } from './NotificationDropdown';
import styles from './Topbar.module.css';

interface TopbarProps {
  menuOpen: boolean;
  onToggleMenu: () => void;
}

export function Topbar({ menuOpen, onToggleMenu }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { user, logout } = useAdminSession();

  const onStudents = pathname === '/students' || pathname.startsWith('/students/');
  const onQuestions = pathname.startsWith('/questions');
  const onPayments = pathname === '/commerce/payments';
  const onContent = pathname.startsWith('/content') || onQuestions || onPayments;
  const [query, setQuery] = useState(onStudents || onContent ? (params.get('q') ?? '') : '');

  // Notifications & Profile Dropdown states
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Initialize notifications from API
  useEffect(() => {
    let mounted = true;
    fetchAdminNotifications()
      .then((data) => {
        if (mounted) setNotifications(data);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkRead = async (id: string) => {
    try {
      const updated = await markAsRead(id);
      setNotifications(updated);
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      const updated = await markAllAsRead();
      setNotifications(updated);
    } catch {}
  };

  const handleClear = async (id: string) => {
    try {
      const updated = await removeNotification(id);
      setNotifications(updated);
    } catch {}
  };

  // Search input sync
  const currentQ = params.get('q') ?? '';
  useEffect(() => {
    if (
      pathname === '/students' ||
      pathname.startsWith('/content') ||
      pathname.startsWith('/questions') ||
      onPayments
    ) {
      setQuery(currentQ);
    }
  }, [pathname, currentQ]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = query.trim();
    if (onContent) {
      router.push(text ? `${pathname}?q=${encodeURIComponent(text)}` : pathname);
      return;
    }
    if (text) router.push(`/students?q=${encodeURIComponent(text)}`);
    else if (onStudents) router.push('/students');
  }

  return (
    <>
      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.menuButton}
          aria-expanded={menuOpen}
          aria-controls="portal-sidebar"
          aria-label={
            menuOpen ? adminText('admin.common.closeMenu') : adminText('admin.common.openMenu')
          }
          onClick={onToggleMenu}
        >
          <span aria-hidden="true">☰</span>
        </button>

        <form className={styles.search} role="search" onSubmit={search}>
          <label htmlFor="global-search" className="sr-only">
            {adminText('admin.topbar.searchLabel')}
          </label>
          <input
            id="global-search"
            className={styles.input}
            type="search"
            placeholder={adminText(
              onStudents
                ? 'admin.students.searchPlaceholder'
                : onQuestions
                  ? 'admin.questions.searchPlaceholder'
                  : onPayments
                    ? 'admin.payments.searchPlaceholder'
                    : onContent
                    ? 'admin.content.searchPlaceholder'
                    : 'admin.topbar.searchPlaceholder',
            )}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>

        <div className={styles.rightControls}>
          {/* Notification Button & Flyout */}
          <div className={styles.notifContainer} ref={notifRef}>
            <button
              type="button"
              className={`${styles.notifBtn} ${notifOpen ? styles.notifBtnActive : ''}`}
              onClick={() => {
                setNotifOpen(!notifOpen);
                setProfileOpen(false);
              }}
              aria-label="Notifications"
            >
              <Icon name="bell" size={18} />
              {unreadCount > 0 && (
                <span className={styles.notifBadge}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <NotificationDropdown
              isOpen={notifOpen}
              onClose={() => setNotifOpen(false)}
              notifications={notifications}
              onMarkRead={handleMarkRead}
              onMarkAllRead={handleMarkAllRead}
              onClear={handleClear}
            />
          </div>

          {/* Admin Profile Dropdown */}
          <div className={styles.profileContainer} ref={profileRef}>
            <button
              type="button"
              className={`${styles.profileBtn} ${profileOpen ? styles.profileBtnActive : ''}`}
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotifOpen(false);
              }}
              aria-label="Admin account menu"
            >
              <div className={styles.profileAvatar}>
                <span>{user.name.slice(0, 2).toUpperCase()}</span>
              </div>
              <div className={styles.profileInfo}>
                <span className={styles.profileName}>{user.name}</span>
                <span className={styles.profileRole}>Super Admin</span>
              </div>
              <div
                className={`${styles.profileChevron} ${
                  profileOpen ? styles.chevronRotated : ''
                }`}
              >
                <Icon name="chevronDown" size={14} />
              </div>
            </button>

            <AdminProfileDropdown
              isOpen={profileOpen}
              onClose={() => setProfileOpen(false)}
              user={user}
              onOpenProfile={() => setProfileModalOpen(true)}
              onOpenSettings={() => setSettingsModalOpen(true)}
              onLogout={logout}
            />
          </div>
        </div>
      </header>

      {/* Admin Profile Detailed Modal */}
      <AdminProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={user}
      />

      {/* System Settings Modal */}
      <AdminSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
    </>
  );
}
