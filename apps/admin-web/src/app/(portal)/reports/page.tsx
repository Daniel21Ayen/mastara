// apps/admin-web/src/app/(portal)/reports/page.tsx
import type { Metadata } from 'next';
import { ReportsScreen } from '@/modules/reports';

export const metadata: Metadata = {
  title: 'Reports & Analytics · Mastara Admin',
};

export default function ReportsPage() {
  return <ReportsScreen />;
}
