// packages/domain/src/constants/admin.ts

/** Only two roles exist. The server resolves the role from the stored account; the client never sends one. */
export const ROLES = ['STUDENT', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

/** Who did something that is written to the audit log. */
export const AUDIT_ACTORS = ['ADMIN', 'STUDENT', 'SYSTEM'] as const;
export type AuditActor = (typeof AUDIT_ACTORS)[number];

/** Things the audit log records. Add a kind here, then a label in `packages/i18n/src/admin/en.json`. */
export const AUDIT_ACTIONS = [
  'PAYMENT_APPROVED',
  'PAYMENT_REJECTED',
  'DEVICE_REVOKED',
  'DEVICE_RELEASED_BY_STUDENT',
  'PRICE_CHANGED',
  'CONTENT_PUBLISHED',
  'EXAM_PUBLISHED',
  'ACCESS_GRANTED',
  'ACCESS_EXTENDED',
  'STUDENT_SUSPENDED',
  'STUDENT_REACTIVATED',
  'STUDENT_ADDED',
  'COURSE_CREATED',
  'COURSE_UPDATED',
  'COURSE_PUBLISHED',
  'COURSE_UNPUBLISHED',
  'CATALOG_ADDED',
  'CATALOG_UPDATED',
  'CATALOG_UNPUBLISHED',
  'MODULE_CREATED',
  'MODULE_UPDATED',
  'TOPIC_ADDED',
  'NOTE_CREATED',
  'NOTE_UPDATED',
  'CONTENT_UNPUBLISHED',
  'SCAN_ADDED',
  'QUESTION_CREATED',
  'QUESTION_UPDATED',
  'QUESTION_PUBLISHED',
  'QUESTION_UNPUBLISHED',
  'QUIZ_UPDATED',
  'QUIZ_PUBLISHED',
  'QUIZ_UNPUBLISHED',
  'EXAM_SET_CREATED',
  'EXAM_SET_UPDATED',
  'EXAM_SET_PUBLISHED',
  'EXAM_SET_UNPUBLISHED',
  'COURSE_DELETED',
  'CATALOG_DELETED',
  'SUPPORT_TICKET_REPLIED',
  'SUPPORT_TICKET_RESOLVED',
  'REQUEST_DENIED',
  'REFUND_REQUESTED',
  'REFUND_APPROVED',
  'REFUND_REJECTED',
  'ENTITLEMENT_REVOKED',
  'STUDENT_DELETION_REQUESTED',
  'STUDENT_DELETION_CANCELLED',
  'STUDENT_DELETED',
  'ROLE_CHANGED',
  'SCOPE_CHANGED',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Critical actions that require admin attention (used to restrict DB logging and filter attention panels). */
export const ATTENTION_AUDIT_ACTIONS = [
  'PAYMENT_REJECTED',
  'DEVICE_REVOKED',
  'STUDENT_SUSPENDED',
  'ACCESS_EXTENDED',
  'PRICE_CHANGED',
  'REQUEST_DENIED',
  'REFUND_REQUESTED',
  'REFUND_APPROVED',
  'REFUND_REJECTED',
  'ENTITLEMENT_REVOKED',
  'STUDENT_DELETION_REQUESTED',
  'STUDENT_DELETED',
  'ROLE_CHANGED',
  'SCOPE_CHANGED',
] as const;
export type AttentionAuditAction = (typeof ATTENTION_AUDIT_ACTIONS)[number];

export function isAttentionAuditAction(action: string): boolean {
  return (ATTENTION_AUDIT_ACTIONS as readonly string[]).includes(action);
}

// ---- Refunds (Phase 5) ----

export const REFUND_STATUSES = [
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'PAID_OUT',
  'ENTITLEMENT_REVOKED',
] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

/** Days shown in the dashboard "new students" chart. */
export const DASHBOARD_TREND_DAYS = 7;

/** How many audit entries the dashboard "Recent activity" list shows. */
export const DASHBOARD_RECENT_LIMIT = 3;

// ---- Students (F11b) ----

export const STUDENT_STATUSES = ['ACTIVE', 'SUSPENDED'] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

/** One phone per account. RELEASED covers both "student released it" and "admin revoked it". */
export const DEVICE_STATUSES = ['BOUND', 'RELEASED'] as const;
export type DeviceStatus = (typeof DEVICE_STATUSES)[number];

/** Access of a student, or of one course in the student's list, as the admin sees it. */
export const STUDENT_ACCESS_STATES = ['PAID', 'PENDING', 'FREE_TRIAL', 'EXPIRED'] as const;
export type StudentAccessState = (typeof STUDENT_ACCESS_STATES)[number];

export const STUDENTS_PAGE_SIZE = 10;

/** A reason is required for every sensitive student action (SRS 6.6). */
export const REASON_MIN_LENGTH = 5;

export const DEFAULT_GRANT_DAYS = 30;
export const MAX_GRANT_DAYS = 365;

// ---- Catalog (F11c) ----

/** Only PUBLISHED universities, programs and courses are shown to students (FR-010). */
export const CATALOG_STATUSES = ['DRAFT', 'PUBLISHED'] as const;
export type CatalogStatus = (typeof CATALOG_STATUSES)[number];

export const CATALOG_PAGE_SIZE = 10;

/** Scope value of a course that is open to every university. */
export const ALL_UNIVERSITIES = 'ALL';

/** Most free-trial items an admin can allow on one course. */
export const FREE_TRIAL_MAX_ITEMS = 20;

// ---- Content (F11d) ----

/** Rows shown in a "Recent updates" list on the Content pages. */
export const CONTENT_RECENT_LIMIT = 3;

/** Modules a course starts with in the mock content, and quizzes every course has (Quiz 1, 2, 3). */
export const QUIZ_COUNT = 3;

/** Longest note title the editor accepts. */
export const NOTE_TITLE_MAX = 120;

// ---- Tests (F11d2) ----

/** Question types the editor offers. Blank Space reaches students as a short answer with a blank in the text. */
export const QUESTION_FORMS = [
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'SHORT_ANSWER',
  'BLANK_SPACE',
] as const;
export type QuestionForm = (typeof QUESTION_FORMS)[number];

/** Rows per page in the Test Management table. */
export const TESTS_PAGE_SIZE = 10;

export const QUESTION_PROMPT_MAX = 500;
export const QUESTION_TITLE_MAX = 120;
export const OPTIONS_MIN = 2;
export const OPTIONS_MAX = 6;
/** Options a new multiple-choice question starts with. */
export const OPTIONS_DEFAULT = 4;

/** Where the blank goes in a Blank Space question. */
export const BLANK_MARKER = '___';

export const QUIZ_MINUTES_MIN = 5;
export const QUIZ_MINUTES_MAX = 180;
export const QUIZ_MINUTES_DEFAULT = 15;

// ---- Scan to PDF (F11e) ----

/** What a scan is for: a past COC paper, an exam, a study material or a quiz. */
export const SCAN_KINDS = ['COC', 'EXAM', 'MATERIAL', 'QUIZ'] as const;
export type ScanKind = (typeof SCAN_KINDS)[number];

/** The materials a scan can be attached to (Modules, Notes and Amharic Notes). */
export const SCAN_MATERIAL_KINDS = ['MODULE', 'NOTE', 'AMHARIC_NOTE'] as const;
export type ScanMaterialKind = (typeof SCAN_MATERIAL_KINDS)[number];

/** Files the admin can add as scanned pages or as an answer attachment. */
export const SCAN_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;
export const SCAN_FILE_MAX_BYTES = 10 * 1024 * 1024;
export const SCAN_PAGES_MAX = 40;
export const SCAN_ANSWERS_MAX = 100;
export const SCAN_DESCRIPTION_MAX = 1000;
export const SCAN_TEXT_MAX = 2000;
export const SCAN_PAGE_SIZE = 10;
export const SCAN_YEAR_MIN = 1990;
export const SCAN_YEAR_MAX = 2100;

// ---- Exam sets (F11f) ----

/** The four kinds of exam set. COC sets mix questions of several courses, so they have no course. */
export const EXAM_SET_KINDS = ['MID', 'FINAL', 'COC', 'MOCK'] as const;
export type ExamSetKind = (typeof EXAM_SET_KINDS)[number];

export const SET_PAGE_SIZE = 10;
/** Most questions in one exam set. */
export const SET_QUESTIONS_MAX = 200;
export const SET_MINUTES_MIN = 1;
export const SET_MINUTES_MAX = 300;
export const SET_MINUTES_DEFAULT = 60;
/** The academic years an exam set can be for (the year it starts), newest first. */
export const SET_YEARS = [2026, 2025, 2024, 2023, 2022] as const;
export const SET_YEAR_DEFAULT = 2026;
export const EXAM_PROMPT_MAX = 1000;
export const QUESTION_ID_MAX = 40;
export const EXAM_TOPIC_MAX = 80;

// ---- Payments (F11g) ----

export const PAYMENTS_PAGE_SIZE = 10;
