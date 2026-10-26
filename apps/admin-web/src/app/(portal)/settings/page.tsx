// apps/admin-web/src/app/(portal)/settings/page.tsx
'use client';

import React, { useState } from 'react';
import { useAdminSession } from '@/core/session';
import { Icon } from '@/shared/ui';

export default function SettingsPage() {
  const { user } = useAdminSession();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(false);
  const [currency, setCurrency] = useState('ETB');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '48px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px 0' }}>
            System &amp; Admin Settings
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--color-text-muted)', margin: 0 }}>
            Manage portal configuration, security, and notification preferences
          </p>
        </div>
        {saved && (
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', background: 'var(--color-primary-soft)', border: '1px solid var(--color-border)', padding: '6px 14px', borderRadius: '8px' }}>
            ✓ Settings saved
          </span>
        )}
      </div>

      {/* Admin Profile Summary Card */}
      <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '16px', border: '1px solid var(--color-border)', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: 'var(--color-primary)', color: 'var(--color-on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800 }}>
          {user.name.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>{user.name}</h2>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-primary)', background: 'var(--color-primary-soft)', border: '1px solid var(--color-border)', padding: '2px 8px', borderRadius: '6px' }}>
              Super Admin
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>{user.identifier}</p>
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '16px', border: '1px solid var(--color-border)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Notification Preferences</h3>

          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', backgroundColor: 'var(--color-surface-subtle)', borderRadius: '10px', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
            <div>
              <strong style={{ fontSize: '14px', color: 'var(--color-text)', display: 'block' }}>Payment Submission Alerts</strong>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Notify in topbar whenever a student submits CBE or Telebirr receipts</span>
            </div>
            <input type="checkbox" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }} />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', backgroundColor: 'var(--color-surface-subtle)', borderRadius: '10px', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
            <div>
              <strong style={{ fontSize: '14px', color: 'var(--color-text)', display: 'block' }}>Audio Alert Chime</strong>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Play gentle chime when critical audit or duplicate payments occur</span>
            </div>
            <input type="checkbox" checked={soundAlerts} onChange={(e) => setSoundAlerts(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }} />
          </label>
        </div>

        <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '16px', border: '1px solid var(--color-border)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Currency &amp; Finance</h3>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', backgroundColor: 'var(--color-surface-subtle)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
            <div>
              <strong style={{ fontSize: '14px', color: 'var(--color-text)', display: 'block' }}>Primary System Currency</strong>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Base currency for all products, bundles, and receipts</span>
            </div>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '13px', fontWeight: 600, background: 'var(--color-surface)', color: 'var(--color-text)' }}>
              <option value="ETB">ETB - Ethiopian Birr (ብር)</option>
              <option value="USD">USD - US Dollar ($)</option>
            </select>
          </div>
        </div>

        <button type="submit" style={{ alignSelf: 'flex-start', backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', padding: '10px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          Save changes
        </button>
      </form>
    </div>
  );
}
