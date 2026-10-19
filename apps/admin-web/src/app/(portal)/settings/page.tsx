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
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
            System &amp; Admin Settings
          </h1>
          <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
            Manage portal configuration, security, and notification preferences
          </p>
        </div>
        {saved && (
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a56db', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '6px 14px', borderRadius: '8px' }}>
            ✓ Settings saved
          </span>
        )}
      </div>

      {/* Admin Profile Summary Card */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: '#1a56db', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800 }}>
          {user.name.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{user.name}</h2>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#1a56db', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '6px' }}>
              Super Admin
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>{user.identifier}</p>
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Notification Preferences</h3>

          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
            <div>
              <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>Payment Submission Alerts</strong>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Notify in topbar whenever a student submits CBE or Telebirr receipts</span>
            </div>
            <input type="checkbox" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#1a56db' }} />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
            <div>
              <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>Audio Alert Chime</strong>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Play gentle chime when critical audit or duplicate payments occur</span>
            </div>
            <input type="checkbox" checked={soundAlerts} onChange={(e) => setSoundAlerts(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#1a56db' }} />
          </label>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Currency &amp; Finance</h3>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div>
              <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>Primary System Currency</strong>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Base currency for all products, bundles, and receipts</span>
            </div>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600 }}>
              <option value="ETB">ETB - Ethiopian Birr (ብር)</option>
              <option value="USD">USD - US Dollar ($)</option>
            </select>
          </div>
        </div>

        <button type="submit" style={{ alignSelf: 'flex-start', backgroundColor: '#1a56db', color: '#ffffff', border: 'none', padding: '10px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          Save changes
        </button>
      </form>
    </div>
  );
}
