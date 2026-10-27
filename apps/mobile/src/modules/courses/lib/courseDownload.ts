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
 *
 * DWN-01 Resumable downloads: checks downloadStore.ids() before fetching; already downloaded
 * units are skipped, allowing interrupted downloads to resume smoothly without restarting from scratch.
 * DWN-02 Progress: advances onProgress(current, total) after each unit.
 * DWN-06 Content versioning: saves contentVersion in the course manifest.
 */
export function courseDownload(course: Course): DownloadUnit {
  const unitId = `COURSE:${course.id}`;
  return {
    unitId,
    kind: 'COURSE',
    courseId: course.id,
    title: course.title,
    meta: course,
    estimatedBytes: (course as any).estimatedBytes ?? 25 * 1024 * 1024,
    fetch: async (onProgress?: (current: number, total: number) => void): Promise<DownloadEntry[]> => {
      const entries: DownloadEntry[] = [];
      const existingIds = await downloadStore.ids();

      // Check if this is an update (course version changed)
      const downloadedVersion = await downloadStore.getDownloadedCourseVersion(course.id);
      const isUpdate =
        downloadedVersion !== null &&
        ((course as any).contentVersion ?? 1) > downloadedVersion;

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

      // 3. Fetch Quiz Chapters metadata
      const quizChapters: Array<{ qNo: 1 | 2 | 3; ch: any }> = [];
      for (const qNo of [1, 2, 3] as const) {
        try {
          const chapters = await quizRemote.getChapters(course.id, qNo);
          for (const ch of chapters) {
            quizChapters.push({ qNo, ch });
          }
        } catch {
          // ignore
        }
      }

      // 4. Fetch Exam metadata
      const examList: Array<{ kind: 'MID' | 'FINAL' | 'MOCK'; listing: any }> = [];
      for (const kind of ['MID', 'FINAL', 'MOCK'] as const) {
        try {
          const listings = await examRemote.getExams(course.id, kind);
          for (const listing of listings) {
            examList.push({ kind, listing });
          }
        } catch {
          // ignore
        }
      }

      const totalItems = Math.max(1, allTopics.length + quizChapters.length + examList.length);
      let completedCount = 0;
      onProgress?.(completedCount, totalItems);

      // Download Topics (resumable: if already in existingIds and not isUpdate, skip network fetch)
      for (const topic of allTopics) {
        const topicUnitId = `TOPIC:${topic.id}`;
        if (!isUpdate && existingIds.has(topicUnitId)) {
          const cached = await downloadStore.getContent(topicKey(topic.id));
          if (cached.found) {
            entries.push({ key: topicKey(topic.id), value: cached.value });
          }
          completedCount++;
          onProgress?.(completedCount, totalItems);
          continue;
        }

        try {
          const detail = await contentRemote.getTopic(topic.id);
          if (detail) {
            entries.push({ key: topicKey(topic.id), value: detail });
            await downloadStore.saveUnit(
              {
                unitId: topicUnitId,
                kind: 'TOPIC',
                courseId: course.id,
                title: topic.title?.en ?? topic.title,
                meta: topic,
              },
              [{ key: topicKey(topic.id), value: detail }],
            );
          }
        } catch {
          // continue downloading remaining topics
        }
        completedCount++;
        onProgress?.(completedCount, totalItems);
      }

      // Download Quiz Chapters
      for (const { ch } of quizChapters) {
        const chUnitId = `QUIZ_CHAPTER:${ch.id}`;
        if (!isUpdate && existingIds.has(chUnitId)) {
          const keys = chapterKeys(ch.id);
          const [cDetail, cQuestions] = await Promise.all([
            downloadStore.getContent(keys.chapter),
            downloadStore.getContent(keys.questions),
          ]);
          if (cDetail.found) entries.push({ key: keys.chapter, value: cDetail.value });
          if (cQuestions.found) entries.push({ key: keys.questions, value: cQuestions.value });
          completedCount++;
          onProgress?.(completedCount, totalItems);
          continue;
        }

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
              unitId: chUnitId,
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
        completedCount++;
        onProgress?.(completedCount, totalItems);
      }

      // Download Exams
      for (const { listing } of examList) {
        const examUnitId = `EXAM:${listing.exam.id}`;
        if (!isUpdate && existingIds.has(examUnitId)) {
          const cached = await downloadStore.getContent(examKey(listing.exam.id));
          if (cached.found) {
            entries.push({ key: examKey(listing.exam.id), value: cached.value });
          }
          completedCount++;
          onProgress?.(completedCount, totalItems);
          continue;
        }

        try {
          const session = await examRemote.getSession(listing.exam.id);
          if (session) {
            entries.push({ key: examKey(listing.exam.id), value: session });
            await downloadStore.saveUnit(
              {
                unitId: examUnitId,
                kind: 'EXAM',
                courseId: course.id,
                title: `${listing.university?.shortName ?? 'Exam'} ${listing.exam.kind}`,
                meta: listing,
              },
              [{ key: examKey(listing.exam.id), value: session }],
            );
          }
        } catch {
          // continue
        }
        completedCount++;
        onProgress?.(completedCount, totalItems);
      }

      // Save Course Manifest with contentVersion (DWN-06)
      entries.push({
        key: `course:${course.id}:manifest`,
        value: {
          id: course.id,
          title: course.title,
          contentVersion: (course as any).contentVersion ?? 1,
          downloadedAt: Date.now(),
        },
      });

      return entries;
    },
  };
}
