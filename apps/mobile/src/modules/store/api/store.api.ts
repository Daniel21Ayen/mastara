// apps/mobile/src/modules/store/api/store.api.ts
import type { Course, CreateOrderInput, Order } from '@mastara/contracts';
import { canBuyCourse, ERROR_CODES, MAX_RECEIPT_BYTES, quoteOrder } from '@mastara/domain';
import type { AccessState, OrderStream, PaymentMethod, PricingConfig, StudentStream } from '@mastara/domain';

import { env } from '@/core/config/env';
import { cacheReads } from '@/core/db';
import {
  accessFor,
  ADMIN_ACCOUNTS,
  addOrder,
  courses,
  isReferenceUsed,
  listOrders,
  MOCK_PRICING,
} from '@/core/mock/data';
import { simulateLatency } from '@/core/mock/delay';
import { ApiError, httpClient } from '@/core/network';

export interface BuyableCourse {
  course: Course;
  access: AccessState;
  daysLeft?: number;
  /** False while the course is paid and not yet inside the renewal window. */
  buyable: boolean;
}

export interface StoreApi {
  /** Live prices, bundle size limits and access durations (set by the Admin). */
  getPricing(): Promise<PricingConfig>;
  /** Account numbers to pay to, per payment method (set by the Admin). */
  getAccounts(): Promise<Record<PaymentMethod, string>>;
  /** Courses of a semester for one stream (plus Common), with ownership. */
  getBuyableCourses(semesterId: string, stream: StudentStream): Promise<BuyableCourse[]>;
  /** Every course a full package unlocks: all freshman semesters of the program. */
  getFullPackageCourses(programId: string, stream: OrderStream): Promise<Course[]>;
  /** The server recomputes the price; the amount on the returned order is the one charged. */
  createOrder(userId: string, input: CreateOrderInput, receiptBytes: number): Promise<Order>;
  getOrders(userId: string): Promise<Order[]>;
}

function mapOrder(res: any): Order {
  return {
    id: res.id,
    type: res.type,
    stream: (res.stream ?? 'NATURAL') as Order['stream'],
    courseIds: Array.isArray(res.items) ? res.items.map((i: any) => i.courseId) : (res.courseIds ?? []),
    method: res.method ?? 'CBE_MOBILE',
    reference: res.reference ?? '',
    amount: res.quotedAmount ?? res.amount ?? 0,
    status: res.status,
    rejectReason: res.rejectReason,
    createdAt: typeof res.createdAt === 'string' ? res.createdAt : new Date(res.createdAt).toISOString(),
    durationDays: res.durationDays ?? 120,
  };
}

export const realStoreApi: StoreApi = {
  async getPricing() {
    return httpClient.get<PricingConfig>('/commerce/pricing');
  },
  async getAccounts() {
    return httpClient.get<Record<PaymentMethod, string>>('/commerce/accounts');
  },
  async getBuyableCourses(semesterId, stream) {
    const list = await httpClient.get<Array<{
      course: { id: string; semesterId: string; code: string; title: { en: string; am: string } | string; stream: any };
      access: AccessState;
      daysLeft?: number;
      buyable: boolean;
    }>>(`/commerce/courses/buyable?semesterId=${encodeURIComponent(semesterId)}&stream=${encodeURIComponent(stream)}`);

    return (list ?? []).map((item) => ({
      course: {
        id: item.course.id,
        semesterId: item.course.semesterId,
        code: item.course.code,
        title: typeof item.course.title === 'object' ? item.course.title.en : item.course.title,
        stream: item.course.stream,
      },
      access: item.access,
      daysLeft: item.daysLeft,
      buyable: item.buyable,
    }));
  },
  async getFullPackageCourses(programId, stream) {
    const list = await httpClient.get<Array<{
      id: string;
      semesterId: string;
      code: string;
      title: { en: string; am: string } | string;
      stream: any;
    }>>(`/commerce/courses/full-package?programId=${encodeURIComponent(programId)}&stream=${encodeURIComponent(stream)}`);

    return (list ?? []).map((item) => ({
      id: item.id,
      semesterId: item.semesterId,
      code: item.code,
      title: typeof item.title === 'object' ? item.title.en : item.title,
      stream: item.stream,
    }));
  },
  async createOrder(_userId, input, receiptBytes) {
    if (receiptBytes > MAX_RECEIPT_BYTES) throw new ApiError(ERROR_CODES.RECEIPT_TOO_LARGE);
    const res = await httpClient.post<any>('/commerce/orders', {
      type: input.type,
      stream: input.stream === 'BOTH' ? 'NATURAL' : input.stream,
      programId: input.programId,
      courseIds: input.courseIds,
      method: input.method,
      reference: input.reference.trim(),
    });
    return mapOrder(res);
  },
  async getOrders(_userId) {
    const list = await httpClient.get<any[]>('/commerce/orders');
    return (list ?? []).map(mapOrder);
  },
};

function inStream(course: Course, stream: OrderStream): boolean {
  return stream === 'BOTH' || course.stream === 'COMMON' || course.stream === stream;
}

function fullPackageCourses(programId: string, stream: OrderStream): Course[] {
  return courses.filter((course) => course.semesterId.startsWith(`${programId}-s`) && inStream(course, stream));
}

const mockStoreApi: StoreApi = {
  async getPricing() {
    await simulateLatency(100);
    return MOCK_PRICING;
  },
  async getAccounts() {
    await simulateLatency(100);
    return ADMIN_ACCOUNTS;
  },
  async getBuyableCourses(semesterId, stream) {
    await simulateLatency(150);
    return courses
      .filter((course) => course.semesterId === semesterId && inStream(course, stream))
      .map((course) => {
        const { access, daysLeft } = accessFor(course.id);
        return { course, access, daysLeft, buyable: canBuyCourse(access, daysLeft) };
      });
  },
  async getFullPackageCourses(programId, stream) {
    await simulateLatency(100);
    return fullPackageCourses(programId, stream);
  },
  async createOrder(userId, input, receiptBytes) {
    await simulateLatency(400);

    if (receiptBytes > MAX_RECEIPT_BYTES) throw new ApiError(ERROR_CODES.RECEIPT_TOO_LARGE);
    if (isReferenceUsed(input.reference)) throw new ApiError(ERROR_CODES.TRANSACTION_REFERENCE_DUPLICATE);

    const isFull = input.type === 'FULL_STREAM' || input.type === 'FULL_BOTH';
    const covered = isFull ? fullPackageCourses(input.programId ?? '', input.stream).map((course) => course.id) : input.courseIds;

    const quote = quoteOrder(
      MOCK_PRICING,
      input.type === 'BUNDLE' ? { type: 'BUNDLE', courseCount: covered.length } : { type: input.type },
    );
    if (!quote.ok || (input.type === 'SINGLE' && covered.length !== 1)) {
      throw new ApiError(ERROR_CODES.BUNDLE_COUNT_INVALID);
    }

    return addOrder(userId, {
      type: input.type,
      stream: input.stream,
      courseIds: covered,
      method: input.method,
      reference: input.reference.trim(),
      amount: quote.quote.total,
      durationDays: MOCK_PRICING.durationDays[input.type],
    });
  },
  async getOrders(userId) {
    await simulateLatency(100);
    return listOrders(userId);
  },
};

const baseApi: StoreApi = env.useMocks ? mockStoreApi : realStoreApi;

/** Reads are saved on the phone and used when it is offline; writes always need the server. */
export const storeApi = cacheReads('store', baseApi, ['getPricing', 'getAccounts', 'getBuyableCourses', 'getFullPackageCourses', 'getOrders']);
