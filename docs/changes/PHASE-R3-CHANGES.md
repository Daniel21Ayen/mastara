# Refactor R3: content online and downloads, app size, no language tabs

## 1. Content: online first, offline only by download

**Before:** every lesson, quiz, exam and COC set you opened was saved on the phone automatically and silently worked offline.
**Now:** content is online the first time. It stays on the phone only when the student downloads it, and the student can delete it.

- **Download button** on every open lesson, quiz chapter, exam and COC set (cloud icon). Tap: it downloads (spinner). When saved it shows a green check. Tap the check: **delete** (with confirmation). If it fails, a message explains (offline, or try again).
- **Profile → Downloads**: everything saved, grouped (Material, Tests, Exams, COC), each with its size and age, a delete button per item, **Delete all**, and the total space used.
- **Offline behaviour.** A downloaded item opens without internet (and without using mobile data). Offline, lists show only downloaded items. Anything else shows a clear message: "You are offline and this is not downloaded..." instead of a silent old copy.
- **An item is saved completely or not at all** (one database step), so a half-finished download cannot appear as downloaded.
- **Access still applies.** Only open (free-trial or paid) items can be downloaded. A downloaded paid item is trusted offline only until its exact expiry and for 7 days after the last server check, and not if the phone's date was set back (same rules as before). The real server must also check access when an item is downloaded (backend B3).
- **Release Device & Log Out deletes all downloads**, so content does not stay on a phone the account has left. The release text says so.
- Downloads live in the same (optionally encrypted) database, per student; two students on one phone cannot see each other's downloads.
- **Not affected:** account data (my courses and their access, store, orders, notifications, results, progress) is still saved automatically so the app opens offline. Exam sittings in progress still keep their questions on the phone until the exam is finished, so a sitting is never lost.
- **Old phones:** the database upgrade (migration 3) **deletes content that earlier builds saved automatically**, so nothing stays available offline without a download. Account data is kept.

## 2. App size: under 20 MB

The rule moved from 50 MB to **20 MB** (README, roadmap). Added: R8 and resource shrinking, compressed native libraries, EAS profiles that build **one architecture per APK** (`preview-arm64`, `preview-arm32`; a universal APK cannot reach 20 MB), and a gate script `check-app-size.mjs` that fails above the limit and shows what takes the space (tested on sample APKs). Full detail, estimates and what to cut first: `docs/APP-SIZE.md`.

**Important, please read:** I could not build the Android app here, so **I have not measured the size.** My estimate is about 13 to 22 MB for one architecture, so 20 MB is reachable but not certain, and the encrypted database (SQLCipher, about 2 to 3 MB) is the main risk. Please build `preview-arm64` and run the gate, then send me the output; I will cut what it shows.

## 3. Amharic Notes tab kept; no second language inside content pages

- **Material tabs: Modules / Notes / Amharic Notes.** The Amharic Notes tab is next to Notes, as before.
- **Content pages show one language only.** Opened from Notes (or Modules) the page is English; opened from Amharic Notes it is Amharic. There is no language switch and no second-language section inside the page. Previous / Next stay in the same language.
- Lesson rows show only their tab's language.
- *Correction:* an earlier version of this phase removed the Amharic tab and showed both languages on one page. That was a misreading of the request and is reverted.

## Added / changed

- New: `core/downloads/` (`downloadStore`, `contentGateway`, `transfer`), `modules/downloads/` (button, screen, hooks), recipes in `courses/lib`, `quizzes/lib`, `exams/lib`, `coc/lib`, `shared/ui/ErrorNotice.tsx`, route `settings/downloads`, `eas.json`, `scripts/check-app-size.mjs`, `docs/APP-SIZE.md`
- Domain: `resolveContentRead` / `resolveContentList` (the whole online-first rule), `utf8Bytes`, `formatBytes`, error code `CONTENT_NOT_DOWNLOADED`
- Changed: the four content APIs (now through the gateway), `TopicRow`, `QuizChapterRow`, `ExamRow`, `CocScreen`, `MaterialTab`, `ReaderScreen`, content screens (clear error messages), `ProfileScreen` (Downloads row), `ReleaseDeviceSheet`, `migrations.ts` (v3), `app.config.ts`, strings (394 keys, English and Amharic match), README, ROADMAP, ARCHITECTURE

## Verified here

- Domain tests **57 of 57**, including 9 for the online-first rule: downloaded copy wins without calling the server; first time comes from the server; offline and not downloaded raises a clear error; real server errors are not disguised; offline lists show only downloads; a saved "not found" still counts. Byte-size helpers match Node's own count for English, Amharic and emoji.
- **Migration 3 and the download store's SQL run on a real SQLite**: content caches purged and account caches kept; re-downloading replaces an item's rows with no leftovers; two students are isolated; delete leaves no orphan rows.
- The size-gate script tested on sample APKs: passes under, fails over, flag order, bundles rejected, no file.
- Whole-app type check (stubbed external packages): no undefined names, no missing imports; hook placement audit clean (158 hook calls); no stale-theme memo risk; no hard-coded colours.

## NOT verified (needs your phone)

1. **Flow:** online, open a lesson, tap download, turn on airplane mode (or Profile → Sync → Simulate offline): the downloaded lesson opens; a not-downloaded one shows the "not downloaded" message; the list shows only downloaded items.
2. **Each kind:** lesson, quiz chapter (practice runs fully), exam (sitting works), COC set (a downloaded set opens even if the course list changed).
3. **Delete:** one item, Delete all, and Release Device clears everything.
4. **Upgrade:** installing over an earlier build runs migration 3 without losing results or progress.
5. **Downloads screen** in Light and Dark, and in Amharic (Amharic needs native review).
6. **Real size:** run the gate on a release APK (see above).
7. **Expiry offline:** a downloaded paid item locks when its access ends (set the course to expire in the mock), and does not open if the phone's date is set back.
8. Run `npm run format` once.

## Known limits

- **A downloaded item is not refreshed** automatically. If the Admin republishes a lesson, the phone keeps its copy until the student deletes it and downloads again. A version check (download the newer copy when online) is the natural next step and needs a version field from the server (backend B3).
- No "download all chapters of a course" button yet; downloads are per item. Say if you want a bulk button.
- Storage used by downloads has no limit; the Downloads screen shows it.
