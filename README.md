# Mastara

Bilingual (English and Amharic), offline-first learning platform for Ethiopian university freshmen.
Monorepo (npm workspaces): Expo (student app) · Next.js (admin portal) · NestJS (API) · PostgreSQL · local Redis.

Specification baseline: **SRS v3.2 (October 24, 2026)**. Incorporates decisions for offline registration, sequential MS student identifiers, strict server-side CSV-only validation, mandatory downloads, the unified `canOpen` access model, and single-shared KaTeX rendering.

---

## Architecture & Core Systems

- **Universal Access Model (`canOpen`)**: One single source of truth in `packages/domain/src/access/canOpen.ts` used by both the NestJS server guards and mobile client. Strict evaluation: `UNAVAILABLE` $\to$ `ENTITLED` $\to$ `FREE_COURSE` $\to$ `FREE_ITEM` $\to$ `LOCKED`.
- **Paywall Component (`LockedContentSheet`)**: Consistent bilingual copy in English and Amharic with direct Store routing and pre-selected courses across all 4 content gates (Materials, Exams, Tests, COC).
- **Offline Registration & MS IDs**: Fully offline account creation using salted SHA-256 hashes (`LOCAL_ONLY`). First purchase or online sync assigns a permanent sequential `MS0001+` student identity.
- **Mandatory Offline Downloads**: Content must be downloaded to encrypted storage before viewing. 5 explicit lifecycle states (`not_downloaded`, `downloading`, `downloaded`, `update_available`, `failed`). Free content uses hardware SecureStore keys; paid content uses signed entitlement keys.
- **Server-Side CSV Magic Byte Inspection**: Content import endpoints inspect raw buffers, rejecting binary `%PDF` and `PK\x03\x04` archives with `400 BAD_REQUEST: CSV_FILE_REQUIRED`.
- **Single Shared Math Renderer**: Replaces individual WebViews with `SharedKatexRenderer`, running at most 1 Chromium instance per document to keep memory strictly under **120 MB RAM** on 2 GB Android devices.
- **ARM64 Size Gate**: Release APK for `arm64-v8a` is constrained under **20 MB** via automated CI size gating (`apps/mobile/scripts/check-app-size.mjs`).

---

## Prerequisites

- Node.js 20 or newer
- npm 10+
- PostgreSQL 16+ (Docker container `mastara-postgres` on port 5433 or local service)
- Redis (local service or container on port 6379)
- Android Studio / Emulator or physical Android device

---

## Quickstart

### 1. Database & Environment Setup
```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Run database migrations and seed
cd packages/database
npx prisma db push
npm run seed
cd ../..
```

### 2. Run the Backend API
```bash
npm run dev:api     # http://localhost:4001
```

### 3. Run the Admin Portal
```bash
npm run dev:admin   # http://localhost:3001
```
*Credentials: `admin@mastara.demo` / `admin123`*

### 4. Run the Mobile Student App
```bash
npm run dev:mobile  # Expo Metro Bundler
```
*Scan QR code with Expo Go or press `a` for Android emulator.*

---

## Verification & Testing Suites

| Suite | Command | Coverage / Scope |
|---|---|---|
| **CI Mock Gate** | `npm run check:mocks` | Zero mock imports or useMocks in production |
| **Monorepo Typecheck** | `npm run typecheck` | Turbo typecheck across all 14 packages |
| **Unit & Security Tests** | `npm test` | Domain access matrix, offline crypto, mobile & admin unit tests |
| **Question Numbering** | `npx ts-node ... test/question-numbering.spec.ts` | Scoped transaction numbering & gapless delete |
| **Catalog & Parity** | `npx ts-node ... test/parity.spec.ts` | 16/16 admin-vs-student visibility parity |
| **Admin Playwright E2E**| `npx playwright test --config tests/e2e-admin/playwright.config.ts` | Course creation, test sets, CSV upload, active tab states |
| **Mobile E2E (Maestro)** | `maestro test tests/e2e-mobile/flow-student-journey.yaml` | Offline registration, purchase, downloads, exam sync |
| **k6 Load Tests** | `k6 run tests/load/payment-sync-load.js` | Payment queue, exam sync batches, paginated endpoints |
| **APK Size Gate** | `node apps/mobile/scripts/check-app-size.mjs <app.apk>` | Hard release limit: $\le 20.0$ MB |

---

## Documentation Index

- **SRS v3.2**: [`docs/srs/SRS-v3.2.md`](docs/srs/SRS-v3.2.md) — System requirements baseline.
- **Architectural Decision Records**: [`docs/adr/`](docs/adr/) — ADR 001 through ADR 006.
- **App Size & Memory Budget**: [`docs/APP-SIZE.md`](docs/APP-SIZE.md) — 20 MB APK gate & 120 MB RAM profiling.
- **Mock Burndown Audit**: [`docs/architecture/MOCK_BURNDOWN.md`](docs/architecture/MOCK_BURNDOWN.md) — Zero-mock contract enforcement.
