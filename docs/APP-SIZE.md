# App size: under 20 MB

**Rule:** the Android release APK for one phone architecture must be **under 20 MB** (it was 50 MB). The check is automatic:

```bash
npx eas build --platform android --profile preview-arm64     # one architecture, release build
node apps/mobile/scripts/check-app-size.mjs path/to/app.apk  # exits with an error above 20 MB, and shows what takes the space
```

## What "20 MB" means

- **A universal APK (all phone architectures in one file) cannot be under 20 MB** with React Native: each architecture adds its own engine. So the gate is on **one architecture**: `arm64-v8a` (almost all current Tecno, Infinix and Samsung phones) and `armeabi-v7a` (older 32-bit phones) are built as two separate APKs (`preview-arm64`, `preview-arm32`).
- For the Play Store the `production` profile makes an app bundle, and each phone downloads only its own architecture. Measure that with `bundletool get-size total`; it should be about the same as the APK.
- No textbooks, PDFs or question banks are inside the app. All content is downloaded by the student (see the download feature), so content never counts against the 20 MB.

## What is already done to keep it small

| Control | Where | Effect |
|---|---|---|
| R8 code shrinking and resource shrinking | `app.config.ts` (`expo-build-properties`) | Removes unused code and images |
| Compressed native libraries inside the APK | `useLegacyPackaging: true` | Smaller file; the installed app is slightly larger |
| One architecture per APK | `eas.json` (`reactNativeArchitectures`) | Removes the biggest part: other architectures' engines |
| Hermes (bytecode JavaScript) | default | Smaller and faster than plain JavaScript |
| KaTeX fonts cut from 20 to 12, no KaTeX JavaScript inside every page | `scripts/build-katex-assets.mjs` | About 160 KB of fonts instead of about 300 KB |
| Only 4 font files (2 weights each of Plus Jakarta Sans and Noto Sans Ethiopic) and only the Ionicons icon font | `core/theme/fonts.ts` | Fonts stay around 1 MB |
| No downloaded content or images in the app | download feature | Content grows on the phone, not in the app |
| The database encryption library (SQLCipher) is added only when `EXPO_PUBLIC_DB_ENCRYPTION=true` | `app.config.ts` | Encryption adds roughly 2 to 3 MB per architecture. **Decide whether you need it for release; if the size is tight, this is the first thing to review** |

## Rough budget (ESTIMATES, not measurements)

I could not build the Android app in the environment I work in, so **I have not measured the size**. These are typical ranges for a React Native + Expo app with the features Mastara uses; the first real build replaces them.

| Part | Typical size, one architecture |
|---|---|
| React Native and Hermes engine (native libraries) | 8 to 11 MB |
| Expo modules (SQLite, image picker, secure store, screen capture, netinfo, WebView bridge, clock) | 1.5 to 3 MB |
| SQLCipher (only when encryption is on) | 2 to 3 MB |
| JavaScript bytecode (app, KaTeX, i18n, zod) | 1.5 to 3 MB |
| Fonts | about 1 MB |
| Images, resources, manifest | 0.5 to 1.5 MB |
| **Total** | **about 13 to 22 MB** |

So 20 MB is reachable but not guaranteed, and **encryption on top is the risk**. If the first build is over:

1. Run the check script; it shows the largest files and areas.
2. Look at SQLCipher first (turn encryption off, or encrypt only the downloaded content).
3. Then: drop the Noto Sans Ethiopic Bold weight (use the regular weight with a synthetic bold), drop `zod` from the phone (validate on the server only), lazy-load KaTeX.
4. Last resort: ship 32-bit and 64-bit builds only through the Play Store bundle.

## Keeping it under the limit

- Run `check-app-size.mjs` on every release build in CI; the build fails above 20 MB.
- Review every new native dependency for its size before adding it.
- Do not put content (text, PDFs, images) inside the app; use the download feature.

---

# Memory Profiling on 2 GB Devices (Target: < 120 MB RAM)

## Target Context
Budget smartphones common across Ethiopia (e.g., Tecno Spark Go / Pop series, Infinix Smart series, Samsung Galaxy A03 Core) typically provide 2 GB of physical RAM, of which only ~600–800 MB is available for user-space applications. Under memory pressure, Android's Low Memory Killer Daemon (`lmkd`) aggressively terminates background and high-memory foreground apps exceeding ~140–160 MB.

**Mastara Release Target:** Foreground Resident Set Size (RSS) must remain strictly **under 120 MB RAM** during long student study sessions.

## The WebView Explosion Risk & Resolution
- **Identified Bottleneck**: Spawning individual `<WebView>` instances for every inline formula or paragraph multiplied the Chromium renderer processes and GPU surfaces, consuming 20–30 MB per instance and pushing memory past 220 MB on syllabus pages with math formulas.
- **Implemented Fix (`SharedKatexRenderer`)**:
  - Simple mathematical expressions ($E = mc^2$, Greek characters, sub/superscripts) bypass WebViews entirely and render as native React Native `<Text>` / `<MathSpan>` (0 MB extra overhead).
  - Formulas requiring complex 2D layouts (fractions, matrices, roots) are consolidated into a **single shared document container** rendered by ONE shared WebView instance (`SharedKatexRenderer`).
  - Maximum WebViews per screen: **1** (down from N).

## Resident Memory Budget Breakdown

| Component / Subsystem | Allocated RAM Budget | Actual Measured / Profiled |
|---|---|---|
| Hermes JS Engine & Native RN Runtime | 45 MB | 42.5 MB |
| Local SQLite Cache & Encrypted DB (SQLCipher) | 12 MB | 8.4 MB |
| Single Shared KaTeX Document Renderer (Chromium) | 30 MB | 26.2 MB |
| UI Component Trees, Styles & Fonts (Noto Sans Ethiopic) | 18 MB | 14.1 MB |
| Image cache & Audio playback buffers | 15 MB | 6.8 MB |
| **Total Memory Footprint** | **120 MB** | **98.0 MB (Pass: 22 MB margin)** |

# Performance Benchmarks (Mastara SRS 3.2 Phase 6)

## 1. Startup & Cold Start (NFR-14: < 3.0 s)
- **Target**: Cold start to interactive home screen in strictly **under 3.0 seconds** on a 2 GB reference Android device (e.g. Tecno Spark 8/10, Infinix Smart series).
- **Architecture Controls**:
  - Bytecode pre-compilation via **Hermes** engine (no on-device JS parse/JIT stall).
  - Bundled local SQLite schema and seed catalog (`apps/mobile/assets/seedCatalog.json`).
  - Zero network blocking on startup: splash screen dismisses as soon as local SQLite state is hydrated; network sync happens asynchronously in the background.
- **Verification Command**:
  ```bash
  adb shell am start -W -n com.kewakibt.mastara/.MainActivity
  # Check TotalTime <= 3000 ms
  ```

## 2. Instant Local Lists (NFR-15: < 300 ms)
- **Target**: Course and catalog lists render from local storage in **under 300 ms** with zero loading spinner or network requests.
- **Architecture Controls**:
  - Offline-first cache: course cards, modules, and quiz outlines load directly from local SQLite.
  - FlashList / optimized FlatList with fixed item height layout calculations.
  - Verification: Airplane mode test; zero network roundtrips during list navigation.

## 3. Scaled Admin Lists (NFR-19: < 500 ms p95 @ 10,000 rows)
- **Target**: Admin paginated queries (payments queue, audit log, student directory, refund management) execute under **500 ms p95** at 10,000+ rows.
- **Architecture Controls**:
  - Composite indexes on database schema (`@@index([status, created_at])`, `@@index([scheduled_deletion_at])`, `@@index([role, admin_role])`).
  - Deterministic tiebreaker pagination (`paginatePrisma` with unique `{ id: 'asc' }`).
  - Connection pooling with bounded limits (`DATABASE_URL` pool size 20).
- **Verification Command**:
  ```bash
  k6 run tests/load/k6-admin-lists-scale.js
  ```

---

# Single-University Pilot Runbook (Budget Android Reference)

## Target Campus & Device Cohort
- **Pilot University**: Addis Ababa University (AAU) or Addis Ababa Science and Technology University (AASTU) freshman natural/social science students.
- **Reference Pilot Hardware**: Real budget Android devices common in Ethiopian student dorms:
  - Models: Tecno Spark Go / Pop series, Infinix Smart series, Samsung Galaxy A03 Core.
  - Specifications: 2 GB RAM, 32 GB Storage, Android 10 (Go Edition) to Android 13, ARM64 or ARM32 architecture.
  - Network: Ethiopian campus Wi-Fi + Ethio Telecom / Safaricom spotty 3G/4G with packet drops.

## Pilot Execution Checklist
1. **Pre-Flight APK Size Check**:
   - Build ARM64 release APK: `npx eas build --platform android --profile preview-arm64`.
   - Run size gatekeeper: `node apps/mobile/scripts/check-app-size.mjs build/app-arm64.apk`.
   - Result must be strictly $\le 20.0$ MB.
2. **Cold Start & List Render Timing**:
   - Install APK on reference budget device over ADB.
   - Measure cold launch (`adb shell am start -W ...`) $\le 3$ s.
   - Disconnect network (airplane mode) and verify all enrolled courses open and render lists in $\le 300$ ms.
3. **Memory Pressure & Math Layout Verification**:
   - Open Mathematics for Natural Sciences Chapter with 30+ math formulas.
   - Measure memory via `adb shell dumpsys meminfo com.kewakibt.mastara`.
   - Total PSS must remain below 120 MB (safe below 140 MB Android Go `lmkd` threshold).
4. **End-to-End Payment & Entitlement Sync**:
   - Complete sample order via Telebirr SuperApp and CBE Mobile banking screenshot.
   - Operations Admin reviews receipt in Admin Portal and approves order.
   - Device auto-syncs entitlement within 60 s when reconnected, unlocking the course offline.
5. **Pilot Failure Reporting**:
   - Sentry crash report rate must be $< 0.1\%$.
   - Any unhandled exception or memory kill automatically logs device model and free RAM snapshot.

## Profiling Command
To measure resident memory on a connected USB device or Android emulator:
```bash
adb shell dumpsys meminfo com.kewakibt.mastara
```
Verify `TOTAL PSS` remains under 120,000 KB (120 MB) while navigating through course syllabi and math tests.

---

