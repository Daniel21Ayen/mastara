// apps/mobile/src/modules/quizzes/repo/attempt.repository.ts
import { getDb } from '@/core/db/database';
import { dbUser } from '@/core/db/userScope';

export interface AttemptResult {
  chapterId: string;
  correct: number;
  total: number;
  finishedAt: string;
}

/** Where finished practice runs are stored. Same interface as before; now saved on the phone (SQLite). */
export interface AttemptRepository {
  saveResult(result: AttemptResult): Promise<void>;
  /** Highest score for a chapter, or null if never practised. */
  getBest(chapterId: string): Promise<AttemptResult | null>;
}

interface Row {
  chapter_id: string;
  correct: number;
  total: number;
  finished_at: string;
}

export const attemptRepository: AttemptRepository = {
  async saveResult(result) {
    try {
      const best = await attemptRepository.getBest(result.chapterId);
      const better = !best || result.correct / result.total >= best.correct / best.total;
      if (!better) return;

      const db = await getDb();
      await db.runAsync(
        'INSERT OR REPLACE INTO quiz_results (user_id, chapter_id, correct, total, finished_at) VALUES (?, ?, ?, ?, ?)',
        [dbUser(), result.chapterId, result.correct, result.total, result.finishedAt],
      );
    } catch {
      // In non-native or uninitialized db, ignore save
    }
  },

  async getBest(chapterId) {
    try {
      const db = await getDb();
      const row = await db.getFirstAsync<Row>(
        'SELECT chapter_id, correct, total, finished_at FROM quiz_results WHERE user_id = ? AND chapter_id = ?',
        [dbUser(), chapterId],
      );
      return row ? { chapterId: row.chapter_id, correct: row.correct, total: row.total, finishedAt: row.finished_at } : null;
    } catch {
      return null;
    }
  },
};
