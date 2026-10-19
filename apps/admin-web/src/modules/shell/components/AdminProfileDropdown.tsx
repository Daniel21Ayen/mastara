// apps/admin-web/src/modules/shell/components/AdminProfileDropdown.tsx
'use client';

import React from 'react';
import type { AdminUser } from '@mastara/contracts';
import { Icon } from '@/shared/ui';
import styles from './AdminProfileDropdown.module.css';

interface AdminProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export function AdminProfileDropdown({
  isOpen,
  onClose,
  user,
  onOpenProfile,
  onOpenSettings,
  onLogout,
}: AdminProfileDropdownProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.dropdown} onClick={(e) => e.stopPropagation()}>
      {/* User Header */}
      <div className={styles.userHeader}>
        <div className={styles.avatar}>
          <span>{user.name.slice(0, 2).toUpperCase()}</span>
        </div>
        <div className={styles.userInfo}>
          <div className={styles.nameRow}>
            <strong className={styles.userName}>{user.name}</strong>
            <span className={styles.adminBadge}>Admin</span>
          </div>
          <span className={styles.userEmail}>{user.identifier}</span>
        </div>
      </div>

      <div className={styles.menuList}>
        <button
          type="button"
          className={styles.menuItem}
          onClick={() => {
            onClose();
            onOpenProfile();
          }}
        >
          <div className={styles.itemIcon}>
            <Icon name="user" size={16} />
          </div>
          <div className={styles.itemText}>
            <span>Admin Detailed Profile</span>
            <small>Permissions, ID &amp; audit alerts</small>
          </div>
          <Icon name="chevronRight" size={14} />
        </button>

        <button
          type="button"
          className={styles.menuItem}
          onClick={() => {
            onClose();
            onOpenSettings();
          }}
        >
          <div className={styles.itemIcon}>
            <Icon name="settings" size={16} />
          </div>
          <div className={styles.itemText}>
            <span>System &amp; Portal Settings</span>
            <small>Alerts, sound &amp; currencies</small>
          </div>
          <Icon name="chevronRight" size={14} />
        </button>

      </div>

      <div className={styles.divider} />

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.logoutBtn}
          onClick={() => {
            onClose();
            onLogout();
          }}
        >
          <Icon name="logOut" size={16} />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
}
