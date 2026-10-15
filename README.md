# Mastara

Bilingual (English and Amharic), offline-first learning app for Ethiopian university freshmen.
Monorepo (npm workspaces): Expo (student app) · Next.js (admin portal) · NestJS (API) · PostgreSQL · local Redis.

See `docs/ROADMAP.md` for the phase plan. **Current: Phase 18 (Admin web F11g: Payments) — front-end on mock data.** The student app is complete through Phase 10; the Admin portal is built next in small phases F11a to F11i.

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
  expo-image-picker expo-image-manipulator expo-clipboard expo-sqlite @react-native-community/netinfo react-native-webview expo-modules-core
npm install --save-dev katex --workspace @mastara/mobile
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
- **Formulas (Phase 10):** text with `$...$` and `$$...$$` is drawn with **KaTeX**, fully offline (script, styles and the needed fonts
  are inlined into the app; nothing is loaded from the internet). `npm run katex:build` creates the bundle from the `katex` package
  and runs by itself before `npm start`. Until it has run, formulas fall back to plain Unicode text. Notes, question prompts and
  explanations use KaTeX; short answer options stay plain text to keep memory low. Amharic text inside the formula view uses the
  phone's own Ethiopic font.
- **Native exam clock (Phase 10):** the phone's own monotonic clock (Android `SystemClock.elapsedRealtime`, iOS `mach_continuous_time`)
  drives the exam timer and the "app was closed" time, so it counts time asleep and survives restarts; changing the date or time
  gains nothing. It needs a development build (see `apps/mobile/modules/mastara-clock/README.md`). Without it (Expo Go) the app
  uses the JavaScript clock. **Profile → Security** shows which clock is active.
- **Support (Profile → Support):** send a request, see its status. Demo: a mock admin replies about 15 seconds later. Progress and Profile are placeholders until Phase 8.

Demo mode (mock data): use any phone number (for example `0911223344`) or email and a password of 6+
characters. An email containing `locked` (for example `locked@demo.com`) shows the device-lock screen.
The saved session survives an app restart; log out from Home to start again.

## Admin portal (Phase 11, F11a)

```bash
npm install                 # from the project root: picks up the new apps/admin-web workspace
cp apps/admin-web/.env.example apps/admin-web/.env.local
npm run dev:admin           # http://localhost:3001
```

Demo sign-in: **admin@mastara.demo** with password **admin123**. Any other account (a student phone number, a wrong password) is refused.

- **Login** (screen 1): email or phone and password, shows a clear error, comes back to the page you asked for.
- **Route guard:** `src/middleware.ts` sends signed-out visitors to the login page; the portal layout checks the session again on the server. The mock session is a plain cookie (the real API sets an httpOnly cookie in phase B2).
- **Shell:** dark sidebar with the 9 menu items from the design, top bar with search (opens Students with your text) and Log out. Under 900 px wide the sidebar becomes a drawer (Escape closes it).
- **Dashboard** (screen 2): active students, pending payments, active entitlements, expiring in 7 days, a new-students-per-day chart (numbers printed on the bars), a Needs attention list that links to the page that fixes each item, and Recent activity from the shared audit store.
- **Students** (screens 3 and 4, Phase 12): list of 2,458 mock students with search (ID, name, phone or email, in any phone format), filters (university, stream, access), 10 per page and **Add student**. **View** opens the profile: profile, device, My Course List with access and expiry, and **Grant or extend access**. **Suspend / Reactivate** and **Revoke device** ask for a reason first; Grant shows the new end date before you confirm. Every action is written to the audit store and shown in the dashboard's Recent activity. The dashboard's student, entitlement and expiry numbers now come from the same student store.
- **Courses and catalog** (screen 5, Phase 13): Courses table with search and filters (university, program, semester, stream, status), 10 per page, free-trial count and promotional flag; **Add course** and **Edit** (code such as ENG101, unique in its semester). Tabs for **Universities**, **Programs** and **Semesters** (read-only; a new program gets Semester 1 and 2). Draft or Published; unpublishing asks for a reason. Every change is audited; draft universities and programs disappear from the Students filters and Add student.
- **Content → Material** (updated Content designs, Phase 14): pick a course once and it stays selected on every Content page. **Material Management** shows module, note and Amharic-note counts, Quick Actions and Recent Updates. **Modules** lists modules with topics, notes, status and a progress ring; add and edit modules, add topics. **Notes** and **Amharic Notes** are two views of one bilingual record: the editor has English and Amharic tabs, a formula preview, a free-trial flag, **Review as student**, **Save Draft** and **Publish** (both languages are needed to publish; every publish is a new version; taking a published item back needs a reason). The top-bar search filters the Content page you are on. 
- **Content → Tests** (Phase 15): the Tests tab shows Quiz 1–3 of the chosen course (question count, minutes, status), Quick Actions and Recent Updates; the ⋮ menu opens **Edit settings** (minutes, publish; taking a live quiz back needs a reason). **Test Management** (`/content/tests/quiz-N`) lists questions of a quiz across courses with filters and the top-bar search. **Create / Edit Question** has the Courses & Topics tree, topic, title, four question types (Multiple Choice, True/False, Short Answer, Blank Space), correct answer, **Review as student**, **Save Draft** and **Publish** (publishing needs a finished question; taking a published question back needs a reason).
- **Questions & Q&A** (Phase 17): **Exam Set Management** with Mid Exams, Final Exams, COC Exam and Mock Exam tabs. The table shows each set (university, exam set ID, program, course, semester, stream, year, grouped question IDs, status) with **Edit**, **Verify** (check and publish / unpublish) and **View**. **New question** and **Build Exam Set** add to it; the form takes the set details, question type, topic (Mid / Final), question ID, the question (formulas allowed, 0/1000), its answers, access, year and allowed time.
- **Payments** (Phase 18): the **Payment Queue** lists waiting payments (student, product, amount, method, reference, submitted, duplicate check) with Pending / Approved / Rejected tabs, a method filter and the top-bar search. **Review** shows the receipt (zoom, rotate) beside the order details; a duplicate reference needs a confirmation before **Approve and activate access**, and **Reject** needs a reason. Approving unlocks the student's courses in the mock store; both decisions are audited.
- **Scan to PDF** (Phase 16): the list shows saved scans (type filter, search, details). **New Scan** takes scanned pages (images or PDFs, in order), a document type and its details. **COC:** University → Program / Department → Year. **Exam** (Mid, Final, Mock): exam set ID → University → Program / Department → Semester → Stream → Course. **Material** (Module, Note, Amharic Note) and **Quiz** (1–3): the same plus Topic, Title and Description. Exams, quizzes and COC take answers per question (with the question ID, and the question type for exams), typed or attached as image / PDF.
- **Other menu items** open a "Coming in F11x" page so the whole menu and route structure already exists.
- Mock data lives in the browser and resets on reload (so do students you add and actions you take). Colours come only from the four-colour palette through CSS variables built from `packages/ui-tokens`.

Check it compiles: `npm run typecheck --workspace @mastara/admin-web` (also part of `npm run typecheck`).

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
