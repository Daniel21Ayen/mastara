# Phase 10 changes (KaTeX formulas and the native exam clock)

Copy every file in this zip into your project, keeping the folder paths. Each code file starts with a comment giving its own path.

## 1. Install (once)

The zip does not replace `apps/mobile/package.json`, because yours already holds the versions `expo install` chose.
Run these from the project root:

```bash
cd apps/mobile
npx expo install react-native-webview expo-modules-core
npm install --save-dev katex --workspace @mastara/mobile
npm pkg set scripts.katex:build="node scripts/build-katex-assets.mjs" scripts.prestart="npm run katex:build" scripts.preandroid="npm run katex:build"
npm run katex:build
```

The last line should print `[katex] 0.16.x: 12 fonts inlined ...`.

## 2. Run

```bash
npm run dev:mobile
```

Formulas now use KaTeX (works in Expo Go).

## 3. Native exam clock (optional, needs a development build)

Follow `apps/mobile/modules/mastara-clock/README.md`. Without it the app keeps using the JavaScript clock.

## Removed in Phase 10

- none

## Added or changed

**./**
- .prettierignore
- README.md
- eslint.config.mjs

**apps/mobile/modules/mastara-clock/**
- README.md
- expo-module.config.json

**apps/mobile/modules/mastara-clock/android/src/main/java/expo/modules/mastaraclock/**
- MastaraClockModule.kt

**apps/mobile/modules/mastara-clock/ios/**
- MastaraClockModule.swift

**apps/mobile/scripts/**
- build-katex-assets.mjs

**apps/mobile/src/core/timer/**
- monotonicClock.ts
- nativeClock.ts
- uptime.ts

**apps/mobile/src/modules/assessment/components/**
- OptionButton.tsx

**apps/mobile/src/modules/profile/screens/**
- ProfileScreen.tsx

**apps/mobile/src/shared/ui/**
- RichText.tsx

**apps/mobile/src/shared/ui/math/**
- KatexView.tsx
- buildKatexHtml.ts
- katex.generated.ts
- katexAssets.ts

**docs/**
- ARCHITECTURE.md
- ROADMAP.md

**packages/i18n/src/locales/**
- am.json
- en.json

(`apps/mobile/package.json` also changes: see step 1.)
