// apps/mobile/src/modules/courses/api/content.api.ts
import type { Topic } from '@mastara/contracts';
import type { ContentKind } from '@mastara/domain';

import { cacheReads } from '@/core/db';
import { httpClient } from '@/core/network';

export interface ContentApi {
  /** Modules or notes of a course, in order. */
  getTopics(courseId: string, kind: ContentKind): Promise<Topic[]>;
  getTopic(topicId: string): Promise<Topic | null>;
}

const realContentApi: ContentApi = {
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

/** Reads are saved on the phone and used when it is offline; writes always need the server. */
export const contentApi = cacheReads('content', realContentApi, ['getTopics', 'getTopic']);
