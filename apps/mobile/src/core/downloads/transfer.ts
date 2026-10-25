// apps/mobile/src/core/downloads/transfer.ts
import { ERROR_CODES } from '@mastara/domain';

import { ApiError, isOnline } from '@/core/network';

import { downloadStore } from './downloadStore';
import type { DownloadEntry, DownloadKind } from './downloadStore';

/**
 * A recipe for downloading one item. The feature that owns the item (lessons, quizzes, exams, COC) builds it, so this
 * layer does not need to know about any feature: `fetch` returns the saved answers (see `contentKey`) for that item.
 */
export interface DownloadUnit {
  unitId: string;
  kind: DownloadKind;
  courseId: string | null;
  /** English fallback name. The download list builds the shown name from `meta` in the student's language. */
  title: string;
  /** The list entry, so the item can appear in its list while offline. */
  meta: unknown;
  /** Gets everything the item needs from the server. */
  fetch: () => Promise<DownloadEntry[]>;
}

/** Fetches and saves one item in one step: it is either fully downloaded or not at all. Needs the internet. */
export async function downloadUnit(unit: DownloadUnit): Promise<void> {
  if (!isOnline()) throw new ApiError(ERROR_CODES.NETWORK_OFFLINE);
  const entries = await unit.fetch();
  await downloadStore.saveUnit(
    { unitId: unit.unitId, kind: unit.kind, courseId: unit.courseId, title: unit.title, meta: unit.meta },
    entries,
  );
}

export type TransferStatus = 'downloading' | 'failed';

const status = new Map<string, TransferStatus>();
const listeners = new Set<() => void>();
const notify = (): void => listeners.forEach((listener) => listener());

/** Progress of downloads in this run of the app, for the buttons. */
export const downloadStatus = {
  get: (unitId: string): TransferStatus | undefined => status.get(unitId),

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Starts a download. Safe to tap twice: an item already downloading is not started again. */
  async start(unit: DownloadUnit): Promise<void> {
    if (status.get(unit.unitId) === 'downloading') return;

    status.set(unit.unitId, 'downloading');
    notify();
    try {
      await downloadUnit(unit);
      status.delete(unit.unitId);
    } catch (error) {
      status.set(unit.unitId, 'failed');
      throw error;
    } finally {
      notify();
    }
  },

  clearFailure(unitId: string): void {
    if (status.get(unitId) === 'failed') {
      status.delete(unitId);
      notify();
    }
  },
};
