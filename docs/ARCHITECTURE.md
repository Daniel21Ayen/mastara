# Architecture map (Phases 1 to 8)

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

## Rules

1. Only four colours exist: `palette` in `packages/ui-tokens/src/colors.ts`. Tints use `withAlpha`. No hex values in screens.
2. Screens stay thin: data through `useAsync`, forms through `useForm`, rules from `packages/domain`.
3. Every module API is an interface with a mock; set `EXPO_PUBLIC_USE_MOCKS=false` when the real API exists.
4. All visible text is in `packages/i18n`; English and Amharic keys must match (the compiler checks it).
5. Every code file starts with a comment giving its own path.
6. Writes that need the server (sign in, buy) fail with a clear offline message; everything else is saved locally first.
