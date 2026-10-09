# Build roadmap

Front-end first on mock data, then the backend, then integration. Each phase is small and ends with something runnable.

## Front-end (mock data)

| Phase | Scope | Done when |
|---|---|---|
| F1 | ✅ **Setup:** monorepo, tooling, shared packages, Expo shell, theme, i18n, mock data layer | Setup check screen runs; typecheck passes |
| F2 | ✅ **Onboarding:** Splash, Login/Register, Device Registration, Profile Setup, Course picker | Flow reaches Home on mock data |
| F3 | ✅ Card-based Home, My Courses (search, filter icon, tabs All / Ongoing / Completed, add/remove), bottom tabs | Matches the approved screen designs |
| F4 | ✅ Course screen (top tabs Material / Tests / Exams) and Material: Modules, Notes, Amharic, reader with offline math (KaTeX) | Notes open; formulas render offline |
| F4b (open) | Full formula rendering: replace `MathSpan` with bundled KaTeX and fonts (no network) | Fractions, roots and matrices lay out correctly offline |
| F5 | ✅ Quizzes 1–3: chapter lists, practice, immediate feedback | A quiz can be completed |
| F6 | ✅ Exams (Mid, Final, Mock) with All Questions palette and timer, plus standalone COC Exam | An exam can be submitted |
| F7 | ✅ Store: bundle builder (7–10), extras, full package, receipt upload, order status | Price summary matches pricing rules |
| F8 | ✅ Profile, settings, language, device release, notifications, support, progress | All bottom-tab screens exist |
| F9 | ✅ **(current)** Local database, offline outbox, free-trial and lock states (still mock server) | Answers survive app kill |
| F10 | Admin web (Next.js) on mock data | Admin pages from the design exist |

## Backend

| Phase | Scope |
|---|---|
| B1 | API setup: NestJS, PostgreSQL schema (Prisma), local Redis queue, health check |
| B2 | Identity and device lock |
| B3 | Catalog, My Course List, content |
| B4 | Assessment: quizzes, exams, COC, attempts |
| B5 | Commerce: products, orders, receipts, entitlements, expiry job |
| B6 | Sync endpoint, scan-to-PDF worker, notifications, audit |
| I1 | Connect mobile and admin to the real API (turn `EXPO_PUBLIC_USE_MOCKS` off) |
| I2 | Hardening: security, app size under 50 MB, memory, pilot |

## Still open before the backend

- **F4b** KaTeX renderer (replace `MathSpan.tsx`).
- Native Android clock (`SystemClock.elapsedRealtime`) for the exam timer: replaces `core/timer/monotonicClock.ts`.
- Encrypted database needs a development build (`EXPO_PUBLIC_DB_ENCRYPTION=true`).
- F10 Admin web on mock data.
