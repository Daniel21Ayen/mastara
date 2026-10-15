// packages/domain/src/payments/decision.ts
import type { OrderStatus } from '../constants/commerce';

/** Only a payment that is still waiting can be approved or rejected. */
export const canDecide = (status: OrderStatus): boolean => status === 'PENDING';

/** The reference to compare with other payments; the same normalising the student app uses. */
export { normalizeReference as referenceKey } from './reference';
