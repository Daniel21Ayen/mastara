// apps/mobile/src/modules/courses/api/content.api.ts
import type { Topic } from '@mastara/contracts';
import type { ContentKind } from '@mastara/domain';

import { contentKey, downloadStore, gatewayReads } from '@/core/downloads';
import { httpClient } from '@/core/network';

export interface ContentApi {
  /** Modules or notes of a course, in order. */
  getTopics(courseId: string, kind: ContentKind): Promise<Topic[]>;
  getTopic(topicId: string): Promise<Topic | null>;
}

export const realContentApi: ContentApi = {
  async getTopics(courseId: string, kind: ContentKind): Promise<Topic[]> {
    return httpClient.get<Topic[]>(`/content/courses/${encodeURIComponent(courseId)}/topics?kind=${kind}`);
  },
  async getTopic(topicId: string): Promise<Topic | null> {
    try {
      return await httpClient.get<Topic>(`/content/topics/${encodeURIComponent(topicId)}`);
    } catch {
      return null;
    }
  },
};

/** The real remote server API. Used to download lessons. */
export const contentRemote: ContentApi = realContentApi;

/**
 * Online first with SQLite cache: a lesson opens offline only if downloaded to SQLite,
 * and offline lists show downloaded modules.
 */
export const contentApi = gatewayReads('content', contentRemote, {
  details: ['getTopic'],
  lists: {
    getTopics: async (courseId: string, kind: ContentKind) => {
      const saved = await downloadStore.listByKind<Topic>('TOPIC', courseId);
      return saved
        .map((item) => item.meta)
        .filter((topic) => topic.kind === kind)
        .sort((a, b) => a.number - b.number);
    },
  },
});

export const topicKey = (topicId: string): string => contentKey('content', 'getTopic', [topicId]);
