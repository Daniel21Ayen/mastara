import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import { NotificationType } from "@mastara/database";
import { GetNotificationsQueryDto } from "../dto";

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  titleEn: string;
  titleAm: string;
  messageEn: string;
  messageAm: string;
  isRead: boolean;
  data: Record<string, unknown> | null;
  createdAt: Date;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns notifications for the student, newest first.
   * Optionally filtered to unread only with a configurable limit.
   */
  async getStudentNotifications(
    studentId: string,
    query: GetNotificationsQueryDto,
  ): Promise<NotificationResponse[]> {
    const limit = query.limit ?? 30;

    const notifications = await this.prisma.notification.findMany({
      where: {
        student_id: studentId,
        ...(query.unreadOnly ? { is_read: false } : {}),
      },
      orderBy: { created_at: "desc" },
      take: limit,
    });

    return notifications.map((n) => this._mapNotification(n));
  }

  /**
   * Marks a single notification as read. Verifies ownership.
   */
  async markAsRead(
    studentId: string,
    notificationId: string,
  ): Promise<NotificationResponse> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification not found with ID ${notificationId}`);
    }
    if (notification.student_id !== studentId) {
      throw new NotFoundException(`Notification not found with ID ${notificationId}`);
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { is_read: true },
    });

    return this._mapNotification(updated);
  }

  /**
   * Marks ALL unread notifications as read for the student in one shot.
   */
  async markAllAsRead(studentId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { student_id: studentId, is_read: false },
      data: { is_read: true },
    });
    return { count: result.count };
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private _mapNotification(n: any): NotificationResponse {
    return {
      id: n.id,
      type: n.type,
      titleEn: n.title_en,
      titleAm: n.title_am,
      messageEn: n.message_en,
      messageAm: n.message_am,
      isRead: n.is_read,
      data: n.data ?? null,
      createdAt: n.created_at,
    };
  }
}
