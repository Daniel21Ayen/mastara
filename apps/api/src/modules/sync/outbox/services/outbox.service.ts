import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import { SyncResultStatus, withinDuration } from "@mastara/domain";
import type { ExamSubmission } from "@mastara/contracts";
import { AttemptCategory, AttemptState } from "@mastara/database";
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
      // Process EXAM_SUBMITTED domain side-effects
      if (op.type === "EXAM_SUBMITTED" && op.payload && typeof op.payload === "object") {
        const sub = op.payload as Partial<ExamSubmission>;
        if (
          typeof sub.sittingId === "string" &&
          typeof sub.examId === "string" &&
          typeof sub.durationMs === "number" &&
          typeof sub.elapsedMs === "number" &&
          sub.provisional &&
          typeof sub.provisional.correct === "number" &&
          typeof sub.provisional.total === "number"
        ) {
          const isTampered = !withinDuration(sub.elapsedMs, sub.durationMs);

          if (isTampered) {
            this.logger.warn(
              `Exam submission ${sub.sittingId} exceeded allowed duration (elapsed: ${sub.elapsedMs}ms, duration: ${sub.durationMs}ms)`,
            );
          }

          // Check if exam exists in DB to prevent foreign key errors (if valid UUID)
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sub.examId);
          const exam = isUuid
            ? await this.prisma.exam.findUnique({
                where: { id: sub.examId },
              }).catch(() => null)
            : null;

          // Persist student attempt record if not already recorded
          const existingAttempt = await this.prisma.attempt.findFirst({
            where: {
              student_id: studentId,
              integrity_metadata: { path: ["sittingId"], equals: sub.sittingId },
            },
          }).catch(() => null);

          if (!existingAttempt) {
            await this.prisma.attempt.create({
              data: {
                student_id: studentId,
                exam_id: exam ? sub.examId : null,
                category: AttemptCategory.EXAM,
                state: AttemptState.SUBMITTED,
                total_questions: sub.provisional.total,
                correct_count: sub.provisional.correct,
                score: sub.provisional.total > 0
                  ? (sub.provisional.correct / sub.provisional.total) * 100
                  : 0,
                elapsed_ms: BigInt(sub.elapsedMs),
                server_started_at: new Date(sub.startedAt || Date.now()),
                submitted_at: new Date(sub.submittedAt || Date.now()),
                is_tampered: isTampered,
                integrity_metadata: {
                  sittingId: sub.sittingId,
                  title: sub.title || "Exam",
                  reason: sub.reason || "manual",
                  durationMs: sub.durationMs,
                  answersCount: sub.answers ? Object.keys(sub.answers).length : 0,
                },
              },
            }).catch((err) => {
              this.logger.warn(`Could not persist attempt record for sitting ${sub.sittingId}`, err);
            });
          }
        }
      }

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
