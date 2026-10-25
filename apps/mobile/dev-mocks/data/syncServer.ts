// apps/mobile/src/core/mock/data/syncServer.ts
import { examSubmissionSchema } from '@mastara/contracts';
import type { OutboxOp, StudentProfile, SyncResult } from '@mastara/contracts';
import { withinDuration } from '@mastara/domain';

import { saveMockProfile } from './profiles';

/** What the mock server remembers about uploaded changes. Real server: a table of applied operation IDs. */
const appliedIds = new Set<string>();
const log: OutboxOp[] = [];
/** Exam sittings already stored. The same sitting sent in two different changes is counted once. */
const sittingIds = new Set<string>();

/** Applies each change once. A repeated ID is answered "already_applied" and changes nothing. */
export function applyOps(userId: string, ops: readonly OutboxOp[]): SyncResult[] {
  return ops.map((op): SyncResult => {
    if (appliedIds.has(op.id)) return { id: op.id, status: 'already_applied' };

    if (op.type === 'PROFILE_SAVED') {
      saveMockProfile(userId, op.payload.profile as StudentProfile);
    }
    if (op.type === 'EXAM_SUBMITTED') {
      const parsed = examSubmissionSchema.safeParse(op.payload);
      if (!parsed.success) return { id: op.id, status: 'rejected' };
      if (sittingIds.has(parsed.data.sittingId)) {
        appliedIds.add(op.id);
        return { id: op.id, status: 'already_applied' };
      }
      sittingIds.add(parsed.data.sittingId);
      // Real server: re-grade from `answers`, and compare `elapsedMs` with the exam length and its own receive time.
      if (!withinDuration(parsed.data.elapsedMs, parsed.data.durationMs)) {
        console.warn('Mock server: sitting longer than the exam', parsed.data.sittingId);
      }
    }
    // ATTEMPT_FINISHED is only recorded in the mock; the real server stores it.
    appliedIds.add(op.id);
    log.push(op);
    return { id: op.id, status: 'accepted' };
  });
}

export const appliedOpCount = (): number => appliedIds.size;
