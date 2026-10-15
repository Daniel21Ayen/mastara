# Mastara

Bilingual (English and Amharic), offline-first learning app for Ethiopian university freshmen.
Monorepo (npm workspaces): Expo (student app) · Next.js (admin portal) · NestJS (API) · PostgreSQL · local Redis.

See `docs/ROADMAP.md` for the phase plan. **Current: Phase 9 done, F9b (offline hardening), F4b (KaTeX), F4c (native exam clock) F4d (exam integrity) added. Next: F9b offline hardening, then F10 admin web — front-end on mock data.**

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
  expo-image-picker expo-image-manipulator expo-clipboard expo-sqlite @react-native-community/netinfo \
  react-native-webview expo-modules-core expo-screen-capture expo-build-properties
npx expo install --fix
cp .env.example .env

# Back at the repo root
cd ../..
npm run dev:mobile
```

Scan the QR code with Expo Go. Splash → Login/Register → Register this phone → Profile Setup → Choose courses →
**Home** (card-based) with bottom tabs **Home · Course · Progress · Profile**.

- **Home:** greeting, four cards of the same size in two rows (My Courses, Learning Stats, Store Status, COC Exam; each its own colour), Recently Accessed.
- **Course tab = My Courses:** search, filter icon (stream and access), tabs All / Ongoing / Completed, add or remove courses.
- **Course screen** (tap a course): top tabs Material / Tests / Exams; Material has lower tabs **Modules / Notes / Amharic Notes**.
  Notes and Amharic Notes are two views of the same bilingual records; each opens the lesson in its own language only. The first item of each list is free; other items
  are locked unless the course is Paid (tap a locked item to see the Locked sheet).
- **Reader:** one language per page (the language of the tab you came from), with no language switch and no second-language section inside the page; formulas; Previous / Next.
- Formulas (`$...$` and `$$...$$`): simple ones (`E = mc^2`, Greek letters, small powers) show as native text via `MathSpan`.
  Fractions, roots, matrices and limits are drawn by bundled KaTeX (`KatexParagraph`), fully offline: the fonts are inside the app and
  the page cannot reach the network. `npm install` fetches `katex`; the app asset file is generated automatically before
  `start`, `typecheck` and `test` (or run `npm run build:katex --workspace @mastara/mobile`).
- **Tests tab:** lower tabs Quiz 1 / 2 / 3, each listing its chapters (10 questions, 15 min). The first chapter of each quiz
  is free; other chapters are locked unless the course is Paid. Tap a chapter to practise.
- **Practice:** single choice, True/False, select-all and short-answer questions, with instant feedback (icon and words, not
  only colour), the correct answer and a short reason. Answers lock after checking. Finish shows the score; your best score
  appears on the chapter row.
- **Exams tab:** lower tabs Mid / Final / Mock; each lists past exams by university (your own university first). The first
  one is a free sample; others are locked unless the course is Paid. Each row shows its question count and **time, which the Admin sets
  for every exam and COC set** (5 to 240 minutes; a sitting keeps the time it started with even if the Admin changes it). An exam shows
  instructions, then a timed sitting with no instant feedback. **All questions are on one scrolling page** (no Next button): answers stay
  editable, questions can be flagged, **All questions** opens a numbered palette that jumps to a question (filled = answered, red ring =
  flagged), **Submit** at the end asks for confirmation, and the exam submits by itself when time ends. After submitting, **Review answers**
  is also one scrolling page, and every explanation has a **Show / Hide** button (hidden by default; the same button appears on the
  feedback in practice quizzes). The timer uses a monotonic clock, so changing the phone's date or time does not add time. In a development build it is the native Android
  `elapsedRealtime` clock, which also counts time while the phone sleeps (see `docs/changes/PHASE-F4c-CHANGES.md`); in Expo Go it falls back to the JavaScript clock.
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
- **Light / Dark / Auto theme:** Profile → Appearance (and under the language buttons on the login page). Applies to every page at once and is remembered; Auto follows the phone's own setting.
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
- **Answers survive closing the app:** a practice run resumes where you stopped. An exam resumes too. **Leaving an exam does not stop the clock**: the sitting is kept and the time away counts. The student can return
  until time is up; if time ran out while away, the saved answers are submitted automatically (on the next app start or every minute while the app is open). The time the app was
  closed counts against the exam (the larger of the date-based and phone-uptime gap, so setting the date back gains nothing).
- **Content is online first; offline only by download.** The first time, every lesson, quiz, exam and COC set is loaded from the
  server. Each open item has a **download button** (cloud icon): tap it to keep that item on the phone so it works without internet
  (it saves mobile data too); a green check means it is saved, and tapping it again **deletes** it. **Profile → Downloads** lists everything
  saved, with sizes, and can delete one item or all. Offline, the lists show only what was downloaded, and anything else says it is not
  downloaded. Releasing the device deletes all downloads. Downloaded items still follow access: paid content is trusted offline only until
  its exact expiry and for 7 days after the last server check, and not at all if the phone's date was set back.
- **Account data** (my courses and their access, store prices, orders, notifications, results, progress) is still saved automatically so the
  app opens offline. Buying, signing in and sending a receipt need internet (a clear message is shown).
- **App size: under 20 MB** (hard release gate, measured on the Android APK for one phone architecture; see `docs/APP-SIZE.md`).
  `node apps/mobile/scripts/check-app-size.mjs app.apk` fails the build if it is larger.
- **Review answers:** after an exam or COC set is submitted, the result has a **Review answers** button: every question again, one at a time, with the student's answer, the correct answer and the explanation (or "Not answered"). Kept in memory for that visit (see change notes).
- **Content protection:** while signed in, screenshots and screen recording are blocked and each screen carries a faint watermark with the student's masked phone or email. Set `EXPO_PUBLIC_PROTECT_CONTENT=false` in `.env` only to take design or support screenshots. A second camera pointed at the screen cannot be blocked by any app; the watermark is what lets a leaked photo be traced.
- **Support (Profile → Support):** send a request, see its status. Demo: a mock admin replies about 15 seconds later. Progress and Profile are placeholders until Phase 8.

Demo mode (mock data): use any phone number (for example `0911223344`) or email and a password of 6+
characters. An email containing `locked` (for example `locked@demo.com`) shows the device-lock screen.
The saved session survives an app restart; log out from Home to start again.

Check it compiles: `npm run typecheck` · `npm run lint` · `npm run format:check` · tests: `npm test`.

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
8. **Four core colours plus an accent set, in two themes (light and dark).** Core: `palette` in `packages/ui-tokens/src/colors.ts` (primary, ink, white, danger) for text, brand, buttons and errors.
   Accents: `packages/ui-tokens/src/accents.ts` (blue, violet, emerald, orange, cyan, amber, fuchsia, lime) for icon tiles, course cards, progress bars and tabs.
   Accents are decoration only: meaning is never carried by colour. Read colours from `useTheme()` (`theme.colors`, `theme.accents[name]`) or `accentForKey(id)` (same ID, same colour). Never type a hex value in a screen. Dark-mode colours live next to the light ones in `packages/ui-tokens`; a new colour needs both.
9. **Styles are built from the active theme.** `const useStyles = createStyles((theme) => ({ ... }))` at the top level, then `const styles = useStyles()` inside the component. Never call `StyleSheet.create` at the top level of a screen file (lint blocks it): it would freeze the colours of whichever theme was showing at start.
10. Screens are thin: forms use `useForm` + `FormTextField`, data uses `useAsync`, rules live in `packages/domain`.
11. Navigation during onboarding is decided in one place: `core/session` (`deriveStatus`, `redirectFor`, `useRouteGuard`).

## Notes

- Amharic strings in `packages/i18n/src/locales/am.json` need review by a native speaker.
- Bundle ID `com.kewakibt.mastara` in `apps/mobile/app.config.ts` is a placeholder; change it before release.
- App icon and splash image are not added yet.
