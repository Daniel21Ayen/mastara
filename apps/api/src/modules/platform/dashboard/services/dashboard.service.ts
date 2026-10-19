import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import { Role, StudentStatus, ProofStatus, EntitlementStatus, PublicationStatus, ScanJobStatus } from "@mastara/database";
import { DASHBOARD_TREND_DAYS, DASHBOARD_RECENT_LIMIT, RENEWAL_WINDOW_DAYS } from "@mastara/domain";
import { DashboardSummaryDto } from "../dto/dashboard-summary.dto";

function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSummary(): Promise<DashboardSummaryDto> {
    const now = new Date();
    const renewalWindowEnd = new Date(now.getTime() + RENEWAL_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    // 1. KPI Counts
    const [activeStudents, pendingPayments, activeEntitlements, expiringSoon] = await Promise.all([
      this.prisma.student.count({
        where: {
          role: Role.STUDENT,
          status: StudentStatus.ACTIVE,
        },
      }),
      this.prisma.paymentProof.count({
        where: {
          status: ProofStatus.PENDING,
        },
      }),
      this.prisma.entitlement.count({
        where: {
          status: EntitlementStatus.ACTIVE,
          expires_at: { gt: now },
        },
      }),
      this.prisma.entitlement.count({
        where: {
          status: EntitlementStatus.ACTIVE,
          expires_at: {
            gt: now,
            lte: renewalWindowEnd,
          },
        },
      }),
    ]);

    // 2. 7-day student registration trend
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - (DASHBOARD_TREND_DAYS - 1));
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentStudents = await this.prisma.student.findMany({
      where: {
        role: Role.STUDENT,
        created_at: { gte: sevenDaysAgo },
      },
      select: { created_at: true },
    });

    const countsByDay = new Map<string, number>();
    for (const student of recentStudents) {
      const day = isoDay(new Date(student.created_at));
      countsByDay.set(day, (countsByDay.get(day) ?? 0) + 1);
    }

    const newStudents = Array.from({ length: DASHBOARD_TREND_DAYS }).map((_, index) => {
      const d = new Date(sevenDaysAgo);
      d.setDate(sevenDaysAgo.getDate() + index);
      const dayKey = isoDay(d);
      return {
        date: dayKey,
        count: countsByDay.get(dayKey) ?? 0,
      };
    });

    // 3. Attention Panel
    const [draftCourses, draftModules, failedScanJobs] = await Promise.all([
      this.prisma.course.count({
        where: { status: PublicationStatus.DRAFT },
      }),
      this.prisma.module.count({
        where: { status: PublicationStatus.DRAFT },
      }),
      this.prisma.scanJob.count({
        where: { status: ScanJobStatus.FAILED },
      }),
    ]);

    // 4. Recent Audit Feed
    const rawAuditLogs = await this.prisma.auditLog.findMany({
      take: DASHBOARD_RECENT_LIMIT,
      orderBy: { created_at: "desc" },
    });

    const recentActivity = rawAuditLogs.map((log) => {
      const meta = (log.metadata as Record<string, unknown>) ?? {};
      const target =
        typeof meta.target === "string"
          ? meta.target
          : `${log.target_type} ${log.target_id.slice(0, 8)}`;
      const reason = typeof meta.reason === "string" ? meta.reason : undefined;

      return {
        id: log.id,
        at: log.created_at.toISOString(),
        actor: (log.actor_role === Role.ADMIN ? "ADMIN" : "SYSTEM") as "ADMIN" | "STUDENT" | "SYSTEM",
        action: log.action,
        target,
        reason,
      };
    });

    return {
      activeStudents,
      pendingPayments,
      activeEntitlements,
      expiringSoon,
      newStudents,
      attention: {
        paymentsWaiting: pendingPayments,
        duplicateReferences: 0,
        scanJobsFailed: failedScanJobs,
        contentInDraft: draftCourses + draftModules,
      },
      recentActivity,
    };
  }
}
