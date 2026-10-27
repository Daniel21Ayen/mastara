// apps/mobile/src/core/db/userMigration.ts
import { getDb } from './database';
import { setDbUser } from './userScope';

/**
 * Migrates all local SQLite tables from the temporary localAccountId to the assigned student code (MS0001+).
 * Requirements: REG-12.
 */
export async function migrateLocalUserToStudentId(oldUserId: string, newStudentCode: string): Promise<void> {
  if (!oldUserId || !newStudentCode || oldUserId === newStudentCode) return;

  const db = await getDb();
  await db.withTransactionAsync(async () => {
    // 1. quiz_results: (user_id, chapter_id)
    await db.runAsync(
      'UPDATE OR IGNORE quiz_results SET user_id = ? WHERE user_id = ?;',
      newStudentCode,
      oldUserId,
    );
    await db.runAsync('DELETE FROM quiz_results WHERE user_id = ?;', oldUserId);

    // 2. exam_results: (id, user_id)
    await db.runAsync(
      'UPDATE exam_results SET user_id = ? WHERE user_id = ?;',
      newStudentCode,
      oldUserId,
    );

    // 3. attempts: (user_id, key)
    await db.runAsync(
      'UPDATE OR IGNORE attempts SET user_id = ? WHERE user_id = ?;',
      newStudentCode,
      oldUserId,
    );
    await db.runAsync('DELETE FROM attempts WHERE user_id = ?;', oldUserId);

    // 4. api_cache: (user_id, key)
    await db.runAsync(
      'UPDATE OR IGNORE api_cache SET user_id = ? WHERE user_id = ?;',
      newStudentCode,
      oldUserId,
    );
    await db.runAsync('DELETE FROM api_cache WHERE user_id = ?;', oldUserId);

    // 5. outbox: (id, user_id)
    await db.runAsync(
      'UPDATE outbox SET user_id = ? WHERE user_id = ?;',
      newStudentCode,
      oldUserId,
    );

    // 6. downloads: (user_id, unit_id)
    await db.runAsync(
      'UPDATE OR IGNORE downloads SET user_id = ? WHERE user_id = ?;',
      newStudentCode,
      oldUserId,
    );
    await db.runAsync('DELETE FROM downloads WHERE user_id = ?;', oldUserId);

    // 7. downloaded_content: (user_id, key)
    await db.runAsync(
      'UPDATE OR IGNORE downloaded_content SET user_id = ? WHERE user_id = ?;',
      newStudentCode,
      oldUserId,
    );
    await db.runAsync('DELETE FROM downloaded_content WHERE user_id = ?;', oldUserId);

    // 8. catalog_item: (user_id, id)
    await db.runAsync(
      'UPDATE OR IGNORE catalog_item SET user_id = ? WHERE user_id = ?;',
      newStudentCode,
      oldUserId,
    );
    await db.runAsync('DELETE FROM catalog_item WHERE user_id = ?;', oldUserId);

    // 9. catalog_state: (user_id)
    await db.runAsync(
      'UPDATE OR IGNORE catalog_state SET user_id = ? WHERE user_id = ?;',
      newStudentCode,
      oldUserId,
    );
    await db.runAsync('DELETE FROM catalog_state WHERE user_id = ?;', oldUserId);
  });

  setDbUser(newStudentCode);
}
