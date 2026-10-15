# Phase F4d changes (exam integrity)

## Rule chosen (change if the SRS says otherwise)

**Leaving an exam does not stop the clock.** The sitting is kept; the time away counts; the student can come back until time is up. If time runs out while away, the saved answers are submitted automatically. A student can no longer leave and restart with a fresh timer.

## What changed

1. **No more discard on leave.** `ExamFlow.leave()` keeps the saved sitting. The leave sheet now says so (English and Amharic).
2. **Full upload.** `EXAM_SUBMITTED` now carries `sittingId`, `examId`, `answers` (only answered questions), `reason` (`manual`, `timeout`, `overdue`), `durationMs`, `elapsedMs`, `startedAt`, `submittedAt` and the phone's score as `provisional`. The server is meant to re-grade from `answers` and check `elapsedMs` (B4).
3. **One ID per sitting.** `sittingId` is a UUIDv7 made at Start and kept on resume. It is also the local result ID (replaces `Date.now()`). The mock server counts a sitting once even if it arrives in two changes.
4. **Crash-safe order.** Result stored, change queued, saved sitting removed last. A crash in between re-sends the same sitting, counted once.
5. **Abandoned exams get submitted.** `finalizeOverdueExams` runs from the tabs layout (on start, on return to the app, every 60 s) and submits sittings whose time ran out, graded from the saved answers.
6. **Write budget kept.** The questions are saved once per sitting (`examq:<examId>`); only the small sitting record is written with each answer.

## Added

- `packages/domain/src/exam/submission.ts` + `.test.ts` (5 tests): `elapsedAfterDowntime`, `isOverdue`, `withinDuration`, `EXAM_SUBMIT_REASONS`
- `packages/contracts/src/exam.ts`: `submittedAnswerSchema`, `examSubmissionSchema`
- `core/sync/ids.ts` (`newId`), `attemptStore.list(prefix)`
- `modules/exams/lib/`: `submitExam.ts`, `finalizeOverdueExams.ts`, `activeExams.ts`; `hooks/useOverdueExamFinalizer.ts`

## Changed

- `ExamFlow.tsx`, `ExamRunner.tsx`, `lib/savedExam.ts`, `modules/exams/index.ts`, `app/(tabs)/_layout.tsx`
- `core/mock/data/syncServer.ts` (validates the submission, dedupes by sitting)
- `en.json`, `am.json` (`exam.leave.body`; **Amharic needs native review**)
- Docs: README, ROADMAP, ARCHITECTURE, REVIEW

## Verified here

- Domain tests: 20 of 20 pass; domain typecheck clean.
- Typecheck of the exam files against stubbed modules: no errors in `ExamFlow` or `ExamRunner` (remaining messages were from my stubs).
- Both locale files are valid JSON.

## NOT verified

- **The zod schema was not run** (zod is not installed in my sandbox). After `npm install`, run `npm run typecheck`; a mismatch would show up there or as a `rejected` sync result.
- **Nothing ran on a phone.** Test on the development build (F4c):
  1. Start a 30-min exam, answer 3 questions, press back, confirm Leave. Reopen the exam: it resumes with the answers and the time away counted (no fresh timer).
  2. Leave, wait past the exam length (use a short test exam), do not reopen the exam screen: within a minute (or on next app start) a result appears under Progress, and Profile → Sync shows one change.
  3. Kill the app during an exam, reopen: resumes.
  4. Submit normally: one result, one outbox change; `reason` is `manual`.
  5. Answer speed: a tap on an option still feels instant.
- **Exam Instructions** do not mention the new rule yet (needs your wording).
- **Retaking a finished exam** is still allowed (new sitting, new ID). Tell me if past papers should be one-time.
