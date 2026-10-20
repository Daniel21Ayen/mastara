// apps/admin-web/src/app/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center', fontFamily: 'inherit' }}>
      <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Page Not Found</h2>
      <p style={{ color: '#64748b', margin: '8px 0 24px' }}>
        The requested admin page could not be found.
      </p>
      <Link
        href="/content"
        style={{
          display: 'inline-block',
          padding: '10px 20px',
          borderRadius: '8px',
          background: '#1a56db',
          color: '#ffffff',
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Return to Content Management
      </Link>
    </div>
  );
}
