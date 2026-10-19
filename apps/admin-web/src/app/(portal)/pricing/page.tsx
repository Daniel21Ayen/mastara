// apps/admin-web/src/app/(portal)/pricing/page.tsx
import type { Metadata } from 'next';

import { PricingScreen } from '@/modules/commerce';

export const metadata: Metadata = { title: 'Products & Pricing · Mastara Admin' };

export default function Page() {
  return <PricingScreen />;
}
