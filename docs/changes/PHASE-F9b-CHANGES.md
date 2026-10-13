# Phase F9b changes (offline hardening)

## What was fixed

1. **Database open can recover.** One failed open used to be remembered, so every later call failed until the app restarted, and the splash screen never ended. Now a failed open is retried, a half-open connection is closed, and the student sees a clear screen: **Try again**, and as a last resort **Erase local data** (confirmation sheet; unsent changes are lost, the account and paid courses are safe on the server). Both languages (Amharic needs native review).
2. **Outbox stops retrying refused changes.** If the server answers `rejected`, the change leaves the queue at once (`rejected_at`), is kept for 30 days for support, and Profile → Sync shows "n changes were refused…". The "pending" count now clears. A damaged payload is set aside instead of blocking everything behind it.
3. **Order is kept per type.** A change waiting to retry holds back newer changes of the SAME type (so an old "save profile" can never arrive after a newer one). Other types keep flowing. (`selectDueOps`, tested.)
4. **Exact access expiry.** The server (mock) now sends `expiresAt`. Offline, paid access ends at that exact moment and days left count down from it. Before, a rounded day count could give up to a day of extra access. Older saved data without `expiresAt` still works.
5. **A date set back gains nothing offline.** Every saved server answer now stores the uptime clock and the restart marker (F4c). Offline, "now" is the later of the calendar date and the cached time plus the uptime that really passed (`trustedNowMs`, tested). After a restart only the calendar date is available (the older rollback check still applies).
6. **Clean-up.** On every start: saved answers older than 30 days or beyond the newest 500 per student are removed, confirmed outbox rows after 7 days, refused ones after 30. Pending changes, exam sittings, results and practice progress are never touched.

## Database migration

Version 2 (appended; version 1 untouched): `outbox.rejected_at`, `api_cache.cached_uptime`, `api_cache.cached_boot`, index `idx_api_cache_age`. Existing phones upgrade on first start.

## Added

- Domain: `sync/selectDue.ts`, `time/trustedTime.ts` (+ tests), `access/offlineAccess.ts` rewritten (+ tests), constants `CACHE_MAX_AGE_DAYS`, `CACHE_MAX_ROWS`, `APPLIED_OP_KEEP_DAYS`, `REJECTED_OP_KEEP_DAYS`
- Mobile: `core/db/maintenance.ts`, `modules/boot/screens/DatabaseErrorScreen.tsx`
- Contract: `MyCourse.expiresAt`

## Changed

`core/db/database.ts` (retry, close on failure, `resetDatabase`), `DatabaseProvider.tsx` (error state, maintenance), `cache.ts` (clock anchor), `migrations.ts`, `core/sync/outbox.ts`, `syncWorker.ts`, `SyncProvider.tsx`, `SyncStatusCard.tsx`, `my-courses/api/myCourses.api.ts`, mock data (`commerce.ts`, `progress.ts`), `app/_layout.tsx`, both language files, docs.

## Verified here

- Domain tests **39 of 39** pass (new: ordering, trusted time, exact expiry, grace period, clock rollback); domain type-checks.
- The migration and all four clean-up statements were run on a **real SQLite** (3.45): per-student cap, age cut-off, pending and recent rows untouched, pending count excludes refused changes.
- Changed mobile files type-check against stubbed Expo types (no errors).

## NOT verified (needs your phone)

1. **Upgrade.** Install over a build from an earlier phase: the app opens, data is still there (migration 2).
2. **Refused change.** In the mock server make one op return `rejected` (for example send a profile it refuses); it disappears from "waiting" and a red line appears in Profile → Sync.
3. **Date set back offline.** Open My Courses online, go offline (airplane mode), set the phone date back one day: paid access must not grow. (Needs the F4c development build for the uptime clock; in Expo Go it falls back to the calendar date.)
4. **Error screen.** Corrupt or lock the database file on a test phone (or throw in `open()` once): Try again recovers; Erase shows the warning and restarts empty.
5. **Maintenance.** After a month of use the database stays small; nothing needed is missing offline.

## Still open (not part of F9b)

- Warn before sign-out or "Release Device" when changes are still unsent.
- Rejected changes are only counted; there is no screen listing them yet (the admin portal and support tools in F10 are the place).
- The real server must send `expiresAt` (B5) and keep treating a repeated op ID or `sittingId` as already applied (B6/B4).
