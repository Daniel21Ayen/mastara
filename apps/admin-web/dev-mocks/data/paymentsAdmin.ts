// apps/admin-web/src/core/mock/data/paymentsAdmin.ts
import type {
  AdminPayment,
  PaymentCounts,
  PaymentDecision,
  PaymentListQuery,
  PaymentListResult,
} from '@mastara/contracts';
import { paymentListQuerySchema } from '@mastara/contracts';
import { canDecide, DEFAULT_PRICING_CONFIG, ADMIN_ERROR_CODES, PAYMENTS_PAGE_SIZE, quoteOrder, referenceKey } from '@mastara/domain';
import type {
  OrderStatus,
  OrderStream,
  PaymentMethod,
  ProductType,
  RejectReason,
} from '@mastara/domain';

import { ApiError } from '@/core/network';

import { courseById, courses, programById, semesters, universityById } from './catalog';
import { paymentCandidates, releasePendingCourses, unlockStudentCourses } from './students';
import type { PaymentCandidate } from './students';

/**
 * Mock payment queue for the Admin Payments pages. Payments belong to real students of the Students
 * mock, so approving one unlocks that student's courses and rejecting one puts them back on the free
 * trial. Prices and durations come from the shared default pricing until Products & Pricing (F11h)
 * makes them editable. Backend phase B5 replaces this.
 */

const MINUTE_MS = 60_000;

interface PaymentRecord {
  id: string;
  studentId: string;
  studentName: string;
  universityId: string;
  type: ProductType;
  stream: OrderStream;
  courseIds: string[];
  amount: number;
  method: PaymentMethod;
  reference: string;
  status: OrderStatus;
  rejectReason: RejectReason | null;
  createdAtMs: number;
  decidedAtMs: number | null;
  durationDays: number;
}

const payments: PaymentRecord[] = [];
let seeded = false;

// ---------- seed ----------

const PENDING_TYPES: readonly ProductType[] = [
  'BUNDLE',
  'FULL_STREAM',
  'SINGLE',
  'BUNDLE',
  'SINGLE',
  'FULL_BOTH',
];
const METHODS: readonly PaymentMethod[] = ['CBE_MOBILE', 'TELEBIRR', 'CBE_BIRR'];
const PENDING_AGO_MIN = [
  10, 60, 120, 190, 260, 400, 560, 700, 900, 1100, 1300, 1500, 1700, 1900, 2100, 2300, 2500, 2700,
];
const REJECT_CYCLE: readonly RejectReason[] = ['MISMATCH', 'UNREADABLE', 'DUPLICATE'];

function referenceFor(method: PaymentMethod, n: number): string {
  const digits = String(100_000 + ((n * 7919) % 900_000)).padStart(6, '0');
  if (method === 'CBE_MOBILE') return `FT25${digits}`;
  return `${method === 'TELEBIRR' ? 'DJ' : 'CB'}${digits}${String(n % 100).padStart(2, '0')}`;
}

/** Courses a student's program offers for a stream (common courses are in every stream). */
function programCourses(programId: string, stream: OrderStream) {
  const semesterIds = semesters.filter((s) => s.programId === programId).map((s) => s.id);
  return courses.filter(
    (course) =>
      semesterIds.includes(course.semesterId) &&
      (stream === 'BOTH' || course.stream === 'COMMON' || course.stream === stream),
  );
}

function quoteFor(type: ProductType, courseCount: number): number {
  const result = quoteOrder(
    DEFAULT_PRICING_CONFIG,
    type === 'BUNDLE' ? { type, courseCount } : { type },
  );
  return result.ok ? result.quote.total : 0;
}

function buildRecord(
  candidate: PaymentCandidate,
  type: ProductType,
  index: number,
  method: PaymentMethod,
  status: OrderStatus,
  agoMin: number,
  now: number,
  rejectReason: RejectReason | null,
): PaymentRecord {
  const stream: OrderStream = type === 'FULL_BOTH' ? 'BOTH' : candidate.stream;
  const pool = programCourses(candidate.programId, stream);
  let courseIds: string[];
  if (type === 'BUNDLE') courseIds = pool.slice(0, 7 + (index % 4)).map((c) => c.id);
  else if (type === 'SINGLE') {
    const wanted = candidate.pendingCourseIds[0] ?? candidate.paidCourseIds[0];
    courseIds = [wanted ?? pool[0]?.id ?? ''];
  } else courseIds = pool.map((c) => c.id);
  const createdAtMs = now - agoMin * MINUTE_MS;
  return {
    id: '',
    studentId: candidate.id,
    studentName: candidate.name,
    universityId: candidate.universityId,
    type,
    stream,
    courseIds,
    amount: quoteFor(type, courseIds.length),
    method,
    reference: referenceFor(method, index + 1),
    status,
    rejectReason,
    createdAtMs,
    decidedAtMs: status === 'PENDING' ? null : createdAtMs + 40 * MINUTE_MS,
    durationDays: DEFAULT_PRICING_CONFIG.durationDays[type],
  };
}

function ensureSeed(now = Date.now()): void {
  if (seeded) return;
  seeded = true;
  const candidates = paymentCandidates();
  const used = new Set<string>();
  const take = (filter: (c: PaymentCandidate) => boolean, count: number): PaymentCandidate[] => {
    const found = candidates.filter((c) => !used.has(c.id) && filter(c)).slice(0, count);
    for (const c of found) used.add(c.id);
    return found;
  };

  const pending = take((c) => c.pendingCourseIds.length > 0, PENDING_AGO_MIN.length);
  const approved = take((c) => c.paidCourseIds.length > 0, 12);
  const rejected = take(() => true, 5);

  const list: PaymentRecord[] = [];
  pending.forEach((c, i) =>
    list.push(
      buildRecord(
        c,
        PENDING_TYPES[i % PENDING_TYPES.length] ?? 'SINGLE',
        i,
        METHODS[i % METHODS.length] ?? 'CBE_MOBILE',
        'PENDING',
        PENDING_AGO_MIN[i] ?? 3000,
        now,
        null,
      ),
    ),
  );
  approved.forEach((c, i) =>
    list.push(
      buildRecord(
        c,
        PENDING_TYPES[(i + 2) % PENDING_TYPES.length] ?? 'SINGLE',
        100 + i,
        METHODS[(i + 1) % METHODS.length] ?? 'CBE_MOBILE',
        'APPROVED',
        3 * 24 * 60 + i * 400,
        now,
        null,
      ),
    ),
  );
  rejected.forEach((c, i) =>
    list.push(
      buildRecord(
        c,
        'SINGLE',
        200 + i,
        METHODS[i % METHODS.length] ?? 'CBE_MOBILE',
        'REJECTED',
        2 * 24 * 60 + i * 500,
        now,
        REJECT_CYCLE[i % REJECT_CYCLE.length] ?? 'MISMATCH',
      ),
    ),
  );

  // Two waiting payments reuse the reference of an earlier one (the newest one, and one more).
  const first = list[0];
  const fourth = list[3];
  const eighth = list[7];
  const firstApproved = list[PENDING_AGO_MIN.length];
  if (first && fourth) first.reference = fourth.reference;
  if (eighth && firstApproved) eighth.reference = firstApproved.reference;

  list.sort((a, b) => a.createdAtMs - b.createdAtMs);
  list.forEach((record, i) => {
    record.id = `PAY-${1001 + i}`;
    payments.push(record);
  });
}

// ---------- reads ----------

const iso = (ms: number): string => new Date(ms).toISOString();

/** The earliest other payment that used the same reference before this one was submitted. */
function duplicateOf(record: PaymentRecord): string | null {
  const key = referenceKey(record.reference);
  const earlier = payments
    .filter(
      (other) =>
        other !== record &&
        other.createdAtMs < record.createdAtMs &&
        referenceKey(other.reference) === key,
    )
    .sort((a, b) => a.createdAtMs - b.createdAtMs)[0];
  return earlier?.id ?? null;
}

function toPayment(record: PaymentRecord): AdminPayment {
  return {
    id: record.id,
    studentId: record.studentId,
    studentName: record.studentName,
    universityShortName: universityById(record.universityId)?.shortName ?? record.universityId,
    type: record.type,
    stream: record.stream,
    courses: record.courseIds.map((courseId) => {
      const course = courseById(courseId);
      return { courseId, code: course?.code ?? courseId, title: course?.title ?? courseId };
    }),
    amount: record.amount,
    method: record.method,
    reference: record.reference,
    status: record.status,
    rejectReason: record.rejectReason,
    createdAt: iso(record.createdAtMs),
    decidedAt: record.decidedAtMs === null ? null : iso(record.decidedAtMs),
    durationDays: record.durationDays,
    duplicateOf: duplicateOf(record),
    imageKey: null,
    imageUrl: null,
    imageMime: null,
    imageSizeBytes: null,
  };
}

export function paymentCounts(): PaymentCounts {
  ensureSeed();
  const count = (status: OrderStatus) => payments.filter((p) => p.status === status).length;
  return { pending: count('PENDING'), approved: count('APPROVED'), rejected: count('REJECTED') };
}

/** Numbers for the dashboard: waiting payments and how many of them reuse a reference. */
export function paymentStats(): { pending: number; duplicateReferences: number } {
  ensureSeed();
  const waiting = payments.filter((p) => p.status === 'PENDING');
  return {
    pending: waiting.length,
    duplicateReferences: waiting.filter((p) => duplicateOf(p) !== null).length,
  };
}

export function listPayments(rawQuery: PaymentListQuery): PaymentListResult {
  ensureSeed();
  const query = paymentListQuerySchema.parse(rawQuery);
  const needle = query.q?.trim().toLowerCase();
  const rows = payments
    .filter((record) => {
      if (record.status !== query.status) return false;
      if (query.method && record.method !== query.method) return false;
      if (!needle) return true;
      return `${record.id} ${record.studentId} ${record.studentName} ${record.reference}`
        .toLowerCase()
        .includes(needle);
    })
    .sort((a, b) => b.createdAtMs - a.createdAtMs);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAYMENTS_PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  const start = (page - 1) * PAYMENTS_PAGE_SIZE;
  return {
    items: rows.slice(start, start + PAYMENTS_PAGE_SIZE).map(toPayment),
    total: rows.length,
    page,
    pageCount,
    counts: paymentCounts(),
  };
}

export function getPayment(id: string): AdminPayment {
  ensureSeed();
  const record = payments.find((item) => item.id === id);
  if (!record) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  return toPayment(record);
}

// ---------- writes (the server rules; the mock API adds the audit entry) ----------

/** Approving unlocks the courses for the order's days; rejecting returns waiting courses to the trial. */
export function decidePayment(
  id: string,
  decision: PaymentDecision,
  now = Date.now(),
): AdminPayment {
  ensureSeed();
  const record = payments.find((item) => item.id === id);
  if (!record) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  if (!canDecide(record.status)) throw new ApiError(ADMIN_ERROR_CODES.INVALID_STATE);

  if (decision.action === 'APPROVE') {
    unlockStudentCourses(record.studentId, record.courseIds, record.durationDays, now);
    record.status = 'APPROVED';
  } else {
    releasePendingCourses(record.studentId, record.courseIds);
    record.status = 'REJECTED';
    record.rejectReason = decision.reason;
  }
  record.decidedAtMs = now;
  return toPayment(record);
}

export interface StudentPaymentSummaryItem {
  id: string;
  studentId: string;
  studentName: string;
  universityShortName: string;
  type: ProductType;
  amount: number;
  method: PaymentMethod;
  reference: string;
  status: OrderStatus;
  date: string;
}

export interface StudentBirrStats {
  totalBirrPaid: number;
  approvedCount: number;
  pendingBirr: number;
  pendingCount: number;
  rejectedCount: number;
  totalOrdersCount: number;
  averageBirrPerStudent: number;
  methodBreakdown: {
    telebirr: { count: number; totalBirr: number };
    cbeMobile: { count: number; totalBirr: number };
    cbeBirr: { count: number; totalBirr: number };
  };
  productBreakdown: {
    bundle: { count: number; totalBirr: number };
    single: { count: number; totalBirr: number };
    fullStream: { count: number; totalBirr: number };
    fullBoth: { count: number; totalBirr: number };
  };
  paidStudentsList: StudentPaymentSummaryItem[];
}

/**
 * Counts all Birr paid by students across all approved orders in the system,
 * including counts, pending sums, breakdown by payment method and student breakdown.
 */
export function studentBirrRevenueStats(): StudentBirrStats {
  ensureSeed();
  let totalBirrPaid = 0;
  let approvedCount = 0;
  let pendingBirr = 0;
  let pendingCount = 0;
  let rejectedCount = 0;

  const methodBreakdown = {
    telebirr: { count: 0, totalBirr: 0 },
    cbeMobile: { count: 0, totalBirr: 0 },
    cbeBirr: { count: 0, totalBirr: 0 },
  };

  const productBreakdown = {
    bundle: { count: 0, totalBirr: 0 },
    single: { count: 0, totalBirr: 0 },
    fullStream: { count: 0, totalBirr: 0 },
    fullBoth: { count: 0, totalBirr: 0 },
  };

  const paidStudentsList: StudentPaymentSummaryItem[] = [];

  for (const record of payments) {
    if (record.status === 'APPROVED') {
      totalBirrPaid += record.amount;
      approvedCount += 1;

      if (record.method === 'TELEBIRR') {
        methodBreakdown.telebirr.count += 1;
        methodBreakdown.telebirr.totalBirr += record.amount;
      } else if (record.method === 'CBE_MOBILE') {
        methodBreakdown.cbeMobile.count += 1;
        methodBreakdown.cbeMobile.totalBirr += record.amount;
      } else if (record.method === 'CBE_BIRR') {
        methodBreakdown.cbeBirr.count += 1;
        methodBreakdown.cbeBirr.totalBirr += record.amount;
      }

      if (record.type === 'BUNDLE') {
        productBreakdown.bundle.count += 1;
        productBreakdown.bundle.totalBirr += record.amount;
      } else if (record.type === 'SINGLE') {
        productBreakdown.single.count += 1;
        productBreakdown.single.totalBirr += record.amount;
      } else if (record.type === 'FULL_STREAM') {
        productBreakdown.fullStream.count += 1;
        productBreakdown.fullStream.totalBirr += record.amount;
      } else if (record.type === 'FULL_BOTH') {
        productBreakdown.fullBoth.count += 1;
        productBreakdown.fullBoth.totalBirr += record.amount;
      }

      paidStudentsList.push({
        id: record.id,
        studentId: record.studentId,
        studentName: record.studentName,
        universityShortName: universityById(record.universityId)?.shortName ?? record.universityId,
        type: record.type,
        amount: record.amount,
        method: record.method,
        reference: record.reference,
        status: record.status,
        date: iso(record.decidedAtMs ?? record.createdAtMs),
      });
    } else if (record.status === 'PENDING') {
      pendingBirr += record.amount;
      pendingCount += 1;
    } else if (record.status === 'REJECTED') {
      rejectedCount += 1;
    }
  }

  paidStudentsList.sort((a, b) => (b.date > a.date ? 1 : -1));

  return {
    totalBirrPaid,
    approvedCount,
    pendingBirr,
    pendingCount,
    rejectedCount,
    totalOrdersCount: payments.length,
    averageBirrPerStudent: approvedCount > 0 ? Math.round(totalBirrPaid / approvedCount) : 0,
    methodBreakdown,
    productBreakdown,
    paidStudentsList,
  };
}


