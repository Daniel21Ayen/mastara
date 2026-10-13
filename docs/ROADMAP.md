# Build roadmap

Front-end first on mock data, then the backend, then integration. Every phase is small, ends with something runnable and has an explicit "done when".

## Front-end (mock data)

| Phase | Scope | Done when |
|---|---|---|
| F1–F9 | ✅ Setup, onboarding, Home and My Courses, Course screen, quizzes, exams and COC, store, profile and support, offline database and outbox | Answers survive app kill |
| **F4b** | ✅ **KaTeX renderer** (this change): `needsLayout` rule, offline KaTeX page, `KatexParagraph`, `RichText` routing | Fractions, roots, matrices and limits lay out offline. **Device gate:** checked on a 2–3 GB Android phone (memory, Amharic text) |
| R1 | ✅ **Refactor and polish** (code done; needs a device test): Continue Learning removed, Review Answers after exams and COC, screenshot blocking and watermark, accent colours and icons everywhere | See `docs/changes/PHASE-R1-CHANGES.md` |
| R2 | ✅ **Student portal refactor** (code done; needs a device test): Show/Hide explanations, COC as a Home card, admin-set exam time, scrollable exams and review, light and dark themes on every page | See `docs/changes/PHASE-R2-CHANGES.md` |
| R3 | ✅ **Content online and downloads** (code done; needs a device test): online-first content, per-item download and delete, Downloads screen, no language tabs, app-size controls and gate | See `docs/changes/PHASE-R3-CHANGES.md` |
| R4 | ✅ **Scrolling pages with a Next button** (code done; needs a device test): lessons, quizzes, exams, COC and review scroll continuously, with Next under each page | See `docs/changes/PHASE-R4-CHANGES.md` |
| F4c | ✅ **Native exam clock** (code done; needs a device test). Local Expo module `mastara-clock`: Android `SystemClock.elapsedRealtime()`, iOS continuous clock, plus a reboot counter. Replaces `monotonicClock.ts` and `uptime.ts`. Falls back to the JS clock in Expo Go | Locking the phone for 10 minutes mid-exam costs 10 minutes; changing the date gains nothing. Needs a development build |
| F4d | ✅ **Exam integrity** (code done; needs a device test). (1) Decide the "leave exam" rule (the design says the timer keeps running; the code discards the sitting). (2) `EXAM_SUBMITTED` carries answers, elapsed time and duration. (3) Result IDs become UUIDv7 | Leaving and re-entering cannot restart the clock; the server can re-grade from the upload |
| F9b | ✅ **Offline hardening** (code done; needs a device test). `getDb()` retries after a failed open; outbox gives up on permanently rejected changes; access carries `expiresAt` instead of `daysLeft`; read-cache clean-up | A rejected change stops retrying and the pending badge clears |
| T0 | **Tests for the pure rules** in `packages/domain`: timer, downtime, offline access, backoff, UUIDv7, pricing, grading | `npm test` passes in CI |
| F10a | **Admin scaffold.** Next.js app, tokens, sidebar layout, mock login and route guard, API interface + mock pattern like mobile | Login → empty Dashboard shell |
| F10b | Dashboard and **Students** (list, profile, device revoke, grant or extend access) | Matches admin designs 2, 3 and 4 |
| F10c | **Courses** and **Content** (bilingual editor, formula preview using `parseMath` and KaTeX, free-trial flags, publish) | Designs 5 and 6 |
| F10d | **Scan to PDF** (4 steps) and **Questions and COC sets**, including the **time (minutes) of every exam and COC set** (5 to 240, validated by `isValidExamMinutes`) | Designs 7 and 8 |
| F10e | **Payment queue and review**, **Products and Pricing**, **Audit log** | Designs 9 to 12 |

## Backend

| Phase | Scope |
|---|---|
| B1 | API setup: NestJS, PostgreSQL schema (Prisma), local Redis queue, health check |
| B2 | Identity and device lock |
| B3 | Catalog, My Course List, content |
| B4 | Assessment: quizzes, exams, COC, attempts (server re-grades from uploaded answers) |
| B5 | Commerce: products, orders, receipts, entitlements, expiry job |
| B6 | Sync endpoint, scan-to-PDF worker, notifications, audit |
| I1 | Connect mobile and admin to the real API (turn `EXPO_PUBLIC_USE_MOCKS` off) |
| I2 | Hardening: security, app size **under 20 MB** (gate: `check-app-size.mjs`), memory, pilot |

## Order and why

F4b → F4c → F4d first: they change the exam contract, so doing them before F10 and the backend avoids rebuilding the exam upload and the admin question tools twice. F9b and T0 are one-day tasks that can run in parallel. F10a to F10e then B1 onward.

## Still open

- Encrypted database needs a development build (`EXPO_PUBLIC_DB_ENCRYPTION=true`). F4c needs one too, so build it once.
- Amharic font inside formula paragraphs uses the phone's system font (see F4b notes).
