// apps/mobile/src/modules/home/api/home.api.ts
import type { HomeSummary, RecentItem, StudentProfile } from '@mastara/contracts';

import { env } from '@/core/config/env';
import { cacheReads } from '@/core/db';
import { accessFor, courses, mockProgressFor, pendingOrderCount, universities } from '@/core/mock/data';
import { simulateLatency } from '@/core/mock/delay';
import { httpClient } from '@/core/network';

export interface HomeApi {
  getSummary(userId: string, profile: StudentProfile): Promise<HomeSummary>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

const mockHomeApi: HomeApi = {
  async getSummary(userId, profile) {
    await simulateLatency();

    const mine = (profile.courseIds ?? [])
      .map((id) => courses.find((course) => course.id === id))
      .filter((course): course is NonNullable<typeof course> => course !== undefined);

    const progress = mine.map((course) => ({ course, ...mockProgressFor(course.id) }));
    const first = progress[0];
    const university = universities.find((item) => item.id === profile.universityId);

    const recent: RecentItem[] = [];
    if (first) {
      recent.push({
        id: 'r1',
        kind: 'TOPIC',
        title: first.course.title,
        courseId: first.course.id,
        chapterNumber: 2,
        accessedAt: daysAgo(2),
      });
    }
    if (progress[1]) {
      recent.push({
        id: 'r2',
        kind: 'NOTE',
        title: progress[1].course.title,
        courseId: progress[1].course.id,
        accessedAt: daysAgo(3),
      });
    }
    if (university) {
      recent.push({ id: 'r3', kind: 'EXAM', title: `${university.shortName} (Mid) Exam`, accessedAt: daysAgo(5) });
    }

    return {
      chaptersDone: progress.reduce((sum, item) => sum + item.chaptersDone, 0),
      chaptersTotal: progress.reduce((sum, item) => sum + item.chaptersTotal, 0),
      activeProducts: mine.filter((course) => accessFor(course.id).access === 'PAID').length,
      pendingProducts: pendingOrderCount(userId),
      recent,
    };
  },
};

export const realHomeApi: HomeApi = {
  async getSummary(_userId, _profile) {
    return httpClient.get<HomeSummary>('/learning/home-summary');
  },
};

const baseApi: HomeApi = env.useMocks ? mockHomeApi : realHomeApi;

/** Reads are saved on the phone and used when it is offline; writes always need the server. */
export const homeApi = cacheReads('home', baseApi, ['getSummary']);
