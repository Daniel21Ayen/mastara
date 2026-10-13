# Phase F4c changes (native exam clock)

## Why

The JavaScript clock (`performance.now`) and `expo-device` uptime may stop counting while the phone is in deep sleep. A student could lock the phone mid-exam and, with the date set back, gain minutes. The native clock counts sleep and ignores date settings. A restart counter makes the "app was closed" rule exact across reboots.

## Build (once; Expo Go cannot load native modules)

```bash
cd apps/mobile
npx expo install expo-dev-client expo-modules-core
npx expo run:android          # needs Android Studio / SDK; or: eas build --profile development --platform android
```

Local modules in `apps/mobile/modules/` are linked automatically. The encrypted database (`EXPO_PUBLIC_DB_ENCRYPTION=true`) needs the same development build, so build once with both.

If Gradle rejects `modules/mastara-clock/android/build.gradle` (the template changes between Expo SDKs), generate a fresh one with
`npx create-expo-module@latest --local` (name it `mastara-clock`) and copy only `MastaraClockModule.kt` and `index.ts` over its files.

## Added

- `apps/mobile/modules/mastara-clock/`: `android/.../MastaraClockModule.kt`, `ios/MastaraClockModule.swift`, `ios/MastaraClock.podspec`, `android/build.gradle`, `expo-module.config.json`, `package.json`, `index.ts`
- `packages/domain/src/exam/downtime.test.ts` (7 tests), `timer.test.ts` (3 tests)

## Changed

- `packages/domain/src/exam/downtime.ts`: `ClockReading.bootId`; uptime counts only inside one boot (exact when both readings have a boot ID)
- `core/timer/monotonicClock.ts`, `uptime.ts` (native first, JS fallback; new `getBootId`)
- `modules/exams/lib/savedExam.ts`, `components/ExamRunner.tsx`, `components/ExamFlow.tsx` (save and compare the boot ID)
- `README.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`

## Verified here

- Domain tests: 15 of 15 pass, including: date set back with the phone on gains nothing; restart is caught by the boot ID even when the new uptime is larger; time moves forward only; a long sleep is charged in full and capped.
- Typecheck of the wrapper and timer files (with stubbed Expo types); domain package fully clean.

## NOT verified (I cannot compile Kotlin or Swift here)

Please run these on a real Android phone with the development build:

1. **It builds.** The module compiles and the app starts. Confirm `nativeClockAvailable` is true (log it once).
2. **Sleep counts.** Start a 30-minute exam, lock the phone for 5 minutes, unlock: about 5 minutes are gone from the clock.
3. **Date change gains nothing.** Start an exam, set the phone date back one day, return: time left is unchanged.
4. **Closed app.** Force-close the app mid-exam for 3 minutes, reopen: resumes with about 3 minutes less.
5. **Restart.** Restart the phone mid-exam, reopen: resumes, and the closed time is the wall-clock gap (see limit below).
6. **Expo Go still works** (falls back to the JavaScript clock).

## Known limits

- **Restart plus date set back** cannot be measured on the phone: after a restart only the wall clock is left. The server must close this gap (B4: it records when the exam was opened and when it was submitted, and rejects a sitting longer than its duration plus a small allowance).
- **iOS** has no trustworthy restart counter, so `bootId` is empty there; the older "smaller uptime means restart" rule applies. Android first, as planned.
- A sitting saved by a build older than F4c has no boot ID and used a different clock; if resumed in the new build the closed time can be over-counted. Only affects development data.
- Expo Go uses the JavaScript clock, which may pause in deep sleep. Test exams on the development build.
