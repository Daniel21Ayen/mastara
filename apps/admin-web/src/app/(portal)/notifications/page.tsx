// apps/admin-web/src/app/(portal)/notifications/page.tsx
import type { Metadata } from 'next';
import { NotificationsScreen } from '@/modules/notifications';

export const metadata: Metadata = {
  title: 'Notifications & Broadcasts · Mastara Admin',
};

export default function NotificationsPage() {
  return <NotificationsScreen />;
}
