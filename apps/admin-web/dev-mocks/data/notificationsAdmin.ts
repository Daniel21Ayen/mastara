// apps/admin-web/src/core/mock/data/notificationsAdmin.ts

export type NotificationType = 'PAYMENT' | 'STUDENT' | 'EXAM' | 'SYSTEM' | 'SECURITY';

export interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  linkHref?: string;
  actionLabel?: string;
}

const INITIAL_NOTIFICATIONS: AdminNotification[] = [
  {
    id: 'notif-1',
    type: 'PAYMENT',
    title: 'New Student Payment',
    description: 'Abebe Kebede submitted ETB 200 for Semester Bundle via Telebirr.',
    timestamp: '5m ago',
    read: false,
    linkHref: '/commerce/payments',
    actionLabel: 'Review Payment',
  },
  {
    id: 'notif-2',
    type: 'PAYMENT',
    title: 'Payment Verification Queue',
    description: '18 student payments are waiting for verification and approval.',
    timestamp: '32m ago',
    read: false,
    linkHref: '/commerce/payments',
    actionLabel: 'Open Queue',
  },
  {
    id: 'notif-3',
    type: 'EXAM',
    title: 'Exam Set Ready',
    description: 'Freshman COC Exam Set (2026) has 40 new verified questions.',
    timestamp: '2h ago',
    read: false,
    linkHref: '/questions/coc-exams',
    actionLabel: 'View Exam',
  },
  {
    id: 'notif-4',
    type: 'STUDENT',
    title: 'New Student Enrolled',
    description: 'Kidus Yohannes enrolled in Social Science at Addis Ababa University.',
    timestamp: '4h ago',
    read: true,
    linkHref: '/students',
    actionLabel: 'View Student',
  },
  {
    id: 'notif-5',
    type: 'SYSTEM',
    title: 'Pricing Settings Logged',
    description: 'Bundle price and free trial settings updated by Administrator.',
    timestamp: '1d ago',
    read: true,
    linkHref: '/commerce/pricing',
    actionLabel: 'View Pricing',
  },
  {
    id: 'notif-6',
    type: 'SECURITY',
    title: 'Device Re-binding Alert',
    description: 'Student ST003 requested a device release after phone replacement.',
    timestamp: '1d ago',
    read: true,
    linkHref: '/audit',
    actionLabel: 'Audit Trail',
  },
];

let notifications: AdminNotification[] = [...INITIAL_NOTIFICATIONS];

export function getNotifications(): AdminNotification[] {
  return [...notifications];
}

export function markNotificationRead(id: string): AdminNotification[] {
  notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
  return getNotifications();
}

export function markAllNotificationsRead(): AdminNotification[] {
  notifications = notifications.map((n) => ({ ...n, read: true }));
  return getNotifications();
}

export function clearNotification(id: string): AdminNotification[] {
  notifications = notifications.filter((n) => n.id !== id);
  return getNotifications();
}

export function getUnreadCount(): number {
  return notifications.filter((n) => !n.read).length;
}

export type BroadcastAudience = 'ALL' | 'NATURAL_SCIENCE' | 'SOCIAL_SCIENCE' | 'AASTU' | 'BDU' | 'JU' | 'MU';
export type BroadcastPriority = 'INFO' | 'EXAM' | 'URGENT' | 'MAINTENANCE';

export interface StudentBroadcast {
  id: string;
  title: string;
  body: string;
  audience: BroadcastAudience;
  priority: BroadcastPriority;
  actionUrl?: string;
  sentAt: string;
  sentBy: string;
  recipientCount: number;
}

const INITIAL_BROADCASTS: StudentBroadcast[] = [
  {
    id: 'bc-1',
    title: '2026 Model COC Exam Sets Released',
    body: 'Comprehensive Model COC exams for Natural and Social sciences are now unlocked in the Exams section.',
    audience: 'ALL',
    priority: 'EXAM',
    actionUrl: '/exam/coc',
    sentAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    sentBy: 'Admin (System)',
    recipientCount: 148,
  },
  {
    id: 'bc-2',
    title: 'General Physics Formula Notes Updated',
    body: 'Formulas and offline KaTeX equation cards updated for Chapter 3 with Ethiopic translations.',
    audience: 'NATURAL_SCIENCE',
    priority: 'INFO',
    actionUrl: '/course/physics',
    sentAt: new Date(Date.now() - 3600000 * 28).toISOString(),
    sentBy: 'Admin (System)',
    recipientCount: 92,
  },
  {
    id: 'bc-3',
    title: 'Telebirr Payment Gateway Maintenance',
    body: 'Scheduled payment verification maintenance completed. Instant bundle activations are back online.',
    audience: 'ALL',
    priority: 'MAINTENANCE',
    sentAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    sentBy: 'Admin (System)',
    recipientCount: 148,
  },
];

let broadcasts: StudentBroadcast[] = [...INITIAL_BROADCASTS];

export function getStudentBroadcasts(): StudentBroadcast[] {
  return [...broadcasts].sort((a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt));
}

export function createStudentBroadcast(input: {
  title: string;
  body: string;
  audience: BroadcastAudience;
  priority: BroadcastPriority;
  actionUrl?: string;
  sentBy?: string;
}): StudentBroadcast {
  const recipientCount =
    input.audience === 'ALL'
      ? 148
      : input.audience === 'NATURAL_SCIENCE'
      ? 92
      : input.audience === 'SOCIAL_SCIENCE'
      ? 56
      : 35;

  const newBroadcast: StudentBroadcast = {
    id: `bc-${Date.now()}`,
    title: input.title.trim(),
    body: input.body.trim(),
    audience: input.audience,
    priority: input.priority,
    actionUrl: input.actionUrl?.trim() || undefined,
    sentAt: new Date().toISOString(),
    sentBy: input.sentBy ?? 'Admin',
    recipientCount,
  };

  broadcasts = [newBroadcast, ...broadcasts];
  return newBroadcast;
}

