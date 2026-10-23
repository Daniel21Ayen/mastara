// apps/mobile/src/modules/courses/lib/courseDownload.ts
import type { Course } from '@mastara/contracts';

import { downloadStore } from '@/core/downloads';
import type { DownloadEntry, DownloadUnit } from '@/core/downloads';
import { examKey, examRemote } from '@/modules/exams/api/exam.api';
import { chapterKeys, quizRemote } from '@/modules/quizzes/api/quiz.api';

import { contentRemote, topicKey } from '../api/content.api';

/**
 * Download recipe for an entire course:
 * Downloads all syllabus modules, notes, quiz chapters, practice questions, and past exams.
 * Stores individual units and records the COURSE download unit so content is accessible locally.
 */
export function courseDownload(course: Course): DownloadUnit {
  const unitId = `COURSE:${course.id}`;
  return {
    unitId,
    kind: 'COURSE',
    courseId: course.id,
    title: course.title,
    meta: course,
    fetch: async (): Promise<DownloadEntry[]> => {
      const entries: DownloadEntry[] = [];

      // 1. Fetch MODULE topics
      let modules: any[] = [];
      try {
        modules = await contentRemote.getTopics(course.id, 'MODULE');
      } catch {
        modules = [];
      }

      // 2. Fetch NOTE topics
      let notes: any[] = [];
      try {
        notes = await contentRemote.getTopics(course.id, 'NOTE');
      } catch {
        notes = [];
      }

      const allTopics = [...modules, ...notes];

      // 3. For each topic, fetch full details and save its unit
      for (const topic of allTopics) {
        try {
          const detail = await contentRemote.getTopic(topic.id);
          if (detail) {
            entries.push({ key: topicKey(topic.id), value: detail });
            await downloadStore.saveUnit(
              {
                unitId: `TOPIC:${topic.id}`,
                kind: 'TOPIC',
                courseId: course.id,
                title: topic.title.en,
                meta: topic,
              },
              [{ key: topicKey(topic.id), value: detail }],
            );
          }
        } catch {
          // continue downloading remaining topics
        }
      }

      // 4. Fetch quiz chapters for Quiz 1, 2, 3
      for (const qNo of [1, 2, 3] as const) {
        try {
          const chapters = await quizRemote.getChapters(course.id, qNo);
          for (const ch of chapters) {
            try {
              const [detail, questions] = await Promise.all([
                quizRemote.getChapter(ch.id),
                quizRemote.getQuestions(ch.id),
              ]);
              const keys = chapterKeys(ch.id);
              if (detail) {
                entries.push({ key: keys.chapter, value: detail });
              }
              if (questions) {
                entries.push({ key: keys.questions, value: questions });
              }
              await downloadStore.saveUnit(
                {
                  unitId: `QUIZ_CHAPTER:${ch.id}`,
                  kind: 'QUIZ_CHAPTER',
                  courseId: course.id,
                  title: `Quiz ${ch.quizNo} · Chapter ${ch.chapterNumber}`,
                  meta: ch,
                },
                [
                  { key: keys.chapter, value: detail },
                  { key: keys.questions, value: questions },
                ],
              );
            } catch {
              // continue
            }
          }
        } catch {
          // continue
        }
      }

      // 5. Fetch exams for MID, FINAL, MOCK
      for (const kind of ['MID', 'FINAL', 'MOCK'] as const) {
        try {
          const examListings = await examRemote.getExams(course.id, kind);
          for (const listing of examListings) {
            try {
              const session = await examRemote.getSession(listing.exam.id);
              if (session) {
                entries.push({ key: examKey(listing.exam.id), value: session });
                await downloadStore.saveUnit(
                  {
                    unitId: `EXAM:${listing.exam.id}`,
                    kind: 'EXAM',
                    courseId: course.id,
                    title: `${listing.university.shortName} ${listing.exam.kind}`,
                    meta: listing,
                  },
                  [{ key: examKey(listing.exam.id), value: session }],
                );
              }
            } catch {
              // continue
            }
          }
        } catch {
          // continue
        }
      }

      entries.push({
        key: `course:${course.id}:manifest`,
        value: {
          id: course.id,
          title: course.title,
          downloadedAt: Date.now(),
        },
      });

      return entries;
    },
  };
}
