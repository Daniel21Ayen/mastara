import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import { Role } from "@mastara/database";

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

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Writes an immutable audit log entry. Failures are swallowed and logged
   * so that a write failure never breaks the originating operation.
   */
  async log(input: WriteAuditLogInput): Promise<void> {
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
    } catch (err) {
      this.logger.error(
        `Failed to write audit log [${input.action}] for ${input.actorId}`,
        err,
      );
    }
  }
}
