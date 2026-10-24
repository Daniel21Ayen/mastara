import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import { Role } from "@mastara/database";
import {
  ATTENTION_AUDIT_ACTIONS,
  isAttentionAuditAction,
  type AuditAction,
  type AuditActor,
} from "@mastara/domain";
import { AuditEntryDto } from "../dto/audit-entry.dto";
import { QueryAuditLogsDto } from "../dto/query-audit-logs.dto";

export interface WriteAuditLogInput {
  actorId: string;
  actorRole: Role;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

const MAX_AUDIT_LOG_CAP = 500;

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Writes an immutable audit log entry.
   *
   * STORAGE PRESERVATION RULE:
   * To prevent database bloat on limited capacity storage, ONLY critical
   * actions requiring administrator attention (ATTENTION_AUDIT_ACTIONS) are
   * persisted to PostgreSQL. Routine operational actions (e.g., PAYMENT_APPROVED,
   * COURSE_CREATED, STUDENT_ADDED, normal logins) are immediately dropped.
   */
  async log(input: WriteAuditLogInput): Promise<void> {
    if (!isAttentionAuditAction(input.action)) {
      this.logger.debug(
        `[AuditService] Dropping routine audit log '${input.action}' to conserve database storage.`,
      );
      return;
    }

    try {
      await this.prisma.auditLog.create({
        data: {
          actor_id: input.actorId,
          actor_role: input.actorRole,
          action: input.action,
          target_type: input.targetType,
          target_id: input.targetId,
          metadata: (input.metadata ?? {}) as any,
          ip_address: input.ipAddress ?? null,
          user_agent: input.userAgent ?? null,
        },
      });

      // Storage preservation: prune oldest records if total count exceeds the ceiling
      await this.pruneExcessLogsIfNecessary();
    } catch (err) {
      this.logger.error(
        `Failed to write attention audit log [${input.action}] for ${input.actorId}`,
        err,
      );
    }
  }

  /**
   * Retrieves attention audit logs with filtering by actor, category, date range, and text query.
   */
  async getAttentionAuditLogs(params: Partial<QueryAuditLogsDto> = {}): Promise<AuditEntryDto[]> {
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
    const offset = Math.max(params.offset ?? 0, 0);

    const whereClause: any = {
      action: { in: [...ATTENTION_AUDIT_ACTIONS] },
    };

    // Filter by Actor role
    if (params.actor && params.actor !== "ALL") {
      if (params.actor === "ADMIN") {
        whereClause.actor_role = Role.ADMIN;
      } else if (params.actor === "STUDENT") {
        whereClause.actor_role = Role.STUDENT;
      }
    }

    // Filter by Action Group (category)
    if (params.actionGroup && params.actionGroup !== "ALL") {
      switch (params.actionGroup) {
        case "PAYMENTS":
          whereClause.action = "PAYMENT_REJECTED";
          break;
        case "SECURITY":
          whereClause.action = { in: ["DEVICE_REVOKED", "STUDENT_SUSPENDED"] };
          break;
        case "COMMERCE":
          whereClause.action = { in: ["PRICE_CHANGED", "ACCESS_EXTENDED"] };
          break;
        case "STUDENT":
          whereClause.action = "STUDENT_SUSPENDED";
          break;
        default:
          break;
      }
    }

    // Filter by Date Range
    if (params.range && params.range !== "ALL") {
      const now = new Date();
      let rangeStart: Date | undefined;
      if (params.range === "TODAY") {
        rangeStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      } else if (params.range === "WEEK") {
        rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (params.range === "MONTH") {
        rangeStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      if (rangeStart) {
        whereClause.created_at = { gte: rangeStart };
      }
    }

    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? (params.limit ?? 10)));
    const skip = params.offset !== undefined && !params.page ? params.offset : (page - 1) * pageSize;

    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count({ where: whereClause }),
      this.prisma.auditLog.findMany({
        where: whereClause,
        orderBy: [{ created_at: "desc" }, { id: "asc" }],
        take: pageSize,
        skip,
      }),
    ]);

    let entries = rows.map((row) => this.mapToAuditEntry(row));

    // Full-text / metadata filtering
    if (params.query && params.query.trim().length > 0) {
      const q = params.query.toLowerCase().trim();
      entries = entries.filter((e) => {
        const matchAction = e.action.toLowerCase().includes(q);
        const matchTarget = e.target.toLowerCase().includes(q);
        const matchReason = e.reason?.toLowerCase().includes(q) ?? false;
        const matchActor = e.actor.toLowerCase().includes(q);
        return matchAction || matchTarget || matchReason || matchActor;
      });
    }

    if (params.page || params.pageSize) {
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      return {
        items: entries,
        page,
        pageSize,
        total,
        totalPages,
        pageCount: totalPages,
      } as any;
    }

    return entries;
  }

  /**
   * Retrieves the newest attention entries (default 8) for profile panel and real-time alerts.
   */
  async getRecentAttentionLogs(limit = 8): Promise<AuditEntryDto[]> {
    const rows = await this.prisma.auditLog.findMany({
      where: {
        action: { in: [...ATTENTION_AUDIT_ACTIONS] },
      },
      orderBy: { created_at: "desc" },
      take: limit,
    });

    return rows.map((row) => this.mapToAuditEntry(row));
  }

  /**
   * Cleans up any non-attention logs from the database.
   */
  async cleanupNonAttentionLogs(): Promise<number> {
    const result = await this.prisma.auditLog.deleteMany({
      where: {
        action: { notIn: [...ATTENTION_AUDIT_ACTIONS] },
      },
    });
    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} non-attention audit records from database`);
    }
    return result.count;
  }

  /**
   * Maps a Prisma audit log row to the canonical AuditEntry format.
   */
  private mapToAuditEntry(row: any): AuditEntryDto {
    const meta = (row.metadata as Record<string, unknown>) ?? {};
    const target =
      typeof meta.target === "string"
        ? meta.target
        : `${row.target_type} ${row.target_id}`;
    const reason =
      typeof meta.reason === "string"
        ? meta.reason
        : typeof meta.rejectReason === "string"
          ? meta.rejectReason
          : undefined;

    const actor: AuditActor =
      row.actor_role === Role.ADMIN
        ? "ADMIN"
        : row.actor_role === Role.STUDENT
          ? "STUDENT"
          : "SYSTEM";

    return {
      id: row.id,
      at: row.created_at.toISOString(),
      actor,
      action: row.action as AuditAction,
      target,
      reason,
    };
  }

  /**
   * Enforces the storage ceiling by pruning the oldest attention records
   * when the table size exceeds MAX_AUDIT_LOG_CAP.
   */
  private async pruneExcessLogsIfNecessary(): Promise<void> {
    try {
      const count = await this.prisma.auditLog.count();
      if (count > MAX_AUDIT_LOG_CAP) {
        const excess = count - MAX_AUDIT_LOG_CAP;
        const oldest = await this.prisma.auditLog.findMany({
          select: { id: true },
          orderBy: { created_at: "asc" },
          take: excess + 25,
        });
        if (oldest.length > 0) {
          await this.prisma.auditLog.deleteMany({
            where: { id: { in: oldest.map((r) => r.id) } },
          });
          this.logger.log(
            `[AuditService] Pruned ${oldest.length} old audit records to conserve DB storage (capped at <= ${MAX_AUDIT_LOG_CAP}).`,
          );
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to prune excess audit logs: ${err}`);
    }
  }
}
