// apps/mobile/src/modules/store/sync/PaymentApprovalProvider.tsx
import type { Order } from '@mastara/contracts';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';

import { invalidateCache } from '@/core/db';
import { useI18n } from '@/core/i18n';
import { useOnline } from '@/core/network';
import { useSession } from '@/core/session';
import { pushNotificationService } from '@/modules/notifications/services/pushNotifications';
import { storeApi } from '../api/store.api';
import { PaymentNotificationBanner } from '../components/PaymentNotificationBanner';
import type { PaymentBannerProps } from '../components/PaymentNotificationBanner';
import { processPendingClaims } from '../services/claimService';

interface PaymentApprovalContextValue {
  isPolling: boolean;
  lastApprovedOrder: Order | null;
  lastRejectedOrder: Order | null;
  checkNow: () => Promise<void>;
  subscribeApproval: (listener: (order: Order) => void) => () => void;
}

const PaymentApprovalContext = createContext<PaymentApprovalContextValue | null>(null);

const POLL_INTERVAL_PENDING = 4000;
const POLL_INTERVAL_IDLE = 30000;

export function PaymentApprovalProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { t } = useI18n();
  const online = useOnline();
  const { user, profile, saveProfile, updateUser } = useSession();

  const [isPolling, setIsPolling] = useState(false);
  const [lastApprovedOrder, setLastApprovedOrder] = useState<Order | null>(null);
  const [lastRejectedOrder, setLastRejectedOrder] = useState<Order | null>(null);
  const [banner, setBanner] = useState<Omit<PaymentBannerProps, 'onDismiss'> | null>(null);

  const listenersRef = useRef<Set<(order: Order) => void>>(new Set());
  const knownStatusesRef = useRef<Map<string, Order['status']>>(new Map());
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const subscribeApproval = useCallback((listener: (order: Order) => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const dismissBanner = useCallback(() => {
    if (bannerTimerRef.current) {
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = null;
    }
    setBanner(null);
  }, []);

  const triggerApprovalBanner = useCallback(
    (order: Order) => {
      dismissBanner();
      const title = t('notif.PAYMENT_APPROVED.title');
      const message = t('notif.PAYMENT_APPROVED.body', {
        days: order.durationDays ?? 120,
      });

      setBanner({
        type: 'APPROVED',
        title,
        message,
        actionLabel: t('profile.myCourses'),
        onAction: () => {
          dismissBanner();
          router.push('/my-courses' as Href);
        },
      });

      void pushNotificationService.notifyPaymentEvent(
        { title, body: message, data: { orderId: order.id } },
        () => router.push('/my-courses' as Href),
      );

      bannerTimerRef.current = setTimeout(dismissBanner, 10000);
    },
    [t, dismissBanner, router],
  );

  const triggerRejectionBanner = useCallback(
    (order: Order) => {
      dismissBanner();
      const reasonKey = order.rejectReason
        ? `orders.reason.${order.rejectReason}`
        : 'orders.reason.MISMATCH';
      const reasonText = t(reasonKey as any);
      const title = t('notif.PAYMENT_REJECTED.title');
      const message = t('notif.PAYMENT_REJECTED.body', { reason: reasonText });

      setBanner({
        type: 'REJECTED',
        title,
        message,
        actionLabel: t('orders.title'),
        onAction: () => {
          dismissBanner();
          router.push('/store/orders' as Href);
        },
      });

      void pushNotificationService.notifyPaymentEvent(
        { title, body: message, data: { orderId: order.id } },
        () => router.push('/store/orders' as Href),
      );

      bannerTimerRef.current = setTimeout(dismissBanner, 10000);
    },
    [t, dismissBanner, router],
  );

  const checkNow = useCallback(async () => {
    if (!user || !online) return;

    try {
      setIsPolling(true);

      // Check and claim any pending offline-order approvals (REG-10, REG-12, REG-14)
      const { claimed, pendingCount } = await processPendingClaims((result) => {
        updateUser({ ...user, id: result.studentCode });
      });

      if (claimed.length > 0) {
        await invalidateCache('my-courses');
        await invalidateCache('store');
        await invalidateCache('notifications');

        for (const claimItem of claimed) {
          const dummyOrder: Order = {
            id: claimItem.orderId,
            type: 'BUNDLE',
            stream: 'NATURAL',
            courseIds: profile?.courseIds || [],
            method: 'CBE_MOBILE',
            reference: '',
            amount: 0,
            status: 'APPROVED',
            createdAt: new Date().toISOString(),
            durationDays: 120,
          };
          setLastApprovedOrder(dummyOrder);
          triggerApprovalBanner(dummyOrder);
          listenersRef.current.forEach((fn) => fn(dummyOrder));
        }
      }

      let orders: Order[] = [];
      try {
        orders = await storeApi.getOrders(user.id);
      } catch {
        orders = [];
      }
      let hasPending = pendingCount > 0;

      for (const order of orders) {
        const prevStatus = knownStatusesRef.current.get(order.id);

        if (order.status === 'PENDING') {
          hasPending = true;
        }

        // Detect transition from PENDING -> APPROVED
        if (prevStatus === 'PENDING' && order.status === 'APPROVED') {
          setLastApprovedOrder(order);

          // Invalidate caches so screens load fresh unlocked state
          await invalidateCache('my-courses');
          await invalidateCache('store');
          await invalidateCache('notifications');

          // Ensure profile courseIds includes newly unlocked courses
          if (profile && order.courseIds && order.courseIds.length > 0) {
            const currentIds = new Set(profile.courseIds);
            const needsUpdate = order.courseIds.some((cid) => !currentIds.has(cid));
            if (needsUpdate) {
              const combined = Array.from(new Set([...profile.courseIds, ...order.courseIds]));
              saveProfile({ ...profile, courseIds: combined });
            }
          }

          // Trigger in-app notification banner
          triggerApprovalBanner(order);

          // Broadcast to listeners
          listenersRef.current.forEach((fn) => fn(order));
        }

        // Detect transition from PENDING -> REJECTED
        if (prevStatus === 'PENDING' && order.status === 'REJECTED') {
          setLastRejectedOrder(order);
          await invalidateCache('store');
          await invalidateCache('notifications');
          triggerRejectionBanner(order);
          listenersRef.current.forEach((fn) => fn(order));
        }

        knownStatusesRef.current.set(order.id, order.status);
      }

      // Schedule next polling check
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      const interval = hasPending ? POLL_INTERVAL_PENDING : POLL_INTERVAL_IDLE;
      pollTimerRef.current = setTimeout(() => void checkNow(), interval);
    } catch (err) {
      // Gracefully continue on transient network errors
    } finally {
      setIsPolling(false);
    }
  }, [user, online, profile, saveProfile, updateUser, triggerApprovalBanner, triggerRejectionBanner]);

  // Initial check and periodic polling
  useEffect(() => {
    if (!user) {
      knownStatusesRef.current.clear();
      dismissBanner();
      return;
    }

    void checkNow();

    // Register push notification token with backend
    void pushNotificationService.registerForPushNotifications(user.id);

    // Setup push notification foreground and response handlers
    const cleanupPush = pushNotificationService.setupNotificationListeners(
      (notif) => {
        const data = notif.request?.content?.data as Record<string, unknown> | undefined;
        if (data?.type === 'PAYMENT_APPROVED' || data?.type === 'PAYMENT_REJECTED') {
          void checkNow();
        }
      },
      (res) => {
        const data = res.notification?.request?.content?.data as Record<string, unknown> | undefined;
        if (data?.type === 'PAYMENT_APPROVED') {
          void checkNow();
          router.push('/my-courses' as Href);
        } else if (data?.type === 'PAYMENT_REJECTED') {
          router.push('/store/orders' as Href);
        } else if (data?.type === 'EXAM_RESULT') {
          router.push('/(tabs)/progress' as Href);
        }
      },
    );

    // Check immediately when app comes into the foreground
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void checkNow();
      }
    });

    return () => {
      sub.remove();
      cleanupPush();
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [user, checkNow, dismissBanner, router]);

  const value = useMemo<PaymentApprovalContextValue>(
    () => ({
      isPolling,
      lastApprovedOrder,
      lastRejectedOrder,
      checkNow,
      subscribeApproval,
    }),
    [isPolling, lastApprovedOrder, lastRejectedOrder, checkNow, subscribeApproval],
  );

  return (
    <PaymentApprovalContext.Provider value={value}>
      {children}
      {banner ? (
        <PaymentNotificationBanner
          type={banner.type}
          title={banner.title}
          message={banner.message}
          actionLabel={banner.actionLabel}
          onAction={banner.onAction}
          onDismiss={dismissBanner}
        />
      ) : null}
    </PaymentApprovalContext.Provider>
  );
}

export function usePaymentApproval(): PaymentApprovalContextValue {
  const context = useContext(PaymentApprovalContext);
  if (!context) {
    throw new Error('usePaymentApproval must be used within PaymentApprovalProvider');
  }
  return context;
}

export function usePaymentApprovalSafe(): PaymentApprovalContextValue | null {
  return useContext(PaymentApprovalContext);
}
