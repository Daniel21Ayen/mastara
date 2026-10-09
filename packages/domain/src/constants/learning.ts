// packages/domain/src/constants/learning.ts
export const ACCESS_STATES = ['PAID', 'FREE_TRIAL', 'LOCKED'] as const;
export type AccessState = (typeof ACCESS_STATES)[number];

export const COURSE_TABS = ['ALL', 'ONGOING', 'COMPLETED'] as const;
export type CourseTab = (typeof COURSE_TABS)[number];

export const RECENT_KINDS = ['TOPIC', 'NOTE', 'EXAM'] as const;
export type RecentKind = (typeof RECENT_KINDS)[number];
