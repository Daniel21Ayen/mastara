# Mastara (ማስታራ)

> **Bilingual, offline-first learning platform for Ethiopian university freshmen.**  
> *Merged Baseline Architecture & Software Requirements Specification v2.3*

---

## 📖 Overview

**Mastara (ማስታራ)** is designed to help Ethiopian university freshmen transition from simply finding study materials to deeply understanding concepts, practicing effectively, and sitting for university and national examinations. 

Built specifically for high resilience on budget mobile devices (Tecno, Infinix class with 2–3 GB RAM) and unreliable internet connections, Mastara combines:
- **One Logical Bilingual Model:** Side-by-side English and Amharic content with 100% offline KaTeX STEM formula rendering.
- **Strict Device Integrity:** One Student account strictly bound to one physical device hardware UUID.
- **Monotonic Anti-Cheat Exams:** Offline and online examination timers impervious to device system clock tampering.
- **National COC Module:** A standalone cross-course question pool independent of single-course exams.
- **Local Commerce Verification:** Manual CBE Mobile Banking, CBE Birr, and Telebirr payment proof verification with automated server-side entitlement expiry.

---

## 🏛️ System Architecture

Mastara is structured as a high-performance **Turborepo** monorepo using **npm workspaces**:

```
mastara/
├── apps/
│   ├── api/             # NestJS REST backend (auth, device lock, sync, commerce, catalog)
│   ├── admin-web/       # Next.js (App Router) operational portal & scan workstation
│   ├── mobile/          # React Native with Expo (Android-first, iOS supported)
│   └── worker/          # Background job queues (PDF conversion, entitlement expiry)
│
├── packages/
│   ├── database/        # PostgreSQL 16+ schemas via Prisma 7 (multi-file partitions)
│   ├── domain/          # Pure business logic (pricing engine, timer math, entitlements)
│   ├── contracts/       # Shared API DTOs and validation schemas
│   ├── config/          # Centralized configuration and environment validation
│   ├── i18n/            # Amharic (am.json) and English (en.json) localization catalogs
│   ├── sdk/             # End-to-end typed API client for mobile and web
│   ├── ui-tokens/       # Design tokens (colors, typography, spacing)
│   ├── ui-native/       # Shared mobile component library
│   ├── ui-web/          # Shared Admin web component library
│   └── utils/           # Utilities (UUIDv7, monotonic clocks, cryptographic hashes)
│
├── infra/               # Deployment (Nginx, PM2 configs, database backup scripts)
└── docs/                # Architecture Decision Records (ADRs), API specs, and SRS
```

---

## ⚡ Key Architectural Partitions

| Partition | Core Responsibilities |
| :--- | :--- |
| **Partition A: Identity & Device** | Student registration, JWT session rotation, and strict **1 Student = 1 Hardware Device** binding (`x-device-id`). Second device access triggers a localized Amharic/English lock modal (`403 DEVICE_MISMATCH_LOCKED`). |
| **Partition B: Academic Catalog** | Cascading hierarchy: **University → Program → Semester → Course**. Stream filtering strictly separates courses by `NATURAL`, `SOCIAL`, and `COMMON` streams. |
| **Partition C: Bilingual STEM Content** | Single logical bilingual records (`title_en`, `title_am`, `body_en`, `body_am`). Mixed Amharic and inline/block LaTeX formulas render offline without CDN dependencies. |
| **Partition D: Assessments & Exams** | Practice & Quizzes 1–3 with immediate feedback. Mid, Final, and Mock exams grouped by university. Answers written to encrypted SQLite in **under 10 ms**. Monotonic elapsed time timer resists clock manipulation. |
| **Partition E: Standalone COC Exam** | National Cross-Course COC examination module accessible strictly from the Home dashboard. Questions drawn from a cross-course pool with full breakdown analytics. |
| **Partition F: Commerce & Entitlements** | Pricing engine enforcing Semester Bundles (7–10 courses default 200 ETB), tiered Extra Courses (100 ETB then 50 ETB), and Full Freshman packages (350 ETB). Proof verification via CBE and Telebirr with `UNIQUE(transaction_reference)` database constraints. |
| **Partition G: Offline Synchronization** | Local outbox queue powered by UUIDv7 operation IDs. NetInfo worker automatically flushes mutations on reconnect. Idempotent sync endpoints guarantee zero answer loss. |
| **Partition H: Admin Operations** | Comprehensive control plane: payment queue verification, student scope adjustments, catalog publishing, and **Scan-to-PDF Workstation** (converting 6+ images into one optimized PDF). |

---

## 🛠️ Technology Stack

- **Mobile Client:** React Native with Expo (Hermes engine, Encrypted SQLite)
- **Admin Portal:** Next.js (App Router, Tailwind CSS / Vanilla CSS)
- **Backend API:** NestJS (Node.js LTS, Express, Passport, JWT)
- **Database:** PostgreSQL 16+ (UUIDv7, Timestamptz, JSONB, native Enums)
- **ORM:** Prisma 7.10.0 (Native multi-file schema organization)
- **Cache & Queue:** Redis 7 (Alpine)
- **Object Storage:** S3-compatible bucket (MinIO for local development)
- **Containerization:** Docker & Docker Compose

---

## 🚀 Getting Started (Docker-First)

### 1. Prerequisites
- [Docker](https://docs.docker.com/get-docker/) (v24.0 or newer)
- [Docker Compose](https://docs.docker.com/compose/) (v2.20 or newer)
- [Node.js](https://nodejs.org/) (v20 LTS or v22) & npm

### 2. Clone and Configure
```bash
# Clone the repository
git clone https://github.com/Kewakibt-Enterprise-Platform/mastara.git
cd mastara

# Create local environment configuration from template
cp .env.example .env
```

### 3. Start Infrastructure Containers
Start PostgreSQL 16, Redis 7, and MinIO locally:
```bash
docker compose up -d
```

Verify running containers:
```bash
docker compose ps
```

| Service | Container Name | Host Port | Internal Port |
| :--- | :--- | :--- | :--- |
| **PostgreSQL 16** | `mastara-postgres` | `5433` | `5432` |
| **Redis 7** | `mastara-redis` | `6380` | `6379` |
| **MinIO API** | `mastara-minio` | `9002` | `9000` |
| **MinIO Console**| `mastara-minio` | `9003` | `9001` |

---

## 🔒 Hard Release Gates & Non-Functional Requirements

- **App Package Target:** Under **50 MB** installed release package (hard gate; no bundled textbooks).
- **Runtime Memory:** Under **120 MB** on 2–3 GB RAM reference devices.
- **Local Write Latency:** **< 10 ms** p95 persistence time for question answer selection.
- **Zero Answer Loss:** Local answers survive process kills, airplane mode, and crashes.
- **Anti-Clock Tampering:** System clock rollbacks cannot extend test or exam durations.
- **Security & Authorization:** Server-side role resolution; client roles are ignored and logged. Receipts restricted strictly to Admin inspection.

---

## 📜 Branching & Commit Conventions

This project follows **Conventional Commits**:
- `feat(scope): ...` for new features
- `fix(scope): ...` for bug fixes
- `chore(scope): ...` for tooling, configuration, and dependencies
- `docs(scope): ...` for documentation updates

**Active Development Branch:** `feat/backend-foundation`

---

## 📄 License
Confidential and Proprietary — Kewakibt Enterprise Platform. All rights reserved.
# Mastara

Bilingual (English and Amharic), offline-first learning app for Ethiopian university freshmen.
Monorepo (npm workspaces): Expo (student app) · Next.js (admin portal) · NestJS (API) · PostgreSQL · local Redis.

See `docs/ROADMAP.md` for the phase plan. **Current: Phase 9 (Offline: local database, sync outbox, offline access rules) — front-end on mock data.**

## Prerequisites

- Node.js 20 or newer
- npm (comes with Node.js)
- A phone with Expo Go, or an Android emulator
- PostgreSQL and Redis installed locally (needed from the backend phases; not needed for Phase 1)

## First run

```bash
npm install

# Let Expo pick the dependency versions that match its current SDK
cd apps/mobile
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking \
  expo-constants expo-status-bar expo-font expo-splash-screen react react-native \
  @expo-google-fonts/plus-jakarta-sans @expo-google-fonts/noto-sans-ethiopic \
  expo-secure-store expo-crypto expo-device @expo/vector-icons \
  expo-image-picker expo-image-manipulator expo-clipboard expo-sqlite @react-native-community/netinfo
npx expo install --fix
cp .env.example .env

# Back at the repo root
cd ../..
npm run dev:mobile
```

Scan the QR code with Expo Go. Splash → Login/Register → Register this phone → Profile Setup → Choose courses →
**Home** (card-based) with bottom tabs **Home · Course · Progress · Profile**.

- **Home:** greeting, Continue Learning, My Courses / Learning Stats / Store Status cards, COC Exam card, Recently Accessed.
- **Course tab = My Courses:** search, filter icon (stream and access), tabs All / Ongoing / Completed, add or remove courses.
- **Course screen** (tap a course): top tabs Material / Tests / Exams; Material has lower tabs Modules / Notes / Amharic.
  Notes and Amharic are two views of the same bilingual records. The first item of each list is free; other items
  are locked unless the course is Paid (tap a locked item to see the Locked sheet).
- **Reader:** English / አማርኛ switch on the same record, formulas, Previous / Next.
- Formulas (`$...$` and `$$...$$`) currently show as offline Unicode text via `MathSpan`; Phase F4b swaps in KaTeX.
- **Tests tab:** lower tabs Quiz 1 / 2 / 3, each listing its chapters (10 questions, 15 min). The first chapter of each quiz
  is free; other chapters are locked unless the course is Paid. Tap a chapter to practise.
- **Practice:** single choice, True/False, select-all and short-answer questions, with instant feedback (icon and words, not
  only colour), the correct answer and a short reason. Answers lock after checking. Finish shows the score; your best score
  appears on the chapter row.
- **Exams tab:** lower tabs Mid / Final / Mock; each lists past exams by university (your own university first). The first
  one is a free sample; others are locked unless the course is Paid. An exam shows instructions, then a timed sitting
  (20 questions, 30 min) with no instant feedback: answers stay editable, questions can be flagged, **All questions**
  opens a numbered palette (filled = answered, red ring = flagged), **Submit** asks for confirmation, and the exam
  submits by itself when time ends. The timer uses a monotonic clock, so changing the phone's date or time does not add time.
- **COC Exam (Home → COC Exam card):** independent of Exams. Start Exam / Instructions / Results. Each set mixes questions
  from all your courses; the result shows a per-course breakdown. With no paid course only the sample set opens.
  (COC practice mode arrives later.)
- **Store (Home → Store Status card, or Buy on a locked item):** pick Natural / Social / Both, then
  Semester Bundle (7 to 10 courses, 200 ETB; extra courses 100 then 50 ETB), Single course, or the Full Freshman Package
  (350 ETB per stream, 700 ETB for both). Paid courses cannot be bought again until 7 days before they expire (renewal).
  **Payment:** choose CBE Mobile / CBE Birr / Telebirr, copy the account, add your screenshot (shrunk to under 300 KB) and
  type the reference (CBE references start with FT). Then see the order under **My orders**.
  Demo: about 10 seconds after you submit, the mock admin approves the order and the courses unlock (paid, 150 days);
  a reference containing `REJ` is rejected so you can try Resubmit. Reusing a reference is refused.
  All prices, limits and account numbers come from the (mock) server, so the Admin can change them later.
- **Profile tab:** your account (Edit name and phone/email), university and program (changing them asks to confirm because the
  course list is cleared), My Courses, Store, Notifications (unread count), Support, **language switch (English / አማርኛ, remembered)**,
  your registered phone with **Release Device & Log Out**, and Log out.
- **Progress tab:** overall progress, progress by course, and your latest exam results.
- **Notifications (bell on Home, or Profile):** payment received / approved / rejected and "access ends soon" notices, unread
  dots, Mark all as read. Tapping one opens the related screen.
- **Works offline (Phase 9):** results, quiz runs, exams and profile/course-list changes are saved in a database on the phone
  (SQLite) at once. Changes are queued in an **outbox** (each with a time-ordered UUIDv7 ID) and uploaded when the phone is online
  (on start, on reconnect, after each change and every 30 s, with growing waits after a failure). The server ignores an ID it has
  already applied, so nothing is counted twice. **Profile → Sync** shows online/offline, changes waiting and the last upload, with
  a **Simulate offline (demo)** button. A bar at the top shows when you are offline.
- **Answers survive closing the app:** a practice run resumes where you stopped. An exam resumes too, and the time the app was
  closed counts against the exam (the larger of the date-based and phone-uptime gap, so setting the date back gains nothing).
- **Offline reading:** everything you have opened (courses, notes, quizzes, exams, store prices, orders …) is saved and shown
  when offline. Paid access is trusted offline only until its saved expiry and for 7 days after the last server check, and not
  at all if the phone's date was set back; free-trial items and locks keep working.
  Buying, signing in and sending a receipt need internet (a clear message is shown).
- **Support (Profile → Support):** send a request, see its status. Demo: a mock admin replies about 15 seconds later. Progress and Profile are placeholders until Phase 8.

Demo mode (mock data): use any phone number (for example `0911223344`) or email and a password of 6+
characters. An email containing `locked` (for example `locked@demo.com`) shows the device-lock screen.
The saved session survives an app restart; log out from Home to start again.

Check it compiles: `npm run typecheck` · `npm run lint` · `npm run format:check`.

## Local services (backend phases)

```bash
redis-cli ping          # expect: PONG
psql -U postgres -c "CREATE DATABASE mastara;"
cp .env.example .env    # then edit DATABASE_URL and secrets
```

Redis runs locally at `redis://127.0.0.1:6379` (`QUEUE_DRIVER=redis`). No Docker is used.

## Code rules

1. One folder per feature: `src/modules/<feature>/{screens,components,hooks,api,store}` and an `index.ts`.
2. Other code imports a module only through its `index.ts`.
3. Route files in `app/` stay thin: they only render a module screen.
4. Business rules (pricing, entitlement, timer) live once in `packages/domain`.
5. API shapes live once in `packages/contracts`.
6. Every module API has an interface plus a mock implementation; the real one replaces the mock later.
7. All visible text comes from `packages/i18n` (English and Amharic keys must match).
8. **Only four colours** exist: `palette` in `packages/ui-tokens/src/colors.ts` (primary, ink, white, danger).
   Use the semantic `colors` names; make tints with `withAlpha`. Never type a hex value in a screen.
9. Screens are thin: forms use `useForm` + `FormTextField`, data uses `useAsync`, rules live in `packages/domain`.
10. Navigation during onboarding is decided in one place: `core/session` (`deriveStatus`, `redirectFor`, `useRouteGuard`).

## Notes

- Amharic strings in `packages/i18n/src/locales/am.json` need review by a native speaker.
- Bundle ID `com.kewakibt.mastara` in `apps/mobile/app.config.ts` is a placeholder; change it before release.
- App icon and splash image are not added yet.
