# Architecture map (Phases 1 to 9 and F4b)

## Folders

```
mastara/
├── package.json · turbo.json · tsconfig.base.json · eslint.config.mjs · .prettierrc · .env.example
├── docs/                 ROADMAP.md · ARCHITECTURE.md
├── packages/             Shared by the app (and later the API and admin portal)
│   ├── ui-tokens/        The ONLY four colours + spacing, radius, type sizes
│   ├── i18n/             English and Amharic strings (keys must match) + {placeholder} support
│   ├── domain/           Pure rules, no screens: lock rule, pricing and quote, purchase rules, reference check,
│   │                     grading, practice and exam sessions, monotonic timer, scoring, math parsing, progress, time-ago
│   └── contracts/        Zod shapes for every API object (auth, profile, content, quiz, exam, order, notification, ticket)
└── apps/mobile/          Expo app
    ├── app/              Thin routes only (Expo Router). Each file renders one module screen
    └── src/
        ├── core/         config · i18n provider · session and route guard · secure storage · device · clocks ·
        │                 db (SQLite, migrations, cache, saved attempts) · sync (outbox, worker, status) · network (online state) ·
        │                 theme · math (KaTeX page builder) · navigation tabs · mock "server" data
        ├── shared/       ui (Button, Text, Card, Sheet, Tabs, Icon …) · forms · hooks (useAsync, useForm …)
        └── modules/      One folder per feature: api (interface + mock) · hooks · components · screens · index.ts
```

## Modules and what they may import

| Module | Purpose | Imports modules |
|---|---|---|
| auth | Login, register, edit account | profile |
| device-lock | Register phone, locked screen, release device | none |
| profile | Profile setup, profile tab, edit academic details | course-list, device-lock, notifications |
| course-list | Course picker and courses API | none |
| my-courses | Course tab: search, filters, tabs, add or remove | course-list, profile |
| home | Card-based Home | notifications |
| courses | Course screen: Material, Tests, Exams | access, exams, my-courses, quizzes |
| reader | Notes reader (English / Amharic) | courses, my-courses |
| quizzes | Quiz 1, 2, 3 and practice | access, assessment, my-courses |
| exams | Mid, Final, Mock and the timed exam flow | access, assessment, my-courses |
| coc | Standalone COC exam | access, exams, my-courses |
| assessment | Shared question, option and feedback components | none |
| access | Locked sheet (Buy opens the Store) | none |
| store | Bundle builder, payment, orders | none |
| notifications | Notification list and unread count | none |
| support | Requests and replies | none |
| progress | Progress tab | exams, my-courses |

There are no circular imports between modules (checked by script). A module is imported only through its `index.ts`.

## Offline layer (Phase 9)

| Piece | File | Job |
|---|---|---|
| Database | `core/db/database.ts`, `migrations.ts` | One SQLite file, opened and upgraded before the app shows (add a migration; never edit a shipped one) |
| Saved work | `core/db/attemptStore.ts`, `shared/hooks/usePersistedReducer.ts` | Saves a practice run or exam after every change and restores it |
| Read cache | `core/db/cache.ts` (`readThrough`, `cacheReads`) | Network first, saved copy when offline. Every module API wraps its reads with it |
| Outbox | `core/sync/outbox.ts` | Queues changes with UUIDv7 IDs; survives restarts |
| Worker | `core/sync/syncWorker.ts`, `SyncProvider.tsx` | Uploads in batches with backoff; one upload at a time |
| Rules | `packages/domain` | `uuidv7`, `retryDelayMs`/`isDue`, `offlineAccess`, `downtimeMs` |

To make a new change work offline: save it locally, then `outbox.enqueue(type, payload)`; add the type to `OUTBOX_TYPES`
and handle it in the server (mock: `core/mock/data/syncServer.ts`).

## Offline hardening (F9b)

| Piece | File | Job |
|---|---|---|
| Safe open | `core/db/database.ts`, `DatabaseProvider.tsx`, `modules/boot/.../DatabaseErrorScreen.tsx` | A failed open is retried; the student sees Try again and, as a last resort, Erase local data (with a warning) |
| Clean-up | `core/db/maintenance.ts` | On every start: saved answers older than 30 days or beyond 500 per student, confirmed changes after 7 days, refused ones after 30 |
| Outbox | `core/sync/outbox.ts`, `packages/domain/src/sync/selectDue.ts` | Refused changes leave the queue (`rejected_at`) and are counted in Profile → Sync; a waiting change holds back newer ones of the same type only |
| Exact expiry | `packages/domain/src/access/offlineAccess.ts` | Server sends `expiresAt`; days left are counted from it |
| Trusted time | `packages/domain/src/time/trustedTime.ts`, `core/db/cache.ts` | Each saved answer stores the uptime clock; offline "now" cannot be moved back by changing the date inside one boot |

## Scrolling pages with a Next button (R4)

| Piece | File | Job |
|---|---|---|
| Scroll helpers | `shared/hooks/useScrollList.ts` | `useScrollList` (scroll to a page, safe jump to a far page) and `useVisibleIndex` (which page is at the top; counts a page when it covers part of the screen, so a very tall lesson is still found) |
| Lessons | `modules/reader` (`useLessonFeed`, `LessonPage`, `ReaderScreen`) | The lessons of a tab on one continuous page, in one language; only the lessons near the screen are built and loaded; Next under each lesson |
| Quiz | `modules/quizzes` (`PracticeQuestionItem`, `usePracticeSession`) | All questions on one page with instant feedback; Next under each, Finish on the last |
| Exams and review | `modules/exams` (`ExamQuestionItem`, `ExamReview`) | One page, Next under each question, Submit at the end |

## Content online and downloads (R3)

| Piece | File | Job |
|---|---|---|
| Rule | `core/downloads/contentGateway.ts` | A downloaded item is read from the phone; otherwise from the server; offline and not downloaded gives `CONTENT_NOT_DOWNLOADED`. Lists offline show only downloads |
| Store | `core/downloads/downloadStore.ts`, migration 3 | `downloads` (one row per item, with its list entry and size) and `downloaded_content` (the saved server answers), per student, inside the optionally encrypted database |
| Transfer | `core/downloads/transfer.ts` | `DownloadUnit` recipe, `downloadUnit`, progress for the buttons; an item is saved completely or not at all |
| Recipes | `courses/lib/topicDownload.ts`, `quizzes/lib/chapterDownload.ts`, `exams/lib/examDownload.ts`, `coc/lib/cocSetDownload.ts` | Each feature says what its item needs, so `core` and the `downloads` module know nothing about features (no circular imports) |
| UI | `modules/downloads` | `DownloadButton` (download, saved check, delete), Downloads screen, hooks |
| Account data | `core/db/cache.ts` (`cacheReads`) | Still automatic: my courses, store, notifications, home |

## Theme: light and dark (R2)

| Piece | File | Job |
|---|---|---|
| Palettes | `packages/ui-tokens/src/colors.ts`, `accents.ts` | `lightColors` and `darkColors` with the same names; `getColors(scheme)`, `getAccents(scheme)`. Tests check text, link, error and icon contrast in both |
| Provider | `core/theme/ThemeProvider.tsx` | Light / Dark / Auto, remembered; also sets the system appearance (keyboard, dialogs) |
| Hooks | `useTheme()`, `createStyles()` | Components read colours from the active theme; a file's styles are built once per scheme and cached |
| Switch | `shared/ui/ThemeSwitch.tsx` | Used in Profile and on the login page |
| Guard | `eslint.config.mjs` | Blocks top-level `StyleSheet.create` in the app |

## Colour and icons (R1)

| Piece | File | Job |
|---|---|---|
| Core colours | `packages/ui-tokens/src/colors.ts` | primary, ink, white, danger: text, brand, buttons, errors |
| Accents | `packages/ui-tokens/src/accents.ts` | Eight decorative colours (`main`, `soft`, `track`) and `accentForKey(id)`; all pass 3:1 against a white icon |
| Tiles | `shared/ui/IconTile.tsx` | `IconTile` (icon, own colour by default via `ICON_ACCENT`), `LetterTile` (course and university initials) |
| Use | course cards, topic rows, quiz chapters, exam rows, Home cards, store, profile, tabs | A course or topic keeps one colour everywhere via `accentForKey(id)` |

## Content protection (R1)

`core/security/ContentProtection.tsx`, mounted in `app/_layout.tsx` while signed in: `usePreventScreenCapture` (Android secure flag; iOS blocks recording and blanks screenshots) plus a masked-identifier watermark (`maskIdentifier` in the domain package).

## Exam clock (F4c)

| Piece | File | Job |
|---|---|---|
| Native clock | `apps/mobile/modules/mastara-clock/` (Kotlin, Swift, `index.ts`) | `elapsedRealtimeMs()` counts time asleep and ignores date settings; `bootId()` changes at each restart (Android) |
| Clock choice | `core/timer/monotonicClock.ts`, `uptime.ts` | Native clock when present, JavaScript clock in Expo Go |
| Downtime rule | `packages/domain/src/exam/downtime.ts` | Time the app was closed = larger of date gap and uptime gap; uptime only counts inside one boot |

## Exam sitting (F4d)

| Piece | File | Job |
|---|---|---|
| Sitting ID | `core/sync/ids.ts` (`newId`) | UUIDv7 made when the exam starts; the same ID is kept on resume, so the result and the server count it once |
| Save | `exams/components/ExamRunner.tsx`, `lib/savedExam.ts` | Small sitting record saved with every answer; the questions are saved once under `examq:<examId>` |
| Submit | `exams/lib/submitExam.ts` | Stores the result and queues `EXAM_SUBMITTED` with answers, `elapsedMs`, `durationMs`, `reason`, `sittingId` |
| Overdue | `exams/lib/finalizeOverdueExams.ts`, `hooks/useOverdueExamFinalizer.ts` | Submits sittings whose time ran out while away (runs from the tabs layout) |
| Rules | `packages/domain/src/exam/submission.ts` | `elapsedAfterDowntime`, `isOverdue`, `withinDuration` (also used by the server) |

## Formula rendering (F4b)

| Piece | File | Job |
|---|---|---|
| Parse | `packages/domain/src/math/parseMath.ts` | Splits text into plain text and `$inline$` / `$$block$$` formulas |
| Decide | `packages/domain/src/math/mathLayout.ts` (`needsLayout`) | Simple formula (`E = mc^2`, Greek, small scripts) stays native Unicode text. Fraction, root, matrix, limits go to KaTeX |
| Build | `core/math/katexMarkup.ts`, `katexDocument.ts` | KaTeX renders to HTML in JS; the page adds the stylesheet (fonts embedded) and a height reporter. Content-security policy blocks all network |
| Assets | `scripts/build-katex-assets.mjs` | Writes `katexAssets.generated.ts` from the installed `katex` package (not committed; runs before start, typecheck and test) |
| Draw | `shared/ui/KatexParagraph.tsx` | One offline web view per paragraph that needs layout; ignores touches; hidden from screen readers, which get a text label |
| Route | `shared/ui/RichText.tsx` | Picks native text or `KatexParagraph` for each paragraph |

## Rules

1. Only four colours exist: `palette` in `packages/ui-tokens/src/colors.ts`. Tints use `withAlpha`. No hex values in screens.
2. Screens stay thin: data through `useAsync`, forms through `useForm`, rules from `packages/domain`.
3. Every module API is an interface with a mock; set `EXPO_PUBLIC_USE_MOCKS=false` when the real API exists.
4. All visible text is in `packages/i18n`; English and Amharic keys must match (the compiler checks it).
5. Every code file starts with a comment giving its own path.
6. Writes that need the server (sign in, buy) fail with a clear offline message; everything else is saved locally first.
