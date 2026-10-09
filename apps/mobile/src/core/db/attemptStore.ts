// apps/mobile/src/core/db/attemptStore.ts
import { getDb } from './database';
import { dbUser } from './userScope';

/**
 * Saves the state of work in progress (a practice run or an exam) so it survives the app being closed.
 * Each save is one small write, well under the 10 ms target.
 */
export const attemptStore = {
  async save<T>(key: string, state: T): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      'INSERT OR REPLACE INTO attempts (user_id, key, state, updated_at) VALUES (?, ?, ?, ?)',
      [dbUser(), key, JSON.stringify(state), Date.now()],
    );
  },

  async load<T>(key: string): Promise<T | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ state: string }>('SELECT state FROM attempts WHERE user_id = ? AND key = ?', [
      dbUser(),
      key,
    ]);
    if (!row) return null;
    try {
      return JSON.parse(row.state) as T;
    } catch {
      return null;
    }
  },

  async remove(key: string): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM attempts WHERE user_id = ? AND key = ?', [dbUser(), key]);
  },
};
