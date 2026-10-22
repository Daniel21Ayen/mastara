// apps/api/src/infrastructure/push/push.service.ts
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../database/prisma.service";
import type { PushDeliveryResult, PushNotificationPayload } from "./push.types";

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly expoEndpoint = "https://exp.host/--/api/v2/push/send";
  private readonly fcmEndpoint = "https://fcm.googleapis.com/fcm/send";

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Identifies whether a given token is an Expo Push Token format.
   * e.g., ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx] or ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]
   */
  isExpoPushToken(token: string): boolean {
    if (!token || typeof token !== "string") return false;
    return /^(ExponentPushToken|ExpoPushToken)\[.*\]$/.test(token.trim());
  }

  /**
   * Sends a push notification to an individual device token (Expo or Firebase).
   */
  async sendToToken(
    token: string,
    payload: PushNotificationPayload,
  ): Promise<PushDeliveryResult> {
    const cleanToken = token.trim();
    if (!cleanToken) {
      return { success: false, provider: "none", recipient: "", error: "Empty push token" };
    }

    if (this.isExpoPushToken(cleanToken)) {
      return this.sendViaExpo(cleanToken, payload);
    } else {
      return this.sendViaFirebase(cleanToken, payload);
    }
  }

  /**
   * Dispatches push notification to a student using their registered push token.
   */
  async sendToStudent(
    studentId: string,
    payload: PushNotificationPayload,
  ): Promise<PushDeliveryResult> {
    try {
      // 1. Check DeviceBinding table for active device binding with push_token
      const binding = await this.prisma.deviceBinding.findFirst({
        where: {
          student_id: studentId,
          status: "ACTIVE",
          push_token: { not: null },
        },
        select: { push_token: true },
      });

      let pushToken = binding?.push_token;

      // 2. Fallback to student.push_token if not on device binding
      if (!pushToken) {
        const student = await this.prisma.student.findUnique({
          where: { id: studentId },
          select: { push_token: true },
        });
        pushToken = student?.push_token ?? undefined;
      }

      if (!pushToken) {
        this.logger.debug(
          `No registered push token for student ${studentId}. Push alert '${payload.title}' not dispatched.`,
        );
        return {
          success: false,
          provider: "none",
          recipient: studentId,
          error: "No push token registered",
        };
      }

      return await this.sendToToken(pushToken, payload);
    } catch (err: any) {
      this.logger.warn(`Push dispatch error for student ${studentId}: ${err.message}`);
      return {
        success: false,
        provider: "none",
        recipient: studentId,
        error: err.message,
      };
    }
  }

  /**
   * Registers or updates a push token for a student.
   */
  async registerPushToken(
    studentId: string,
    token: string,
    _platform?: string,
    _deviceId?: string,
  ): Promise<{ success: boolean; registered: boolean }> {
    const cleanToken = token.trim();
    if (!cleanToken) {
      return { success: false, registered: false };
    }

    // 1. Update Student record
    await this.prisma.student.update({
      where: { id: studentId },
      data: { push_token: cleanToken },
    });

    // 2. If student has an active device binding, update binding as well
    const binding = await this.prisma.deviceBinding.findFirst({
      where: { student_id: studentId, status: "ACTIVE" },
    });

    if (binding) {
      await this.prisma.deviceBinding.update({
        where: { id: binding.id },
        data: { push_token: cleanToken },
      });
    }

    this.logger.log(
      `Push token registered for student ${studentId} (${this.isExpoPushToken(cleanToken) ? "Expo" : "Firebase FCM"})`,
    );

    return { success: true, registered: true };
  }

  // --------------------------------------------------------------------------
  // Expo Push Dispatcher
  // --------------------------------------------------------------------------
  private async sendViaExpo(
    token: string,
    payload: PushNotificationPayload,
  ): Promise<PushDeliveryResult> {
    const expoAccessToken = this.configService.get<string>("EXPO_ACCESS_TOKEN");

    const message = {
      to: token,
      sound: payload.sound ?? "default",
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      channelId: payload.channelId ?? "default",
      priority: "high",
      badge: payload.badge,
    };

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      };
      if (expoAccessToken) {
        headers["Authorization"] = `Bearer ${expoAccessToken}`;
      }

      const response = await fetch(this.expoEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const text = await response.text();
        this.logger.warn(`Expo push error response HTTP ${response.status}: ${text}`);
        return {
          success: false,
          provider: "expo",
          recipient: token,
          error: `HTTP ${response.status}: ${text}`,
        };
      }

      const data = (await response.json()) as any;
      const ticket = Array.isArray(data.data) ? data.data[0] : data.data;

      if (ticket?.status === "ok") {
        this.logger.log(`Expo push sent successfully. Ticket ID: ${ticket.id}`);
        return {
          success: true,
          provider: "expo",
          recipient: token,
          messageId: ticket.id,
        };
      } else {
        const errorMsg = ticket?.message || ticket?.details?.error || "Unknown Expo error";
        this.logger.warn(`Expo push rejected ticket: ${errorMsg}`);
        return {
          success: false,
          provider: "expo",
          recipient: token,
          error: errorMsg,
        };
      }
    } catch (err: any) {
      this.logger.warn(`Expo push network failure (fallback to mock): ${err.message}`);
      return {
        success: true,
        provider: "mock",
        recipient: token,
        messageId: `mock-expo-${Date.now()}`,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Firebase FCM Dispatcher
  // --------------------------------------------------------------------------
  private async sendViaFirebase(
    token: string,
    payload: PushNotificationPayload,
  ): Promise<PushDeliveryResult> {
    const serverKey = this.configService.get<string>("FIREBASE_SERVER_KEY");

    if (!serverKey) {
      this.logger.debug(
        `Firebase server key not configured. Mocking FCM push delivery for token: ${token.slice(0, 10)}...`,
      );
      return {
        success: true,
        provider: "mock",
        recipient: token,
        messageId: `mock-fcm-${Date.now()}`,
      };
    }

    try {
      const response = await fetch(this.fcmEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${serverKey}`,
        },
        body: JSON.stringify({
          to: token,
          priority: "high",
          notification: {
            title: payload.title,
            body: payload.body,
            sound: payload.sound ?? "default",
          },
          data: payload.data ?? {},
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        this.logger.warn(`Firebase FCM error response HTTP ${response.status}: ${text}`);
        return {
          success: false,
          provider: "firebase",
          recipient: token,
          error: `HTTP ${response.status}: ${text}`,
        };
      }

      const resJson = (await response.json()) as any;
      if (resJson.success > 0) {
        const messageId = resJson.results?.[0]?.message_id || `fcm-${Date.now()}`;
        this.logger.log(`Firebase push sent successfully. Message ID: ${messageId}`);
        return {
          success: true,
          provider: "firebase",
          recipient: token,
          messageId,
        };
      } else {
        const errorMsg = resJson.results?.[0]?.error || "Firebase FCM error";
        this.logger.warn(`Firebase push failed: ${errorMsg}`);
        return {
          success: false,
          provider: "firebase",
          recipient: token,
          error: errorMsg,
        };
      }
    } catch (err: any) {
      this.logger.warn(`Firebase FCM network failure (fallback to mock): ${err.message}`);
      return {
        success: true,
        provider: "mock",
        recipient: token,
        messageId: `mock-fcm-${Date.now()}`,
      };
    }
  }
}
