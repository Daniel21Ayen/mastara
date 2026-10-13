// apps/mobile/src/modules/quizzes/lib/chapterDownload.ts
import type { QuizChapter } from '@mastara/contracts';

import type { DownloadUnit } from '@/core/downloads';

import { chapterKeys, quizRemote } from '../api/quiz.api';

/** Download recipe for one quiz chapter: its details and all its questions. */
export function chapterDownload(chapter: QuizChapter): DownloadUnit {
  return {
    unitId: `QUIZ_CHAPTER:${chapter.id}`,
    kind: 'QUIZ_CHAPTER',
    courseId: chapter.courseId ?? null,
    title: `Quiz ${chapter.quizNo} · Chapter ${chapter.chapterNumber}`,
    meta: chapter,
    fetch: async () => {
      const [detail, questions] = await Promise.all([quizRemote.getChapter(chapter.id), quizRemote.getQuestions(chapter.id)]);
      const keys = chapterKeys(chapter.id);
      return [
        { key: keys.chapter, value: detail },
        { key: keys.questions, value: questions },
      ];
    },
  };
}
