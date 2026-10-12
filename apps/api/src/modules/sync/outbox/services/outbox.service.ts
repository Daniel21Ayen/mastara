import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import { SyncResultStatus } from "@mastara/domain";
import { SyncOutboxDto, OutboxOpDto } from "../dto";

export interface SyncResult {
  id: string;
  status: SyncResultStatus;
}

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Processes a batch of offline operations from the mobile client.
   * Each op is identified by a UUIDv7 operation_id which guarantees idempotency:
   * re-uploading an already-applied op returns "already_applied" without side-effects.
   */
  async applyBatch(
    studentId: string,
    deviceIdHash: string,
    dto: SyncOutboxDto,
  ): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const op of dto.ops) {
      const result = await this._applyOp(studentId, deviceIdHash, op);
      results.push(result);
    }

    return results;
  }

  private async _applyOp(
    studentId: string,
    deviceIdHash: string,
    op: OutboxOpDto,
  ): Promise<SyncResult> {
    // Idempotency check: already applied?
    const existing = await this.prisma.outboxEvent.findUnique({
      where: { operation_id: op.id },
    });

    if (existing) {
      return { id: op.id, status: "already_applied" };
    }

    try {
      await this.prisma.outboxEvent.create({
        data: {
          operation_id: op.id,
          student_id: studentId,
          device_id_hash: deviceIdHash,
          type: op.type,
          payload: op.payload as any,
          client_seq: op.seq ?? null,
          client_timestamp: new Date(op.createdAt),
        },
      });

      this.logger.debug(
        `Applied outbox op ${op.id} (${op.type}) for student ${studentId}`,
      );

      return { id: op.id, status: "accepted" };
    } catch (err) {
      this.logger.warn(
        `Failed to apply outbox op ${op.id} (${op.type}) for student ${studentId}`,
        err,
      );
      return { id: op.id, status: "rejected" };
    }
  }
}
