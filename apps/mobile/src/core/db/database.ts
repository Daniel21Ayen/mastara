// apps/mobile/src/core/db/database.ts
import type { SQLiteDatabase } from 'expo-sqlite';

import { env } from '@/core/config/env';
import { secureStorage, STORAGE_KEYS } from '@/core/storage/secureStorage';

import { MIGRATIONS } from './migrations';

const isNative =
  typeof navigator !== 'undefined' &&
  (navigator as any).product === 'ReactNative';

let SQLite: typeof import('expo-sqlite') | null = null;
let Crypto: typeof import('expo-crypto') | null = null;

if (isNative) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    SQLite = require('expo-sqlite');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Crypto = require('expo-crypto');
  } catch {
    SQLite = null;
    Crypto = null;
  }
}

async function databaseKey(): Promise<string> {
  const existing = await secureStorage.getString(STORAGE_KEYS.dbKey);
  if (existing) return existing;

  const uuid1 = Crypto?.randomUUID ? Crypto.randomUUID() : Math.random().toString(36).slice(2);
  const uuid2 = Crypto?.randomUUID ? Crypto.randomUUID() : Math.random().toString(36).slice(2);
  const created = `${uuid1}${uuid2}`.replace(/-/g, '');
  await secureStorage.setString(STORAGE_KEYS.dbKey, created);
  return created;
}

async function migrate(db: SQLiteDatabase): Promise<void> {
  let current = 0;
  try {
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    current = row?.user_version ?? 0;
  } catch (err) {
    console.warn('[Database] Failed to read user_version, starting from 0:', err);
  }

  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.sql);
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }
}

const DB_NAME = 'mastara.db';

async function open(): Promise<SQLiteDatabase> {
  if (!SQLite?.openDatabaseAsync) {
    throw new Error('SQLite is not available in this environment');
  }
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  try {
    if (isNative) {
      if (env.dbEncryption) await db.execAsync(`PRAGMA key = '${await databaseKey()}';`);
      await db.execAsync('PRAGMA journal_mode = WAL;');
    }
    await migrate(db);
    return db;
  } catch (error) {
    await db.closeAsync().catch(() => undefined); // do not leave a half-open connection behind
    throw error;
  }
}

let opening: Promise<SQLiteDatabase> | null = null;
let currentDb: SQLiteDatabase | null = null;

/**
 * The one shared database connection, opened and upgraded on first use.
 * A failed open is NOT remembered: the next call tries again (before, one failure broke the app until it restarted).
 */
export async function getDb(): Promise<SQLiteDatabase> {
  if (currentDb) return currentDb;
  opening ??= open()
    .then((db) => {
      currentDb = db;
      return db;
    })
    .catch((error: unknown) => {
      opening = null;
      currentDb = null;
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
  } else if (currentDb) {
    await currentDb.closeAsync().catch(() => undefined);
  }
  opening = null;
  currentDb = null;
  if (SQLite?.deleteDatabaseAsync) {
    await SQLite.deleteDatabaseAsync(DB_NAME);
  }
}


