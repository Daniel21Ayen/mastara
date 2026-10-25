// apps/mobile/src/modules/reader/store/readerMemoryCache.ts
import type { Topic } from '@mastara/contracts';

/**
 * Ephemeral in-memory body cache for the active reader session.
 * STRICT RULE (Migration v3 & Phase 5):
 * Never written to disk silently! Kept in RAM only while reader is open.
 */
const memoryCache = new Map<string, Topic>();

export const readerMemoryCache = {
  get(topicId: string): Topic | undefined {
    return memoryCache.get(topicId);
  },

  set(topicId: string, topic: Topic): void {
    memoryCache.set(topicId, topic);
  },

  has(topicId: string): boolean {
    return memoryCache.has(topicId);
  },

  delete(topicId: string): void {
    memoryCache.delete(topicId);
  },

  clear(): void {
    memoryCache.clear();
  },

  size(): number {
    return memoryCache.size;
  },
};
