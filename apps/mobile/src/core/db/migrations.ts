// apps/mobile/src/core/db/migrations.ts
export interface Migration {
  version: number;
  sql: string;
}

/** Add new migrations at the end. Never edit one that has shipped: the phone's database may already have it. */
export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE quiz_results (
        user_id TEXT NOT NULL, chapter_id TEXT NOT NULL,
        correct INTEGER NOT NULL, total INTEGER NOT NULL, finished_at TEXT NOT NULL,
        PRIMARY KEY (user_id, chapter_id)
      );
      CREATE TABLE exam_results (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
        correct INTEGER NOT NULL, total INTEGER NOT NULL, submitted_at TEXT NOT NULL
      );
      CREATE INDEX idx_exam_results_user ON exam_results (user_id, submitted_at);
      CREATE TABLE attempts (
        user_id TEXT NOT NULL, key TEXT NOT NULL, state TEXT NOT NULL, updated_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, key)
      );
      CREATE TABLE api_cache (
        user_id TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, cached_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, key)
      );
      CREATE TABLE outbox (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL, payload TEXT NOT NULL,
        created_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
        last_attempt_at INTEGER, last_error TEXT, applied_at INTEGER
      );
      CREATE INDEX idx_outbox_pending ON outbox (user_id, applied_at);
    `,
  },
];
