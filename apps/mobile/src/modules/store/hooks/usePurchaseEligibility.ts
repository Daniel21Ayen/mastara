// apps/mobile/src/modules/store/hooks/usePurchaseEligibility.ts
import { isBundleProductType, canPurchaseSingleCourse, type EligibilityResult } from '@mastara/domain';
import { useMemo } from 'react';

import { useSession } from '@/core/session';
import { useOrders } from './useStoreData';

export interface PurchaseEligibility {
  hasActiveBundle: boolean;
  bundleCourseIds: string[];
  singleCoursesEnabled: boolean;
  canBuySingle: (courseId?: string) => EligibilityResult;
  isCourseInBundle: (courseId: string) => boolean;
}

export function usePurchaseEligibility(): PurchaseEligibility {
  const { user } = useSession();
  const { orders } = useOrders(user?.id);

  const isLocalAccount = !user?.id || !user.id.startsWith('MS');

  const { hasActiveBundle, bundleCourseIds } = useMemo(() => {
    if (isLocalAccount) {
      return { hasActiveBundle: false, bundleCourseIds: [] };
    }

    const bundleOrders = orders.filter(
      (order) => isBundleProductType(order.type) && order.status === 'APPROVED',
    );

    const hasBundle = bundleOrders.length > 0;
    const courseIds = Array.from(new Set(bundleOrders.flatMap((o) => o.courseIds || [])));

    return { hasActiveBundle: hasBundle, bundleCourseIds: courseIds };
  }, [isLocalAccount, orders]);

  const singleCoursesEnabled = true;

  const isCourseInBundle = (courseId: string): boolean => {
    return bundleCourseIds.includes(courseId);
  };

  const canBuySingle = (courseId?: string): EligibilityResult => {
    return canPurchaseSingleCourse({
      hasActiveBundle,
      isCourseInBundle: courseId ? isCourseInBundle(courseId) : false,
      singleCoursesEnabled,
    });
  };

  return {
    hasActiveBundle,
    bundleCourseIds,
    singleCoursesEnabled,
    canBuySingle,
    isCourseInBundle,
  };
}
