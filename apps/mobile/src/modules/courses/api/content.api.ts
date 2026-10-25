// apps/mobile/src/modules/courses/api/content.api.ts
import type { Topic } from '@mastara/contracts';
import type { ContentKind } from '@mastara/domain';

import { contentKey, downloadStore, gatewayReads } from '@/core/downloads';
import { httpClient } from '@/core/network';
import { getLocalCatalogTopics, parseCatalogMeta } from '@/core/sync';

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
 * Online first with local catalog SQLite: lists come from catalog_item,
 * and individual lesson bodies open offline when saved.
 */
export const contentApi = gatewayReads('content', contentRemote, {
  details: ['getTopic'],
  lists: {
    getTopics: async (courseId: string, kind: ContentKind) => {
      const [localRows, saved] = await Promise.all([
        getLocalCatalogTopics(courseId),
        downloadStore.listByKind<Topic>('TOPIC', courseId).catch(() => []),
      ]);

      const savedMap = new Map((saved ?? []).map((s) => [s.meta.id, s.meta]));

      if (localRows.length > 0) {
        return localRows
          .map((r) => {
            const savedItem = savedMap.get(r.id);
            if (savedItem) return savedItem;
            let title = { en: r.title, am: r.title };
            if (r.title && r.title.startsWith('{')) {
              try {
                const parsed = JSON.parse(r.title);
                title = { en: parsed.en || r.title, am: parsed.am || parsed.en || r.title };
              } catch {}
            }
            const meta = parseCatalogMeta<{ kind?: string; summary?: { en: string; am: string }; body?: { en: string; am: string } }>(r.meta);
            return {
              id: r.id,
              courseId: r.course_id,
              kind: (meta?.kind || kind) as ContentKind,
              number: r.position,
              title,
              summary: meta?.summary ?? { en: '', am: '' },
              body: meta?.body ?? { en: '', am: '' },
              isFree: Boolean(r.is_free),
            };
          })
          .filter((t) => t.kind === kind)
          .sort((a, b) => a.number - b.number);
      }

      return (saved ?? [])
        .map((item) => item.meta)
        .filter((topic) => topic.kind === kind)
        .sort((a, b) => a.number - b.number);
    },
  },
});

export const topicKey = (topicId: string): string => contentKey('content', 'getTopic', [topicId]);
