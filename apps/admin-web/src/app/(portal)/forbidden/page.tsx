// apps/admin-web/src/app/(portal)/forbidden/page.tsx
'use client';

import Link from 'next/link';
import { usePermissions } from '@/core/permissions';

export default function ForbiddenPage() {
  const { adminRole } = usePermissions();

  const roleName =
    adminRole === 'SUPER_ADMIN'
      ? 'Super Admin'
      : adminRole === 'ACADEMIC_ADMIN'
        ? 'Academic Admin'
        : 'Operations Admin';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          marginBottom: '16px',
        }}
      >
        🛡️
      </div>

      <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-on-surface, #0f172a)', margin: 0 }}>
        403 — Access Denied
      </h1>

      <p
        style={{
          color: 'var(--color-on-surface-subtle, #64748b)',
          fontSize: '1rem',
          maxWidth: '480px',
          margin: '12px 0 24px',
          lineHeight: 1.5,
        }}
      >
        Your administrator account is registered as <strong>{roleName}</strong>. You do not have sufficient
        permissions to access this restricted administrative area.
      </p>

      <div style={{ display: 'flex', gap: '12px' }}>
        <Link
          href="/dashboard"
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            borderRadius: '8px',
            background: 'var(--color-primary, #1a56db)',
            color: '#ffffff',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
