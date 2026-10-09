// apps/mobile/src/modules/store/api/store.api.ts
import type { Course, CreateOrderInput, Order } from '@mastara/contracts';
import { canBuyCourse, ERROR_CODES, MAX_RECEIPT_BYTES, quoteOrder } from '@mastara/domain';
import type { AccessState, OrderStream, PaymentMethod, PricingConfig, StudentStream } from '@mastara/domain';

import { env } from '@/core/config/env';
import { cacheReads } from '@/core/db';
import { ApiError } from '@/core/network';
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

function createStoreApi(): StoreApi {
  if (env.useMocks) return mockStoreApi;
  throw new Error('The real store API is added in the backend integration phase.');
}

/** Reads are saved on the phone and used when it is offline; writes always need the server. */
export const storeApi = cacheReads('store', createStoreApi(), ['getPricing', 'getAccounts', 'getBuyableCourses', 'getFullPackageCourses', 'getOrders']);
