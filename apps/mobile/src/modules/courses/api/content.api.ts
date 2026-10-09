// apps/mobile/src/modules/courses/api/content.api.ts
import type { Topic } from '@mastara/contracts';
import type { ContentKind } from '@mastara/domain';

import { env } from '@/core/config/env';
import { cacheReads } from '@/core/db';
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

/** Reads are saved on the phone and used when it is offline; writes always need the server. */
export const contentApi = cacheReads('content', createContentApi(), ['getTopics', 'getTopic']);
