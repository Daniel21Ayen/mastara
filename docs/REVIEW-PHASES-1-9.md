# Code review: Phases 1 to 9

Read in full: the offline layer (`core/db`, `core/sync`), the exam timer and flow, the formula path, the domain rules for time and access, the contracts for sync, config and lint. Skimmed: screens and mock data (consistent with the architecture rules). Nothing was run on a device.

**What is good.** Module boundaries and thin routes are followed. Business rules live in `packages/domain` as pure functions (the right place for tests). Every API has an interface and a mock. The outbox idea is sound (UUIDv7 IDs, idempotent server, backoff, per-user rows). Answer saving is one small write. Offline access refuses a clock rolled back. Migrations are append-only.

## High: fix before the exam contract is used by the server

| # | Finding | Where | Fix (phase) |
|---|---|---|---|
| 1 | ✅ *Fixed in F4d (clock keeps running).* **Leaving an exam lets a student restart it.** The design says "timer keeps running if you leave", but `leave()` deletes the saved sitting and the sheet says "Your answers will be lost". Re-entering gives a fresh timer and the same questions: unlimited attempts. | `exams/components/ExamFlow.tsx` `leave()`; `en.json` `exam.leave.body` | Decide the rule, then keep the sitting and its clock running (F4d) |
| 2 | ✅ *Fixed in F4d (answers, elapsed time, duration are uploaded).* **The server cannot verify an exam.** `EXAM_SUBMITTED` sends only title, score, total and a wall-clock time. No answers, no elapsed time, no duration. The SRS says the server decides acceptance; today it could only trust the phone's score. Same for `ATTEMPT_FINISHED` (practice, lower risk). | `ExamFlow.finish`; `usePracticeSession` | Upload answers, `elapsedMs`, `durationMs`; server re-grades (F4d, B4) |
| 3 | ✅ *Fixed in F4c (needs device test).* **Exam clock probably pauses while the phone sleeps.** Hermes `performance.now()` is a monotonic clock that normally does not count deep sleep. `expo-device` uptime (to my recollection `SystemClock.uptimeMillis`) does not either. Lock the phone mid-exam and time may not run. Setting the date back during that gap is the gap in the `downtimeMs` defence (it takes the larger of date and uptime gaps). Please confirm in the `expo-device` source; either way `elapsedRealtime` is the right clock. | `core/timer/monotonicClock.ts`, `uptime.ts` | Native clock (F4c) |

## Medium

| # | Finding | Where | Fix |
|---|---|---|---|
| 4 | ✅ *Fixed in F9b.* `getDb()` caches a **failed** open forever: after one error every later call returns the same rejected promise until the app restarts. | `core/db/database.ts` | Reset `opening` on failure (F9b) |
| 5 | ✅ *Fixed in F9b (refused changes are set aside; order kept per type).* **Outbox never gives up.** A `rejected` change is retried forever, so "pending" never clears. A failed batch penalises every op in it. Ops are not ordered across retries (an earlier op backing off lets a later one go first), which matters for `PROFILE_SAVED`. | `sync/syncWorker.ts`, `outbox.ts` | Terminal state after N rejects; per-type ordering rule (F9b, B6) |
| 6 | ✅ *Fixed in F9b (exact `expiresAt`, clock a date change cannot move back).* **Access expiry uses `daysLeft` (rounded)** plus the phone's date as the cache time. Up to a day of error, and the rollback check relies on the wall clock only. | `domain/access/offlineAccess.ts` | Server sends `expiresAt`; anchor the cache time to the native clock (F9b, F4c, B5) |
| 7 | ✅ *Fixed in F4d.* Exam result `id` is `Date.now()` string: not unique across two quick finishes, not a UUID. | `ExamFlow.finish` | `uuidv7` (F4d) |
| 8 | **Boundaries are not enforced.** ARCHITECTURE says no circular imports "checked by script", but the script is not in the repo and ESLint has no boundary rule. | `eslint.config.mjs` | Add `eslint-plugin-boundaries` with the module table (T0) |
| 9 | **No tests at all.** The domain package is the best place to start. F4b adds the runner (`npm test`) and the first tests. | repo | T0: timer, downtime, offlineAccess, backoff, uuidv7, pricing, grade |
| 10 | **Dependencies are not reproducible.** `expo: "latest"`, `@types/react: "*"`, and the Expo packages are absent from `package.json` (they come from README commands). No lockfile in the zip. | `apps/mobile/package.json` | Commit the lockfile after `expo install`; pin the SDK |

## Low

- ✅ *Fixed in F9b.* `api_cache` grows without limit (no eviction). A cache clean-up belongs in F9b.
- ✅ *Partly fixed in F9b (clear error screen, Try again, Erase with a warning). Warning before sign-out when changes are unsent is still open.* If the secure-store key is lost (reinstall with restored data), the encrypted database cannot be opened, and the **outbox lives in that database**: unsent answers would be lost. Handle open failure deliberately, and warn before sign-out if the outbox is not empty.
- `EXPO_PUBLIC_USE_MOCKS=false` throws when `syncApi.ts` is imported (fine until I1, but the failure should be a clear screen).
- Exam time between the last 500 ms tick and the save is lost (under 0.5 s, in the student's favour). Harmless.
- Several lines exceed Prettier's 100 columns in existing files; run `npm run format` once.

## One thing to confirm in the SRS

Whether leaving an exam on purpose should (a) forfeit it with the score so far, (b) keep the clock running and allow return, or (c) be blocked. Finding 1 needs this answer; the design image suggests (b).
