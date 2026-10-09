# Phase 7 changes (Store and payment)

Copy every file in this zip into your project, keeping the folder paths. Each code file starts with a comment giving its own path.

## Delete these files from your project

- none

## Install new packages (once)

```bash
cd apps/mobile
npx expo install expo-image-picker expo-image-manipulator expo-clipboard
```

Then restart with `npm run dev:mobile` (the app config gained the image-picker plugin).

## New and changed files

**./**
- README.md

**apps/mobile/**
- app.config.ts

**apps/mobile/app/store/**
- _layout.tsx
- builder.tsx
- checkout.tsx
- index.tsx
- orders.tsx

**apps/mobile/src/core/mock/data/**
- commerce.ts
- index.ts

**apps/mobile/src/modules/access/components/**
- LockedSheet.tsx

**apps/mobile/src/modules/home/api/**
- home.api.ts

**apps/mobile/src/modules/home/hooks/**
- useHomeData.ts

**apps/mobile/src/modules/home/screens/**
- HomeScreen.tsx

**apps/mobile/src/modules/my-courses/api/**
- myCourses.api.ts

**apps/mobile/src/modules/store/**
- index.ts

**apps/mobile/src/modules/store/api/**
- store.api.ts

**apps/mobile/src/modules/store/components/**
- AccountCard.tsx
- OrderRow.tsx
- PriceSummary.tsx
- ProductCard.tsx
- ReceiptPicker.tsx

**apps/mobile/src/modules/store/hooks/**
- useReceipt.ts
- useStoreData.ts

**apps/mobile/src/modules/store/lib/**
- compressReceipt.ts

**apps/mobile/src/modules/store/screens/**
- BuilderScreen.tsx
- CheckoutScreen.tsx
- OrdersScreen.tsx
- StoreHomeScreen.tsx

**apps/mobile/src/modules/store/state/**
- OrderDraftContext.tsx

**apps/mobile/src/shared/ui/**
- Badge.tsx
- SelectableRow.tsx

**docs/**
- ROADMAP.md

**packages/contracts/src/**
- commerce.ts
- index.ts
- validation.ts

**packages/domain/src/**
- index.ts

**packages/domain/src/constants/**
- commerce.ts
- errors.ts

**packages/domain/src/payments/**
- receipt.ts
- reference.ts

**packages/domain/src/pricing/**
- eligibility.ts
- quote.ts

**packages/i18n/src/locales/**
- am.json
- en.json
