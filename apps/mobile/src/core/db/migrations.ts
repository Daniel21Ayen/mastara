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
  {
    // F9b: reject state for changes the server refused, a clock reading with every saved answer, and an index for clean-up.
    version: 2,
    sql: `
      ALTER TABLE outbox ADD COLUMN rejected_at INTEGER;
      ALTER TABLE api_cache ADD COLUMN cached_uptime INTEGER;
      ALTER TABLE api_cache ADD COLUMN cached_boot TEXT;
      CREATE INDEX idx_api_cache_age ON api_cache (user_id, cached_at);
    `,
  },
  {
    // F11: content (materials, tests, exams, COC) is online-first. A student saves it on purpose; the saved copy lives here.
    version: 3,
    sql: `
      CREATE TABLE downloads (
        user_id TEXT NOT NULL,
        unit_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        course_id TEXT,
        title TEXT NOT NULL,
        meta TEXT NOT NULL,
        bytes INTEGER NOT NULL,
        downloaded_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, unit_id)
      );
      CREATE TABLE downloaded_content (
        user_id TEXT NOT NULL,
        key TEXT NOT NULL,
        unit_id TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (user_id, key)
      );
      CREATE INDEX idx_downloads_course ON downloads (user_id, course_id);
      CREATE INDEX idx_downloaded_content_unit ON downloaded_content (user_id, unit_id);

      -- Earlier builds saved every opened lesson, quiz and exam automatically. Under the new rule content is available
      -- offline only after the student downloads it, so those silent copies are removed.
      DELETE FROM api_cache
       WHERE key LIKE 'content.%' OR key LIKE 'quiz.%' OR key LIKE 'exam.%' OR key LIKE 'coc.%';
    `,
  },
];
