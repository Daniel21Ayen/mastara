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
  async getTopics(courseId, kind) {
    const list = await httpClient.get<any[]>(`/content/courses/${courseId}/topics?kind=${kind}`);
    return list.map((item) => ({
      id: item.id,
      courseId: item.courseId,
      kind: item.kind,
      number: item.number,
      title: item.title,
      summary: item.summary,
      body: item.body ?? { en: '', am: '' },
      isFree: item.isFree,
    }));
  },
  async getTopic(topicId) {
    const detail = await httpClient.get<any>(`/content/topics/${topicId}`);
    if (!detail) return null;
    return {
      id: detail.id,
      courseId: detail.courseId,
      kind: detail.kind,
      number: detail.number,
      title: detail.title,
      summary: detail.summary,
      body: detail.body,
      isFree: detail.isFree,
    };
  },
};

/** The server, with no download rules. Used to download a lesson. */
export const contentRemote = realContentApi;

/**
 * Online first. A lesson opens offline only if the student downloaded it. Offline, the lesson lists show what was downloaded.
 */
export const contentApi = gatewayReads('content', contentRemote, {
  details: ['getTopic'],
  lists: {
    getTopics: async (courseId: string, kind: ContentKind) => {
      const saved = await downloadStore.listByKind<Topic>('TOPIC', courseId);
      return saved.map((item) => item.meta).filter((topic) => topic.kind === kind).sort((a, b) => a.number - b.number);
    },
  },
});

export const topicKey = (topicId: string): string => contentKey('content', 'getTopic', [topicId]);
