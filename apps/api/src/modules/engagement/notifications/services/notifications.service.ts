import { Injectable, Logger, NotFoundException, Optional } from "@nestjs/common";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import {
  NotificationType,
  ProofStatus,
  Role,
  SecurityEventType,
  Stream,
  StudentStatus,
  TicketStatus,
} from "@mastara/database";
import { GetNotificationsQueryDto, SendBroadcastDto } from "../dto";
import { PushService } from "../../../../infrastructure/push/push.service";
import { AuditService } from "../../../platform/audit/services/audit.service";

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

export interface StudentBroadcastResponse {
  id: string;
  title: string;
  body: string;
  audience: string;
  priority: string;
  actionUrl?: string;
  sentAt: string;
  sentBy: string;
  recipientCount: number;
}

export interface AdminNotificationResponse {
  id: string;
  type: "PAYMENT" | "STUDENT" | "EXAM" | "SYSTEM" | "SECURITY";
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  linkHref?: string;
  actionLabel?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly readAdminNotifIds = new Set<string>();
  private readonly clearedAdminNotifIds = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Optional() private readonly pushService?: PushService,
  ) {}

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
  // Admin Broadcast Operations (FR-118, FR-153)
  // --------------------------------------------------------------------------

  async listBroadcasts(): Promise<StudentBroadcastResponse[]> {
    const broadcasts = await this.prisma.broadcast.findMany({
      orderBy: { created_at: "desc" },
    });

    return broadcasts.map((b) => ({
      id: b.id,
      title: b.title,
      body: b.body,
      audience: b.audience,
      priority: b.priority,
      actionUrl: b.action_url || undefined,
      sentAt: b.created_at.toISOString(),
      sentBy: b.sent_by,
      recipientCount: b.recipient_count,
    }));
  }

  async sendBroadcast(
    adminId: string,
    adminName: string,
    dto: SendBroadcastDto,
  ): Promise<StudentBroadcastResponse> {
    const studentWhere: any = {
      role: Role.STUDENT,
      status: StudentStatus.ACTIVE,
    };

    if (dto.audience === "NATURAL_SCIENCE") {
      studentWhere.stream_pref = Stream.NATURAL;
    } else if (dto.audience === "SOCIAL_SCIENCE") {
      studentWhere.stream_pref = Stream.SOCIAL;
    } else if (dto.audience !== "ALL") {
      studentWhere.university = { code: dto.audience };
    }

    const students = await this.prisma.student.findMany({
      where: studentWhere,
      select: { id: true, push_token: true },
    });

    const broadcast = await this.prisma.broadcast.create({
      data: {
        title: dto.title.trim(),
        body: dto.body.trim(),
        audience: dto.audience,
        priority: dto.priority,
        action_url: dto.actionUrl?.trim() || null,
        sent_by: adminName || "Admin (System)",
        recipient_count: students.length,
      },
    });

    if (students.length > 0) {
      await this.prisma.notification.createMany({
        data: students.map((s) => ({
          student_id: s.id,
          type: NotificationType.SYSTEM_ANNOUNCEMENT,
          title_en: dto.title.trim(),
          title_am: dto.title.trim(),
          message_en: dto.body.trim(),
          message_am: dto.body.trim(),
          data: {
            broadcastId: broadcast.id,
            audience: dto.audience,
            priority: dto.priority,
            actionUrl: dto.actionUrl || "",
          },
        })),
      });
    }

    if (this.pushService) {
      for (const student of students) {
        if (student.push_token) {
          void this.pushService
            .sendToToken(student.push_token, {
              title: dto.title.trim(),
              body: dto.body.trim(),
              data: {
                type: "SYSTEM_ANNOUNCEMENT",
                broadcastId: broadcast.id,
                actionUrl: dto.actionUrl || "",
              },
              channelId: "default",
            })
            .catch((err: any) =>
              this.logger.warn(`Push to student ${student.id} failed: ${err?.message || err}`),
            );
        }
      }
    }

    await this.auditService.log({
      actorId: adminId,
      actorRole: Role.ADMIN,
      action: "ANNOUNCEMENT_SENT",
      targetType: "Broadcast",
      targetId: broadcast.id,
      metadata: {
        title: broadcast.title,
        audience: broadcast.audience,
        priority: broadcast.priority,
        recipientCount: students.length,
      },
    });

    return {
      id: broadcast.id,
      title: broadcast.title,
      body: broadcast.body,
      audience: broadcast.audience,
      priority: broadcast.priority,
      actionUrl: broadcast.action_url || undefined,
      sentAt: broadcast.created_at.toISOString(),
      sentBy: broadcast.sent_by,
      recipientCount: broadcast.recipient_count,
    };
  }

  // --------------------------------------------------------------------------
  // Admin System Notifications & Operational Alerts
  // --------------------------------------------------------------------------

  async getAdminNotifications(): Promise<AdminNotificationResponse[]> {
    const items: AdminNotificationResponse[] = [];

    // 1. Pending payment proofs
    const pendingPayments = await this.prisma.paymentProof.findMany({
      where: { status: ProofStatus.PENDING },
      include: { order: { include: { student: true } } },
      take: 8,
      orderBy: { created_at: "desc" },
    });
    for (const p of pendingPayments) {
      const id = `payment-${p.id}`;
      if (this.clearedAdminNotifIds.has(id)) continue;
      const studentName = p.order?.student
        ? `${p.order.student.first_name} ${p.order.student.last_name}`.trim()
        : "Student";
      const amount = p.order?.quoted_amount ?? 200;
      const method = p.method === "TELEBIRR" ? "Telebirr" : "CBE Mobile";
      items.push({
        id,
        type: "PAYMENT",
        title: "New Student Payment",
        description: `${studentName} submitted ETB ${amount} for bundle via ${method} (Ref: ${p.transaction_reference}).`,
        timestamp: this._timeAgo(p.created_at),
        read: this.readAdminNotifIds.has(id),
        linkHref: "/commerce/payments",
        actionLabel: "Review Payment",
      });
    }

    // 2. Open support tickets
    const openTickets = await this.prisma.supportTicket.findMany({
      where: { status: TicketStatus.OPEN },
      include: { student: true },
      take: 8,
      orderBy: { updated_at: "desc" },
    });
    for (const t of openTickets) {
      const id = `ticket-${t.id}`;
      if (this.clearedAdminNotifIds.has(id)) continue;
      const studentName = t.student
        ? `${t.student.first_name} ${t.student.last_name}`.trim()
        : "Student";
      items.push({
        id,
        type: "STUDENT",
        title: "Support Ticket Waiting",
        description: `${studentName}: "${t.subject}"`,
        timestamp: this._timeAgo(t.updated_at),
        read: this.readAdminNotifIds.has(id),
        linkHref: "/support",
        actionLabel: "Open Ticket",
      });
    }

    // 3. Security logs (device mismatches / revocations)
    const securityLogs = await this.prisma.securityEventLog.findMany({
      where: {
        event_type: { in: [SecurityEventType.DEVICE_MISMATCH, SecurityEventType.DEVICE_REVOKED] },
      },
      include: { student: true },
      take: 5,
      orderBy: { created_at: "desc" },
    });
    for (const s of securityLogs) {
      const id = `security-${s.id}`;
      if (this.clearedAdminNotifIds.has(id)) continue;
      const studentName = s.student
        ? `${s.student.first_name} ${s.student.last_name}`.trim()
        : "Student";
      items.push({
        id,
        type: "SECURITY",
        title: "Device Security Alert",
        description: `${studentName}: ${
          s.event_type === SecurityEventType.DEVICE_MISMATCH
            ? "Device limit reached or mismatch detected"
            : "Device binding revoked"
        }`,
        timestamp: this._timeAgo(s.created_at),
        read: this.readAdminNotifIds.has(id),
        linkHref: "/audit",
        actionLabel: "Audit Trail",
      });
    }

    // 4. Standby system fallback if nothing pending
    if (items.length === 0) {
      items.push({
        id: "sys-operational",
        type: "SYSTEM",
        title: "Platform Systems Operational",
        description: "Payment queues, push notification services, and sync endpoints operating normally.",
        timestamp: "Just now",
        read: true,
        linkHref: "/dashboard",
        actionLabel: "Dashboard",
      });
    }

    return items;
  }

  async markAdminNotificationRead(id: string): Promise<AdminNotificationResponse[]> {
    this.readAdminNotifIds.add(id);
    return this.getAdminNotifications();
  }

  async markAllAdminNotificationsRead(): Promise<AdminNotificationResponse[]> {
    const list = await this.getAdminNotifications();
    for (const item of list) {
      this.readAdminNotifIds.add(item.id);
    }
    return this.getAdminNotifications();
  }

  async removeAdminNotification(id: string): Promise<AdminNotificationResponse[]> {
    this.clearedAdminNotifIds.add(id);
    return this.getAdminNotifications();
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private _timeAgo(date: Date): string {
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

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

