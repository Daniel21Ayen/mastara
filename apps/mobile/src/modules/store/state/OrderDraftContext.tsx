// apps/mobile/src/modules/store/state/OrderDraftContext.tsx
import type { OrderStream, ProductType } from '@mastara/domain';
import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/** What the student is about to buy. Shared by the Store screens (home, builder, checkout). */
export interface OrderDraft {
  type: ProductType;
  stream: OrderStream;
  /** Chosen courses for a bundle or single course. Empty for full packages. */
  courseIds: string[];
}

interface OrderDraftValue {
  draft: OrderDraft | null;
  setDraft: (draft: OrderDraft | null) => void;
}

const OrderDraftContext = createContext<OrderDraftValue | null>(null);

export function OrderDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<OrderDraft | null>(null);
  const value = useMemo(() => ({ draft, setDraft }), [draft]);
  return <OrderDraftContext.Provider value={value}>{children}</OrderDraftContext.Provider>;
}

export function useOrderDraft(): OrderDraftValue {
  const context = useContext(OrderDraftContext);
  if (!context) throw new Error('useOrderDraft must be used inside <OrderDraftProvider>');
  return context;
}
