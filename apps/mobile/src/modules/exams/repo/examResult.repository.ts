// apps/mobile/src/modules/exams/repo/examResult.repository.ts
import { getDb } from '@/core/db/database';
import { dbUser } from '@/core/db/userScope';

export interface ExamResultRecord {
  id: string;
  /** Display title, for example "AASTU (Mid)" or "COC Set 1". */
  title: string;
  correct: number;
  total: number;
  submittedAt: string;
}

/** Where submitted exams are stored. Same interface as before; now saved on the phone (SQLite). */
export interface ExamResultRepository {
  save(record: ExamResultRecord): Promise<void>;
  /** Newest first. */
  list(): Promise<ExamResultRecord[]>;
}

interface Row {
  id: string;
  title: string;
  correct: number;
  total: number;
  submitted_at: string;
}

export const examResultRepository: ExamResultRepository = {
  async save(record) {
    const db = await getDb();
    await db.runAsync(
      'INSERT OR REPLACE INTO exam_results (id, user_id, title, correct, total, submitted_at) VALUES (?, ?, ?, ?, ?, ?)',
      [record.id, dbUser(), record.title, record.correct, record.total, record.submittedAt],
    );
  },

  async list() {
    const db = await getDb();
    const rows = await db.getAllAsync<Row>(
      'SELECT id, title, correct, total, submitted_at FROM exam_results WHERE user_id = ? ORDER BY submitted_at DESC',
      [dbUser()],
    );
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      correct: row.correct,
      total: row.total,
      submittedAt: row.submitted_at,
    }));
  },
};
