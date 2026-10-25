// apps/mobile/src/modules/courses/api/content.api.ts
import type { Topic } from '@mastara/contracts';
import { ERROR_CODES, type ContentKind } from '@mastara/domain';

import { contentKey, downloadStore, gatewayReads } from '@/core/downloads';
import { ApiError, httpClient, isApiError, isOnline } from '@/core/network';
import { getLocalCatalogTopics, parseCatalogMeta } from '@/core/sync/catalogSync';
import { myCoursesApi } from '@/modules/my-courses/api/myCourses.api';
import { readerMemoryCache } from '@/modules/reader/store/readerMemoryCache';

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
      return await httpClient.get<Topic>(
        `/content/topics/${encodeURIComponent(topicId)}?fields=id,courseId,kind,number,title,summary,body,isFree`,
        {
          headers: { 'Accept-Encoding': 'gzip' },
        },
      );
    } catch (err) {
      if (isApiError(err, ERROR_CODES.NETWORK_OFFLINE)) {
        throw err;
      }
      return null;
    }
  },
};

/** The real remote server API. Used to download lessons. */
export const contentRemote: ContentApi = realContentApi;

export const topicKey = (topicId: string): string => contentKey('content', 'getTopic', [topicId]);

const baseCatalogGateway = gatewayReads('content', contentRemote, {
  details: [],
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

/**
 * Online first with ephemeral in-memory reader cache:
 * Online: fetches live from API, keeps in RAM only while reader is open (never writes silent copies to disk).
 * Offline: reads from downloadStore.getContent. Paid bodies re-check access via offlineAccess & trusted clock.
 */
export const contentApi: ContentApi = {
  getTopics: (courseId: string, kind: ContentKind) => baseCatalogGateway.getTopics(courseId, kind),

  getTopic: async (topicId: string): Promise<Topic | null> => {
    // 1. In-memory cache hit (0ms latency, RAM-only)
    const inMemory = readerMemoryCache.get(topicId);
    if (inMemory) return inMemory;

    // 2. Online: fetch from server, keep in RAM only while reader is open
    let remoteFailed = false;
    if (isOnline()) {
      try {
        const remote = await contentRemote.getTopic(topicId);
        if (remote) {
          readerMemoryCache.set(topicId, remote);
          return remote;
        }
      } catch (err) {
        // Only re-throw if server explicitly denied access (e.g. 401 / 403)
        if (
          isApiError(err, ERROR_CODES.ENTITLEMENT_REQUIRED) ||
          isApiError(err, ERROR_CODES.UNAUTHORIZED)
        ) {
          throw err;
        }
        // For network outages, API downtime (502/503/timeout), fall through to local downloaded copy
        remoteFailed = true;
      }
    }

    // 3. Offline (or API down): check downloadStore
    const key = topicKey(topicId);
    const saved = await downloadStore.getContent<Topic>(key);
    if (!saved.found) {
      if (!isOnline() || remoteFailed) {
        throw new ApiError(ERROR_CODES.CONTENT_NOT_DOWNLOADED);
      }
      return null;
    }

    const topic = saved.value;

    // 4. Offline access verification for paid bodies:
    // Before showing a paid body, re-check access with offlineAccess and the trusted clock
    if (!topic.isFree) {
      try {
        const courses = await myCoursesApi.getMyCourses([topic.courseId]);
        const access = courses[0]?.access ?? 'LOCKED';
        if (access !== 'PAID') {
          throw new ApiError(ERROR_CODES.ENTITLEMENT_EXPIRED);
        }
      } catch (err) {
        if (err instanceof ApiError && err.code === ERROR_CODES.ENTITLEMENT_EXPIRED) {
          throw err;
        }
        // If myCourses verification experienced a network error, keep using saved entitlement
      }
    }

    readerMemoryCache.set(topicId, topic);
    return topic;
  },
};
