// apps/mobile/src/core/db/attemptStore.ts
import { getDb } from './database';
import { dbUser } from './userScope';

/**
 * Saves the state of work in progress (a practice run or an exam) so it survives the app being closed.
 * Each save is one small write, well under the 10 ms target.
 */
export const attemptStore = {
  async save<T>(key: string, state: T): Promise<void> {
    try {
      const db = await getDb();
      await db.runAsync(
        'INSERT OR REPLACE INTO attempts (user_id, key, state, updated_at) VALUES (?, ?, ?, ?)',
        [dbUser(), key, JSON.stringify(state), Date.now()],
      );
    } catch {
      // In non-native or uninitialized db, ignore save
    }
  },

  async load<T>(key: string): Promise<T | null> {
    try {
      const db = await getDb();
      const row = await db.getFirstAsync<{ state: string }>('SELECT state FROM attempts WHERE user_id = ? AND key = ?', [
        dbUser(),
        key,
      ]);
      if (!row) return null;
      return JSON.parse(row.state) as T;
    } catch {
      return null;
    }
  },

  /** Every saved item whose key starts with `prefix` (for example all unfinished exams). */
  async list<T>(prefix: string): Promise<{ key: string; state: T }[]> {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<{ key: string; state: string }>(
        "SELECT key, state FROM attempts WHERE user_id = ? AND key LIKE ? ESCAPE '\\'",
        [dbUser(), `${prefix.replace(/[%_\\]/g, '\\$&')}%`],
      );
      const items: { key: string; state: T }[] = [];
      for (const row of rows) {
        try {
          items.push({ key: row.key, state: JSON.parse(row.state) as T });
        } catch {
          // A damaged row is skipped; it cannot be resumed.
        }
      }
      return items;
    } catch {
      return [];
    }
  },

  async remove(key: string): Promise<void> {
    try {
      const db = await getDb();
      await db.runAsync('DELETE FROM attempts WHERE user_id = ? AND key = ?', [dbUser(), key]);
    } catch {
      // ignore
    }
  },
};
