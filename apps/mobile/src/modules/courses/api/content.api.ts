// apps/mobile/src/modules/courses/api/content.api.ts
import type { Topic } from '@mastara/contracts';
import type { ContentKind } from '@mastara/domain';

import { env } from '@/core/config/env';
import { contentKey, downloadStore, gatewayReads } from '@/core/downloads';
import { buildTopics, courses, findTopic } from '@/core/mock/data';
import { simulateLatency } from '@/core/mock/delay';

export interface ContentApi {
  /** Modules or notes of a course, in order. */
  getTopics(courseId: string, kind: ContentKind): Promise<Topic[]>;
  getTopic(topicId: string): Promise<Topic | null>;
}

const mockContentApi: ContentApi = {
  async getTopics(courseId, kind) {
    await simulateLatency(150);
    const course = courses.find((item) => item.id === courseId);
    return course ? buildTopics(course).filter((topic) => topic.kind === kind) : [];
  },
  async getTopic(topicId) {
    await simulateLatency(100);
    return findTopic(topicId);
  },
};

function createContentApi(): ContentApi {
  if (env.useMocks) return mockContentApi;
  throw new Error('The real content API is added in the backend integration phase.');
}

/** The server, with no download rules. Used to download a lesson. */
export const contentRemote = createContentApi();

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
