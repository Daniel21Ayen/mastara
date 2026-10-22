// apps/mobile/src/modules/notifications/services/pushNotifications.ts
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

import { env } from '@/core/config/env';
import { httpClient } from '@/core/network';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// Configure foreground notification handling
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Push notifications service.
 * Handles Expo push token registration, notification channels, and alert dispatch.
 */
export const pushNotificationService = {
  /**
   * Register push notification token with backend if device and push service are available.
   */
  async registerForPushNotifications(userId?: string): Promise<string | null> {
    if (Platform.OS === 'web' || env.useMocks) {
      return null;
    }

    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'General',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2563EB',
        });
        await Notifications.setNotificationChannelAsync('payments', {
          name: 'Payments & Approvals',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
        });
        await Notifications.setNotificationChannelAsync('assessments', {
          name: 'Exam & Quiz Results',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
        });
      }

      if (!Device.isDevice) {
        // In emulators/simulators, push tokens cannot receive remote APNS/FCM notifications directly.
        // We register a dev token with the backend so API contracts work seamlessly.
        const devToken = `ExponentPushToken[dev-simulator-${userId || 'student'}]`;
        try {
          await httpClient.post('/notifications/push-token', {
            token: devToken,
            platform: Platform.OS,
          });
        } catch {
          // Non-blocking in dev
        }
        return devToken;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('[PushNotification] Push notification permission not granted');
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;

      // Register with Mastara backend API
      await httpClient.post('/notifications/push-token', {
        token,
        platform: Platform.OS,
      });

      console.log('[PushNotification] Registered push token with backend:', token);
      return token;
    } catch (err) {
      console.warn('[PushNotification] Registration error:', err);
      return null;
    }
  },

  /**
   * Set up listeners for foreground and background notification tap events.
   */
  setupNotificationListeners(
    onReceived?: (notification: Notifications.Notification) => void,
    onResponse?: (response: Notifications.NotificationResponse) => void,
  ): () => void {
    if (Platform.OS === 'web') return () => {};

    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      onReceived?.(notification);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      onResponse?.(response);
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  },

  /**
   * Schedule or display an immediate alert for important events (e.g. payment approved).
   */
  async notifyPaymentEvent(payload: PushNotificationPayload, onAction?: () => void): Promise<void> {
    if (Platform.OS === 'web') {
      return;
    }

    Alert.alert(payload.title, payload.body, [
      { text: 'Dismiss', style: 'cancel' },
      ...(onAction ? [{ text: 'View', onPress: onAction }] : []),
    ]);
  },
};
