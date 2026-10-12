import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import { EntitlementStatus, NotificationType } from "@mastara/database";

const EXPIRY_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class ExpiryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExpiryService.name);
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    // Run immediately on start-up, then every hour
    void this.processExpiredEntitlements();
    this.intervalHandle = setInterval(
      () => void this.processExpiredEntitlements(),
      EXPIRY_INTERVAL_MS,
    );
    this.logger.log("Entitlement expiry job scheduled (every 1 hour)");
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  /**
   * Marks entitlements that passed their expiry date as EXPIRED and fires
   * ENTITLEMENT_EXPIRED notifications. Also warns students expiring within 3 days
   * with deduplication (one warning per 24 h window per student).
   */
  async processExpiredEntitlements(): Promise<void> {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    try {
      // 1. Expire overdue entitlements
      const expired = await this.prisma.entitlement.findMany({
        where: {
          status: EntitlementStatus.ACTIVE,
          expires_at: { lte: now },
        },
      });

      if (expired.length > 0) {
        await this.prisma.entitlement.updateMany({
          where: { id: { in: expired.map((e) => e.id) } },
          data: { status: EntitlementStatus.EXPIRED },
        });

        const studentIds = [...new Set(expired.map((e) => e.student_id))];
        for (const studentId of studentIds) {
          await this.prisma.notification.create({
            data: {
              student_id: studentId,
              type: NotificationType.ENTITLEMENT_EXPIRED,
              title_en: "Course Access Expired",
              title_am: "የኮርስ ፈቃዳ አልቋል",
              message_en:
                "One or more of your course subscriptions have expired. Renew now to keep learning.",
              message_am:
                "ከኮርሶቻቸው አንድ ወይም ከዚያ በላይ ፈቃዳቸው አልቋል። ትምህርቱን ለመቀጠል አሁን ያድሱ።",
            },
          });
        }

        this.logger.log(
          `Expired ${expired.length} entitlement(s) across ${studentIds.length} student(s)`,
        );
      }

      // 2. Warn students with entitlements expiring within 3 days
      const expiringSoon = await this.prisma.entitlement.findMany({
        where: {
          status: EntitlementStatus.ACTIVE,
          expires_at: { gt: now, lte: threeDaysFromNow },
        },
      });

      if (expiringSoon.length > 0) {
        const studentIds = [...new Set(expiringSoon.map((e) => e.student_id))];
        for (const studentId of studentIds) {
          const recentWarning = await this.prisma.notification.findFirst({
            where: {
              student_id: studentId,
              type: NotificationType.ENTITLEMENT_EXPIRING,
              created_at: {
                gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
              },
            },
          });

          if (!recentWarning) {
            await this.prisma.notification.create({
              data: {
                student_id: studentId,
                type: NotificationType.ENTITLEMENT_EXPIRING,
                title_en: "Course Access Expiring Soon",
                title_am: "የኮርስ ፈቃዳ ይቃረናል",
                message_en:
                  "One or more of your courses expire within 3 days. Renew to keep your progress.",
                message_am:
                  "ከኮርሶቻቸው አንድ ወይም ከዚያ በላይ ውስጥ 3 ቀናት ያልቃሉ። ወደፊት ለመቀጠል ያድሱ።",
              },
            });
          }
        }

        this.logger.log(
          `Checked expiry warnings for ${studentIds.length} student(s)`,
        );
      }
    } catch (err) {
      this.logger.error("Expiry job failed", err);
    }
  }
}
