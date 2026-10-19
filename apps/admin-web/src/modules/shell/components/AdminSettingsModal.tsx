// apps/admin-web/src/modules/shell/components/AdminSettingsModal.tsx
'use client';

import React, { useState } from 'react';
import { Icon } from '@/shared/ui';
import styles from './AdminSettingsModal.module.css';

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSettingsModal({ isOpen, onClose }: AdminSettingsModalProps) {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [autoRefreshQueue, setAutoRefreshQueue] = useState(true);
  const [currency, setCurrency] = useState('ETB');
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 900);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerTitleRow}>
            <div className={styles.iconCircle}>
              <Icon name="settings" size={20} />
            </div>
            <div>
              <h2 className={styles.title}>System &amp; Admin Settings</h2>
              <p className={styles.subtitle}>Customize your notifications and portal preferences</p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={styles.body}>
          {/* Notifications Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Notification Preferences</h3>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <strong>New Payment Alerts</strong>
                <p>Receive live alerts whenever a student submits a payment via Telebirr or CBE.</p>
              </div>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                />
                <span className={styles.slider} />
              </label>
            </div>

            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <strong>Real-time Payment Queue Polling</strong>
                <p>Automatically refresh unverified payments in the background every 30 seconds.</p>
              </div>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={autoRefreshQueue}
                  onChange={(e) => setAutoRefreshQueue(e.target.checked)}
                />
                <span className={styles.slider} />
              </label>
            </div>

            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <strong>Audio Chime on Urgent Alerts</strong>
                <p>Play a gentle alert sound when high-priority verification is needed.</p>
              </div>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                />
                <span className={styles.slider} />
              </label>
            </div>
          </div>

          {/* Regional & Financial Preferences */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Currency &amp; Localization</h3>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <strong>Primary Display Currency</strong>
                <p>Standard unit for student payments and pricing quotes.</p>
              </div>
              <select
                className={styles.selectInput}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="ETB">ETB - Ethiopian Birr (ብር)</option>
                <option value="USD">USD - US Dollar ($)</option>
              </select>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={styles.saveBtn} onClick={handleSave}>
            {saved ? '✓ Saved!' : 'Save preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}
