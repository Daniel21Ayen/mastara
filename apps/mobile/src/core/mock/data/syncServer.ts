// apps/mobile/src/core/mock/data/syncServer.ts
import type { OutboxOp, StudentProfile, SyncResult } from '@mastara/contracts';

import { saveMockProfile } from './profiles';

/** What the mock server remembers about uploaded changes. Real server: a table of applied operation IDs. */
const appliedIds = new Set<string>();
const log: OutboxOp[] = [];

/** Applies each change once. A repeated ID is answered "already_applied" and changes nothing. */
export function applyOps(userId: string, ops: readonly OutboxOp[]): SyncResult[] {
  return ops.map((op): SyncResult => {
    if (appliedIds.has(op.id)) return { id: op.id, status: 'already_applied' };

    if (op.type === 'PROFILE_SAVED') {
      saveMockProfile(userId, op.payload.profile as StudentProfile);
    }
    // ATTEMPT_FINISHED and EXAM_SUBMITTED are only recorded in the mock; the real server stores them.
    appliedIds.add(op.id);
    log.push(op);
    return { id: op.id, status: 'accepted' };
  });
}

export const appliedOpCount = (): number => appliedIds.size;
