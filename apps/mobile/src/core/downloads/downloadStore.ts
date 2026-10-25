// apps/mobile/src/core/downloads/downloadStore.ts
import { utf8Bytes } from '@mastara/domain';

import { dbUser, getDb } from '@/core/db';

/** What can be downloaded. One "unit" is what a student sees as one item: a course, a lesson, a quiz chapter, an exam, a COC set. */
export type DownloadKind = 'COURSE' | 'TOPIC' | 'QUIZ_CHAPTER' | 'EXAM' | 'COC_SET';

/** One saved server answer that belongs to a unit. `key` is the API call it answers (see contentKey). */
export interface DownloadEntry {
  key: string;
  value: unknown;
}

export interface DownloadedUnit {
  unitId: string;
  kind: DownloadKind;
  courseId: string | null;
  title: string;
  /** The list entry (what the server returned in the list), so the list can be shown offline. */
  meta: unknown;
  bytes: number;
  downloadedAt: number;
}

interface UnitRow {
  unit_id: string;
  kind: DownloadKind;
  course_id: string | null;
  title: string;
  meta: string;
  bytes: number;
  downloaded_at: number;
}

const listeners = new Set<() => void>();
const notify = (): void => listeners.forEach((listener) => listener());

function toUnit(row: UnitRow): DownloadedUnit {
  return {
    unitId: row.unit_id,
    kind: row.kind,
    courseId: row.course_id,
    title: row.title,
    meta: JSON.parse(row.meta) as unknown,
    bytes: row.bytes,
    downloadedAt: row.downloaded_at,
  };
}

/**
 * Content the student chose to keep on the phone, per student, inside the (optionally encrypted) database.
 * Content is online-first: nothing is saved here unless the student taps Download.
 */
export const downloadStore = {
  /** Saves or replaces a unit and its answers in one step: a unit is either complete or absent. */
  async saveUnit(unit: Omit<DownloadedUnit, 'bytes' | 'downloadedAt'>, entries: readonly DownloadEntry[]): Promise<void> {
    const db = await getDb();
    const user = dbUser();
    const serialized = entries.map((entry) => ({ key: entry.key, value: JSON.stringify(entry.value ?? null) }));
    const bytes = serialized.reduce((sum, entry) => sum + utf8Bytes(entry.value), 0);

    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM downloaded_content WHERE user_id = ? AND unit_id = ?', [user, unit.unitId]);
      for (const entry of serialized) {
        await db.runAsync('INSERT OR REPLACE INTO downloaded_content (user_id, key, unit_id, value) VALUES (?, ?, ?, ?)', [
          user,
          entry.key,
          unit.unitId,
          entry.value,
        ]);
      }
      await db.runAsync(
        'INSERT OR REPLACE INTO downloads (user_id, unit_id, kind, course_id, title, meta, bytes, downloaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [user, unit.unitId, unit.kind, unit.courseId, unit.title, JSON.stringify(unit.meta ?? null), bytes, Date.now()],
      );
    });
    notify();
  },

  /** The saved answer for an API call, or `found: false`. A saved `null` (for example "not found") is still a saved answer. */
  async getContent<T>(key: string): Promise<{ found: true; value: T } | { found: false }> {
    try {
      const db = await getDb();
      const row = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM downloaded_content WHERE user_id = ? AND key = ?',
        [dbUser(), key],
      );
      if (!row) return { found: false };
      return { found: true, value: JSON.parse(row.value) as T };
    } catch {
      return { found: false }; // a damaged copy or missing db is treated as not downloaded
    }
  },

  async list(): Promise<DownloadedUnit[]> {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<UnitRow>(
        'SELECT unit_id, kind, course_id, title, meta, bytes, downloaded_at FROM downloads WHERE user_id = ? ORDER BY downloaded_at DESC',
        [dbUser()],
      );
      return rows.map(toUnit);
    } catch {
      return [];
    }
  },

  /** Downloaded units of one kind (and course), with their list entries, for showing a list offline. */
  async listByKind<M>(kind: DownloadKind, courseId?: string): Promise<{ unit: DownloadedUnit; meta: M }[]> {
    const units = (await this.list()).filter((unit) => unit.kind === kind && (courseId === undefined || unit.courseId === courseId));
    return units.map((unit) => ({ unit, meta: unit.meta as M }));
  },

  async ids(): Promise<ReadonlySet<string>> {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<{ unit_id: string }>('SELECT unit_id FROM downloads WHERE user_id = ?', [dbUser()]);
      return new Set(rows.map((row) => row.unit_id));
    } catch {
      return new Set();
    }
  },

  async totalBytes(): Promise<number> {
    try {
      const db = await getDb();
      const row = await db.getFirstAsync<{ total: number | null }>('SELECT SUM(bytes) AS total FROM downloads WHERE user_id = ?', [
        dbUser(),
      ]);
      return row?.total ?? 0;
    } catch {
      return 0;
    }
  },

  /** Total bytes used by downloads for a specific course. */
  async courseBytes(courseId: string): Promise<number> {
    try {
      const db = await getDb();
      const row = await db.getFirstAsync<{ total: number | null }>(
        'SELECT SUM(bytes) AS total FROM downloads WHERE user_id = ? AND (course_id = ? OR unit_id = ?)',
        [dbUser(), courseId, `COURSE:${courseId}`],
      );
      return row?.total ?? 0;
    } catch {
      return 0;
    }
  },

  /** Download sizes grouped by course for storage management. */
  async listCourseDownloads(): Promise<{ courseId: string; title: string; bytes: number; count: number }[]> {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<{ course_id: string; title: string; total_bytes: number; count: number }>(
        `SELECT
           COALESCE(course_id, REPLACE(unit_id, 'COURSE:', '')) AS course_id,
           title,
           SUM(bytes) AS total_bytes,
           COUNT(*) AS count
         FROM downloads
         WHERE user_id = ? AND (course_id IS NOT NULL OR unit_id LIKE 'COURSE:%')
         GROUP BY COALESCE(course_id, REPLACE(unit_id, 'COURSE:', ''))`,
        [dbUser()],
      );
      return rows.map((r) => ({
        courseId: r.course_id,
        title: r.title,
        bytes: r.total_bytes,
        count: r.count,
      }));
    } catch {
      return [];
    }
  },


  async remove(unitId: string): Promise<void> {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM downloaded_content WHERE user_id = ? AND unit_id = ?', [dbUser(), unitId]);
      await db.runAsync('DELETE FROM downloads WHERE user_id = ? AND unit_id = ?', [dbUser(), unitId]);
    });
    notify();
  },

  /** Removes all downloaded content, units, and cache for a course, enabling Download state to reappear. */
  async removeCourse(courseId: string): Promise<void> {
    const db = await getDb();
    const user = dbUser();
    await db.withTransactionAsync(async () => {
      const rows = await db.getAllAsync<{ unit_id: string }>(
        'SELECT unit_id FROM downloads WHERE user_id = ? AND (course_id = ? OR unit_id = ?)',
        [user, courseId, `COURSE:${courseId}`],
      );
      for (const row of rows) {
        await db.runAsync('DELETE FROM downloaded_content WHERE user_id = ? AND unit_id = ?', [user, row.unit_id]);
      }
      await db.runAsync(
        'DELETE FROM downloads WHERE user_id = ? AND (course_id = ? OR unit_id = ?)',
        [user, courseId, `COURSE:${courseId}`],
      );
    });
    notify();
  },

  async isCourseDownloaded(courseId: string): Promise<boolean> {
    try {
      const db = await getDb();
      const row = await db.getFirstAsync<{ unit_id: string }>(
        'SELECT unit_id FROM downloads WHERE user_id = ? AND unit_id = ?',
        [dbUser(), `COURSE:${courseId}`],
      );
      return Boolean(row);
    } catch {
      return false;
    }
  },

  async removeAll(): Promise<void> {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM downloaded_content WHERE user_id = ?', [dbUser()]);
      await db.runAsync('DELETE FROM downloads WHERE user_id = ?', [dbUser()]);
    });
    notify();
  },

  /** Called when the downloads change, so lists and buttons can refresh. */
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
