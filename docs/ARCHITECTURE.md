# Architecture map (Phases 1 to 12)

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
├── apps/mobile/          Expo app (student)
└── apps/admin-web/       Next.js admin portal (Phase 11 on)
    ├── app/              Thin routes only (Expo Router). Each file renders one module screen
    └── src/
        ├── core/         config · i18n provider · session and route guard · secure storage · device · clocks ·
        │                 db (SQLite, migrations, cache, saved attempts) · sync (outbox, worker, status) · network (online state) ·
        │                 theme · navigation tabs · mock "server" data
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

## Formulas and the exam clock (Phase 10)

| Piece | File | Job |
|---|---|---|
| Formula switch | `shared/ui/RichText.tsx` | Text with `$` formulas uses KaTeX when bundled; `math="unicode"` forces plain text (answer options) |
| KaTeX view | `shared/ui/math/KatexView.tsx` | One WebView per text block, grows to fit, blocks navigation, no internet |
| Page builder | `shared/ui/math/buildKatexHtml.ts` | Pure: builds the offline page; text is added as text nodes, never as HTML |
| Asset build | `scripts/build-katex-assets.mjs` | Inlines KaTeX script, styles and 12 fonts into `katex.generated.ts` (a placeholder is committed) |
| Plain fallback | `shared/ui/MathSpan.tsx`, `domain/math/latexToUnicode.ts` | Unicode text when KaTeX is not built |
| Clock | `core/timer/monotonicClock.ts`, `nativeClock.ts`, `uptime.ts` | Native phone clock when present, JavaScript clock otherwise |
| Native module | `modules/mastara-clock/` | Kotlin and Swift: `elapsedRealtimeMs()` |

## Rules

1. Only four colours exist: `palette` in `packages/ui-tokens/src/colors.ts`. Tints use `withAlpha`. No hex values in screens.
2. Screens stay thin: data through `useAsync`, forms through `useForm`, rules from `packages/domain`.
3. Every module API is an interface with a mock; set `EXPO_PUBLIC_USE_MOCKS=false` when the real API exists.
4. All visible text is in `packages/i18n`; English and Amharic keys must match (the compiler checks it).
5. Every code file starts with a comment giving its own path.
6. Writes that need the server (sign in, buy) fail with a clear offline message; everything else is saved locally first.

## Admin web (Phase 11, F11a)

```
apps/admin-web/
├── next.config.ts · tsconfig.json · next-env.d.ts · .env.example
└── src/
    ├── middleware.ts        Role guard: signed-out → /login, signed-in on /login → /dashboard
    ├── app/                 Thin routes only
    │   ├── layout.tsx       Fonts, global CSS, theme variables
    │   ├── (auth)/login/    → modules/auth
    │   └── (portal)/        layout reads the session and wraps pages in the shell
    │       ├── dashboard/   → modules/dashboard
    │       ├── students/ + students/[id]/   → modules/students
    │       └── catalog/courses · content · scan-to-pdf · questions ·
    │           commerce/payments · commerce/pricing · audit    → modules/coming-soon (until their phase)
    ├── core/
    │   ├── config/          env (NEXT_PUBLIC_USE_MOCKS, NEXT_PUBLIC_API_URL)
    │   ├── theme/           ui-tokens → CSS variables (`var(--color-primary)` …), rendered once in the root layout
    │   ├── i18n/            adminText / adminTextFor (English; strings in packages/i18n/src/admin/en.json)
    │   ├── session/         cookie (encode, decode, safeNextPath) · readSession (server) · SessionProvider (client)
    │   ├── format/          formatDate (Addis Ababa time), agoText
    │   ├── navigation/      ADMIN_NAV (sidebar order and routes) · activeNavId
    │   ├── network/         ApiError (same codes as the app)
    │   └── mock/            delay · data/ (admin accounts, audit log store, catalog, students store, dashboard numbers)
    ├── shared/              ui (Button, TextField, TextArea, SelectField, Card, Badge, PageHeader, StateMessage, DataTable, Pagination, DescriptionList, Modal) · hooks (useAsync)
    └── modules/             auth · shell · dashboard · students · coming-soon  (api interface + mock · hooks · components · screens · index.ts)
```

| Module | Purpose | Imports modules |
|---|---|---|
| auth | Admin login form and mock sign-in | none |
| shell | Sidebar, top bar (search, log out), drawer on small screens | none |
| dashboard | Headline numbers, new-students chart, needs-attention list, recent activity | none |
| students | Students list (search, filters, pages), student profile, suspend / reactivate, revoke device, grant or extend access, add student | none |
| coming-soon | Stand-in page for menu items whose phase is not built yet | none |

Admin rules that differ from the app:

1. The portal is English only (SRS section 6); Amharic exists only as content fields (F11d). Admin text lives in `packages/i18n/src/admin/en.json`, with no Amharic copy.
2. **Mock session:** the mock sign-in writes a plain cookie so the middleware and server layout can guard pages. Backend phase B2 swaps it for the API's httpOnly cookie; only `core/session` changes.
3. **Shared audit store:** `core/mock/data/audit.ts` is the one history. Every sensitive admin action calls `recordAudit`; the dashboard (and from F11h the Audit Log page) read it.
4. Status chips use tints of the four palette colours plus a text label (no green or amber), the same rule as the app.
5. Mock data lives in the browser, so it resets when the page is reloaded.

### Students (Phase 12, F11b)

| Piece | File | Job |
|---|---|---|
| Rules | `packages/domain/src/access/studentAccess.ts`, `grantAccess.ts`, `identity/identifier.ts` | Course and student access labels, new end date after a grant, phone / email identity key (run by the server later too) |
| Shapes | `packages/contracts/src/students.ts` | Summary, detail, list query and result, suspend / revoke / grant / create inputs |
| Mock server | `core/mock/data/students.ts` | 2,458 generated students (first five match the design); write rules (one phone, repeat guards, extend vs restart) |
| API | `modules/students/api/students.api.ts` | Interface plus mock; every write checks its input, applies the rule and calls `recordAudit` with the reason |
| Dialog | `modules/students/components/ActionDialog.tsx` | Confirm step used by every sensitive action (reason box optional) |

Sensitive-action pattern for later phases: validate in the form with the contract, confirm in `ActionDialog`, call the API, show the returned record at once, show a notice. The API validates again, applies the domain rule and writes the audit entry.

### Courses and catalog (Phase 13, F11c)

| Piece | File | Job |
|---|---|---|
| Rules | `packages/domain/src/catalog/courseCode.ts`, `status.ts` | Course code format (`ENG101`), slug for IDs, publish / unpublish change and "unpublishing needs a reason" |
| Shapes | `packages/contracts/src/catalog.ts` | Admin course, university, program and semester rows, course list query and result, add / edit inputs |
| Mock server | `core/mock/data/catalog.ts` (the shared tree, now mutable) and `catalogAdmin.ts` (publish state, promotional flag, write rules) | Unique code per semester, unique names, a new program gets two semesters |
| API | `modules/catalog/api/catalog.api.ts` | Interface plus mock; every write validates, applies the rule and calls `recordAudit` |
| Screens | `modules/catalog/screens/*` | Four routes under `/catalog/*` with `CatalogTabs`; Courses owns the sidebar highlight through `section` in `adminNav.ts` |

Draft universities and programs are not offered in Students (filters and Add student). A course reaches students only when its university, program and course are all published (enforced by the real API later).

### Content: Material (Phase 14, F11d)

| Piece | File | Job |
|---|---|---|
| Rules | `packages/domain/src/content/publish.ts` | `missingForPublish` (both languages complete), `hasAmharic`, `nextVersion` (every save that stays published is a new version) |
| Shapes | `packages/contracts/src/adminContent.ts` | Module, topic, note, summary, course option; module, topic, note and Amharic inputs |
| Mock server | `core/mock/data/contentAdmin.ts` | Modules, topics and notes generated per course on first open, then edited in memory; one note record holds English and Amharic |
| API | `modules/content/api/content.api.ts` | Interface plus mock; writes validate, apply the rule and call `recordAudit` (publish, unpublish with reason, version in the target text) |
| Course choice | `modules/content/state/ContentCourseContext.tsx`, mounted by `app/(portal)/content/layout.tsx` | One course shared by every `/content/*` page |
| Screens | `modules/content/screens/*` | Material overview, Modules, Notes, Amharic Notes (the last two share one view) |
| Navigation | `core/navigation/adminNav.ts`, `Sidebar.tsx` | Items can have `groups` of links (Content → Material, Tests); the group is open while its item is active |

Shared form pieces now live in `shared/forms` (`FormShell`, `StatusFields`, reason and field-error helpers) and are used by Catalog and Content. The formula preview uses `parseMath` and `latexToUnicode` from the domain; the student app's KaTeX stays the reference rendering.

### Content: Tests (Phase 15, F11d2)

| Part | Where | What it does |
|---|---|---|
| Rules | `packages/domain/src/assessment/questionRules.ts` | `questionProblems` (what still blocks publishing a question), `toStudentType` (Blank Space is delivered as a short answer with `___`), `canPublishQuiz` (needs one published question), quiz slugs |
| Shapes | `packages/contracts/src/adminTests.ts` | Question, quiz summary, overview, list query / result; question and quiz-settings inputs |
| Mock server | `core/mock/data/testsAdmin.ts` | Three quizzes per course and their questions, generated on first use, then edited in memory |
| API | `modules/tests/api/tests.api.ts` | Interface plus mock; writes validate, apply the rules and call `recordAudit` (question and quiz publish / unpublish with reason) |
| Screens | `modules/tests/screens/*` | Tests overview, Test Management list, Create / Edit Question (one screen, create or edit) |
| Routes | `app/(portal)/content/tests/**` | `/content/tests`, `/[quiz]`, `/[quiz]/new`, `/[quiz]/[questionId]` |

The tests module uses shared Content pieces only through `modules/content/index.ts` (course picker, tabs, side panels, topic dialog, preview). New shared UI: `RadioGroup`, `ButtonLink`.

### Scan to PDF (Phase 16, F11e)

| Part | Where | What it does |
|---|---|---|
| Rules | `packages/domain/src/assessment/scanRules.ts`, `constants/admin.ts` | Allowed file types and size, "an answer needs text or a file", scan kinds |
| Shapes | `packages/contracts/src/adminScans.ts` | One input shape per kind (COC, Exam, Material, Quiz) joined by `kind`; scan, list and course-option shapes |
| Mock server | `core/mock/data/scansAdmin.ts` | Scan records (file names and sizes only); checks that university, program, semester, stream, course and topic belong together |
| API | `modules/scans/api/scans.api.ts` | Interface plus mock; saving a scan calls `recordAudit` (`SCAN_ADDED`) |
| Screens | `modules/scans/screens/*` | Scan list, New Scan form (pages, document type, details, answers) |
| Routes | `app/(portal)/scan-to-pdf`, `/new` | |

The scans module reads the catalog and content through `modules/catalog` and `modules/content` index files (`catalogApi`, `contentApi`). Joining pages into one PDF and storing files is the backend phase (B6); the mock keeps file details only.

### Questions and exam sets (Phase 17, F11f)

| Part | Where | What it does |
|---|---|---|
| Rules | `packages/domain/src/assessment/setRules.ts`, `constants/admin.ts` | What blocks publishing a set (no questions, unfinished question, missing topic), which kinds need a topic or a course, tab slugs |
| Shapes | `packages/contracts/src/adminExamSets.ts` | Exam set and question (read), one save shape for a whole set (details + questions), list query and result |
| Mock server | `core/mock/data/examSetsAdmin.ts` | Sets with their questions; checks scope (university, program, semester, stream, course), kind, unique question IDs, publish rules, reason to unpublish |
| API | `modules/questions/api/questions.api.ts` | List, get, find by ID, question owner, save (creates when the ID is new); audited as `EXAM_SET_*` |
| Screens | `modules/questions/screens/*`, `components/*` | Exam Set Management list (Edit / Verify / View, Build), question form, Verify / View dialog, Build dialog |
| Routes | `app/(portal)/questions/[kind]`, `/new`, `/[setId]` | `/questions` goes to `/questions/mid`; kinds are `mid`, `final`, `coc`, `mock` |

The module reuses the Tests module's answer editors and preview (`modules/tests/index.ts`) and the Scan to PDF cascading lists (`modules/scans/index.ts`). The top-bar search filters this page by set ID, question ID, course, program or university.

### Payments (Phase 18, F11g)

| Part | Where | What it does |
|---|---|---|
| Rules | `packages/domain/src/payments/decision.ts`, `constants/admin.ts` | Only a pending payment can be decided; the reference key used to spot duplicates (shared with the student app) |
| Shapes | `packages/contracts/src/adminPayments.ts` | Payment (with courses, duplicate link, access days), list query and result with tab counts, approve / reject decision (reject needs a reason) |
| Mock server | `core/mock/data/paymentsAdmin.ts` | Orders built on the student-app commerce domain; a later payment with the same normalized reference is flagged; approving unlocks the student's courses, rejecting returns them to the trial |
| API | `modules/payments/api/payments.api.ts` | List, get, decide; audited as `PAYMENT_APPROVED` / `PAYMENT_REJECTED` (rejection reason in the audit entry) |
| Screens | `modules/payments/screens/*`, `components/*` | Payment Queue, Payment Review with receipt viewer |
| Routes | `app/(portal)/commerce/payments`, `/[id]` | |

The dashboard's "payments waiting" and "duplicate references" numbers now come from this store. The receipt is a drawing built from the order; the backend phase serves the student's uploaded image instead.
