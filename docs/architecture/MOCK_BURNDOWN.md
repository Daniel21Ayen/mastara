# Mock Burndown Tracker & Real API Migration

Tracking the complete elimination of in-bundle mocks across mobile and admin applications in favor of the canonical real API contracts.

## Burndown Summary Table

| Module | Mobile Files | Admin Files | Total Initial | Current Remaining | Status | Weekly Count |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth** | 2 | 1 | 3 | 0 | Converted | 0 |
| **Academic Scope** | 1 | 1 | 2 | 0 | Converted | 0 |
| **Courses & Catalog** | 2 | 1 | 3 | 0 | Converted | 0 |
| **Home** | 1 | 1 | 2 | 0 | Converted | 0 |
| **Content** | 1 | 1 | 2 | 0 | Converted | 0 |
| **Tests (Quizzes)** | 1 | 1 | 2 | 0 | Converted | 0 |
| **Exams** | 1 | 1 | 2 | 0 | Converted | 0 |
| **COC** | 1 | 0 | 1 | 0 | Converted | 0 |
| **Store / Commerce** | 1 | 2 | 3 | 0 | Converted | 0 |
| **Profile & Students**| 1 | 1 | 2 | 0 | Converted | 0 |
| **Platform (Sync, Support, Device, Audit)** | 4 | 5 | 9 | 0 | Converted | 0 |
| **TOTAL** | **16** | **14** | **30** | **0** | **100% Real API** | **0 Remaining** |

---

## 1. Freeze the Contract (`packages/contracts`)
Defined canonical runtime Zod schemas and TypeScript types in `packages/contracts/src/canonicalContracts.ts` and re-exported from `packages/contracts/src/index.ts`:
- `courseCanonicalSchema` / `CourseCanonical`
- `contentCanonicalSchema` / `ContentCanonical`
- `universityCanonicalSchema` / `UniversityCanonical`
- `programCanonicalSchema` / `ProgramCanonical`
- `semesterCanonicalSchema` / `SemesterCanonical`
- `examCanonicalSchema` / `ExamCanonical`
- `testCanonicalSchema` / `TestCanonical`
- `cocCanonicalSchema` / `CocCanonical`
- `entitlementTokenPayloadSchema` / `signedEntitlementTokenSchema`

## 2. CI Gate: Zero Mocks in Production (`scripts/ci-check-mocks.mjs`)
- Enforced via `npm run check:mocks`.
- Fails the build if any directory named `mock` or `mocks` exists inside `apps/mobile/src` or `apps/admin-web/src`.
- Fails the build if any non-test file imports from `mock/`, `mocks/`, or `core/mock`.
- Fails the build if any non-test file contains `useMocks` branch conditions.
- Dev mocks are relocated to `apps/mobile/dev-mocks` and `apps/admin-web/dev-mocks`, strictly outside production application source trees.

## 3. Explicit Offline Account Lifecycle
- Two states: `LOCAL_ONLY` (registration, offline login, offline profile editing) and `REGISTERED_REMOTE` (unlocked upon first purchase).
- Cryptographic PBKDF2-SHA256 password hashing with 16-byte random salt and constant-time verification.
- Network spy unit test (`apps/mobile/src/modules/auth/offlineAccount.test.ts`) verifies **zero student-data requests** before purchase.
- Outbox flushes are gated until phone registration succeeds.

## 4. Sync Engine Modernization (Zero Polling)
- Replaced the 30-second `setInterval` polling loop with reactive trigger listeners:
  - NetInfo network connectivity status transitions (`subscribeOnline`).
  - App state transitions to foreground (`AppState === 'active'`).
  - Exponential backoff with jitter (+/- 20%) on sync errors.
- Separated Content Sync from Outbox mutations:
  - Content Sync (`apps/mobile/src/core/sync/contentSync.ts`) uses version/ETag delta checks across catalog, pricing, courses, and home summary, updating SQLite cache (`cacheStore`).
  - Outbox flushes only after phone registration (`REGISTERED_REMOTE`).
- Honest Learning Status UI in `SyncStatusCard.tsx` showing live connection badge, pending mutations, rejected mutations, last sync timestamp, and on-demand sync trigger.

## 5. Signed Entitlement Tokens & Anti-Rollback Defense
- Cryptographic Ed25519 asymmetric token signing and offline verification (`packages/domain/src/entitlement/signedEntitlement.ts`).
- Server endpoint: `GET /commerce/entitlements/token`.
- Payload contains `studentId`, `courseIds`, `issuedAtMs`, `serverTimeMs`, `expiresAtMs`.
- App verifies signature offline with embedded public key and checks `last_seen_server_time`: if device clock is wound backward before `last_seen_server_time` or token's `serverTimeMs`, access is rejected immediately with `CLOCK_ROLLBACK_DETECTED`.

## 6. Parity Integration Tests (`apps/api/test/parity.spec.ts`)
Comprehensive automated parity tests assert admin actions directly reflect student visibility:
1. **Universities**: Admin create -> Student visible; Admin inactive -> Student hidden.
2. **Programs**: Admin create -> Student visible; Admin inactive -> Student hidden.
3. **Semesters**: Admin create -> Student visible; Admin inactive -> Student hidden.
4. **Courses**: Admin create -> Student visible; Admin inactive -> Student hidden.
5. **Content**: Admin create topic -> Student visible; Admin inactive -> Student hidden.
6. **Exams**: Admin create exam -> Student visible; Admin inactive -> Student hidden.
7. **Tests (Quizzes)**: Admin create quiz -> Student visible; Admin inactive -> Student hidden.
8. **COCs**: Admin create COC set -> Student visible; Admin inactive -> Student hidden.
Result: **16/16 tests passing**.

## 7. Resolution of "Nothing Displays" on First Launch / Clean Install
- Fixed empty state on fresh student accounts (where `studentCourses` and `profile.courseIds` are empty) in `apps/api/src/modules/learning/services/learning.service.ts` and `apps/mobile/src/modules/my-courses/hooks/useMyCourses.ts`.
- Automatically falls back to published courses matching the student's semester and stream preference.
- Every course renders with a `Free`, `Paid`, or `Locked` badge in `CourseCard.tsx`.
