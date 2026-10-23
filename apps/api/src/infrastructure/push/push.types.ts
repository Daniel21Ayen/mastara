// apps/api/src/infrastructure/push/push.types.ts

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
  badge?: number;
  channelId?: string;
}

export type PushProviderType = "expo" | "firebase" | "mock" | "none";

export interface PushDeliveryResult {
  success: boolean;
  provider: PushProviderType;
  recipient: string;
  messageId?: string;
  error?: string;
}
