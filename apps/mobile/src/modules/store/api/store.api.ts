// apps/mobile/src/modules/store/api/store.api.ts
import type { Course, CreateOrderInput, Order } from '@mastara/contracts';
import { ERROR_CODES, MAX_RECEIPT_BYTES } from '@mastara/domain';
import type { AccessState, OrderStream, PaymentMethod, PricingConfig, StudentStream } from '@mastara/domain';

import { cacheReads } from '@/core/db';
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

function mapToMobileOrder(res: any, fallbackInput?: CreateOrderInput): Order {
  return {
    id: res.id,
    type: res.type ?? fallbackInput?.type ?? 'SINGLE',
    stream: res.stream ?? fallbackInput?.stream ?? 'NATURAL',
    courseIds: res.items?.map((it: any) => it.courseId) ?? fallbackInput?.courseIds ?? [],
    method: res.method ?? fallbackInput?.method ?? 'CBE_MOBILE',
    reference: res.reference ?? fallbackInput?.reference ?? '',
    amount: res.quotedAmount ?? 0,
    status: res.status ?? 'PENDING',
    rejectReason: res.rejectReason,
    createdAt:
      typeof res.createdAt === 'string'
        ? res.createdAt
        : new Date(res.createdAt ?? Date.now()).toISOString(),
    durationDays: res.durationDays ?? 150,
  };
}

const realStoreApi: StoreApi = {
  async getPricing() {
    return httpClient.get<PricingConfig>('/commerce/pricing');
  },
  async getAccounts() {
    return httpClient.get<Record<PaymentMethod, string>>('/commerce/accounts');
  },
  async getBuyableCourses(semesterId, stream) {
    return httpClient.get<BuyableCourse[]>(
      `/commerce/courses/buyable?semesterId=${semesterId}&stream=${stream}`,
    );
  },
  async getFullPackageCourses(programId, stream) {
    return httpClient.get<Course[]>(
      `/commerce/courses/full-package?programId=${programId}&stream=${stream}`,
    );
  },
  async createOrder(_userId, input, receiptBytes) {
    if (receiptBytes > MAX_RECEIPT_BYTES) {
      throw new ApiError(ERROR_CODES.RECEIPT_TOO_LARGE);
    }
    const res = await httpClient.post<any>('/commerce/orders', input);
    return mapToMobileOrder(res, input);
  },
  async getOrders(_userId) {
    const list = await httpClient.get<any[]>('/commerce/orders');
    return list.map((res) => mapToMobileOrder(res));
  },
};

/** Reads are saved on the phone and used when it is offline; writes always need the server. */
export const storeApi = cacheReads('store', realStoreApi, [
  'getPricing',
  'getAccounts',
  'getBuyableCourses',
  'getFullPackageCourses',
  'getOrders',
]);
