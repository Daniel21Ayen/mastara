# Build roadmap

Front-end first on mock data, then the backend, then integration. Each phase is small and ends with something runnable.

## Front-end (mock data)

| Phase | Scope | Done when |
|---|---|---|
| F1 | ✅ **Setup:** monorepo, tooling, shared packages, Expo shell, theme, i18n, mock data layer | Setup check screen runs; typecheck passes |
| F2 | ✅ **Onboarding:** Splash, Login/Register, Device Registration, Profile Setup, Course picker | Flow reaches Home on mock data |
| F3 | ✅ Card-based Home, My Courses (search, filter icon, tabs All / Ongoing / Completed, add/remove), bottom tabs | Matches the approved screen designs |
| F4 | ✅ Course screen (top tabs Material / Tests / Exams) and Material: Modules, Notes, Amharic, reader with offline math (KaTeX) | Notes open; formulas render offline |
| F4b ✅ (Phase 10) | Full formula rendering: replace `MathSpan` with bundled KaTeX and fonts (no network) | Fractions, roots and matrices lay out correctly offline |
| F5 | ✅ Quizzes 1–3: chapter lists, practice, immediate feedback | A quiz can be completed |
| F6 | ✅ Exams (Mid, Final, Mock) with All Questions palette and timer, plus standalone COC Exam | An exam can be submitted |
| F7 | ✅ Store: bundle builder (7–10), extras, full package, receipt upload, order status | Price summary matches pricing rules |
| F8 | ✅ Profile, settings, language, device release, notifications, support, progress | All bottom-tab screens exist |
| F9 | ✅ Local database, offline outbox, free-trial and lock states (still mock server) | Answers survive app kill |
| F11 | Admin web (Next.js) on mock data, split into the small phases below | Admin pages from the design exist |

### F11 Admin web, step by step (mock data, one phase = one zip)

Screen numbers are the numbers on the approved Admin design sheets. SRS references: section 6 (flows) and partition G (FR-110 to FR-119, FR-140 to FR-147).

| Phase | Scope | Design screens | Done when |
|---|---|---|---|
| F11a ✅ (Phase 11) | **Foundation:** Next.js app, theme from `ui-tokens`, sidebar shell, mock admin sign-in with route guard, Dashboard, shared audit store, placeholder pages for every menu item | 1 Admin Login, 2 Dashboard | Log in, see the dashboard, every menu item opens |
| F11b ✅ (Phase 12) | **Students:** list with search and filters, student profile with device and access, Suspend, Revoke device, Grant or extend access (reason required, audited) | 3 Students, 4 Student Profile · Device · Access | A device can be revoked and access extended, and both show in the audit store; the dashboard numbers come from the student store |
| F11c ✅ (Phase 13) | **Courses and catalog:** courses table (university and stream filters, free-trial count, promotional flag, status), add and edit course, universities, programs and semesters | 5 Courses Management | A course can be added, edited and published; unpublishing needs a reason and is audited |
| F11d ✅ (Phase 14) | **Content → Material:** sidebar sub-menu (Material, Tests), Material Management overview, Modules (with topics and progress), Notes, Amharic Notes (one bilingual record), note editor with formula preview, free-trial flag, Review as student, Save Draft / Publish with versions | Updated Content designs (Material pages) | A note can be written in both languages, published as version 1 and republished as version 2 |
| F11d2 ✅ (Phase 15) | **Content → Tests:** Tests overview (Quiz 1, 2, 3), Test Management question list, Create / Edit Question (topic tree, question types, correct answer), Review as student, Save Draft / Publish | Updated Content designs (Test Management) | A quiz question can be created, assigned to a topic and published |
| F11e ✅ (Phase 16) | **Scan to PDF:** scanned pages (add, order, remove) saved with the details of a COC paper, exam, material or quiz; answers typed or attached as image / PDF; scan list with details | Your Scan to PDF field lists | A COC, an exam, a material and a quiz scan can each be saved with their details and answers |
| F11f ✅ (Phase 17) | **Questions and exam sets** (the quiz questions themselves are in F11d2): Exam Set Management with Mid, Final, COC and Mock tabs; sets list with Edit / Verify / View; question form with set details, topic, question ID, type, answers, access, year and allowed time; Build Exam Set; publish and unpublish with checks | Your Exam Set Management designs (5 images) | A Mid, Final, COC or Mock set can be built with questions, verified and published |
| F11g ✅ (Phase 18) | **Payments:** payment queue (Pending / Approved / Rejected), review page with receipt zoom and rotate, duplicate-reference warning, Approve or Reject with reason | 9 Payment Queue, 10 Payment Review | An approval unlocks access in the mock store and writes an audit entry |
| F11h | **Pricing and audit:** products and pricing form with free-trial defaults, versioned saves, Audit Log viewer with filters | 11 Products and Pricing, 12 Audit Log | A price change shows in the audit log |
| F11i (no design yet) | Notifications to students and support ticket replies (FR-118, FR-153, FR-155), reports (FR-194) | to be designed | An admin can reply to a ticket in the portal (mock tickets) |

Rules for every F11 phase: follow the module template, keep the four colours, put all text in `packages/i18n/src/admin/en.json`, add Zod shapes to `packages/contracts`, put rules in `packages/domain`, and write an audit entry (`recordAudit`) for every sensitive action.

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

- Run the native clock on a real Android phone (development build) and the KaTeX bundle on a real device: both need a device to confirm.
- Encrypted database needs a development build (`EXPO_PUBLIC_DB_ENCRYPTION=true`).
- F11f to F11i Admin web on mock data (see the table above).
