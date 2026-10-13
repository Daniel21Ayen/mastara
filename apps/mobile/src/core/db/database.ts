// apps/mobile/src/core/db/database.ts
import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';

import { env } from '@/core/config/env';
import { secureStorage, STORAGE_KEYS } from '@/core/storage/secureStorage';

import { MIGRATIONS } from './migrations';

async function databaseKey(): Promise<string> {
  const existing = await secureStorage.getString(STORAGE_KEYS.dbKey);
  if (existing) return existing;

  const created = `${Crypto.randomUUID()}${Crypto.randomUUID()}`.replace(/-/g, '');
  await secureStorage.setString(STORAGE_KEYS.dbKey, created);
  return created;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.sql);
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }
}

const DB_NAME = 'mastara.db';

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  try {
    if (env.dbEncryption) await db.execAsync(`PRAGMA key = '${await databaseKey()}';`);
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await migrate(db);
    return db;
  } catch (error) {
    await db.closeAsync().catch(() => undefined); // do not leave a half-open connection behind
    throw error;
  }
}

let opening: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * The one shared database connection, opened and upgraded on first use.
 * A failed open is NOT remembered: the next call tries again (before, one failure broke the app until it restarted).
 */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  opening ??= open().catch((error: unknown) => {
    opening = null;
    throw error;
  });
  return opening;
}

/**
 * Last resort when the database cannot be opened (for example the encryption key was lost after a reinstall).
 * Deletes the file; changes not yet sent to the server are lost. The caller must ask the student first.
 */
export async function resetDatabase(): Promise<void> {
  if (opening) {
    const current = await opening.catch(() => null);
    await current?.closeAsync().catch(() => undefined);
  }
  opening = null;
  await SQLite.deleteDatabaseAsync(DB_NAME);
}
