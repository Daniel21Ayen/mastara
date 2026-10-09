# Phase 8 changes (Profile, Progress, Notifications, Support)

Files added or changed in Phase 8, compared with Phase 7.

## Removed in Phase 8

- `apps/mobile/src/modules/profile/screens/ProfilePlaceholderScreen.tsx`
- `apps/mobile/src/modules/progress/screens/ProgressPlaceholderScreen.tsx`

## New packages

None since Phase 7.

## Added or changed

**./**
- README.md

**apps/mobile/app/**
- notifications.tsx

**apps/mobile/app/(tabs)/**
- profile.tsx
- progress.tsx

**apps/mobile/app/settings/**
- academic.tsx
- account.tsx

**apps/mobile/app/support/**
- [ticketId].tsx
- index.tsx

**apps/mobile/src/core/i18n/**
- I18nProvider.tsx

**apps/mobile/src/core/mock/data/**
- engagement.ts
- index.ts

**apps/mobile/src/core/session/**
- SessionProvider.tsx

**apps/mobile/src/core/storage/**
- secureStorage.ts

**apps/mobile/src/modules/auth/**
- index.ts

**apps/mobile/src/modules/auth/api/**
- auth.api.ts

**apps/mobile/src/modules/auth/screens/**
- EditAccountScreen.tsx

**apps/mobile/src/modules/device-lock/**
- index.ts

**apps/mobile/src/modules/device-lock/api/**
- device.api.ts

**apps/mobile/src/modules/device-lock/components/**
- ReleaseDeviceSheet.tsx

**apps/mobile/src/modules/home/screens/**
- HomeScreen.tsx

**apps/mobile/src/modules/notifications/**
- index.ts

**apps/mobile/src/modules/notifications/api/**
- notifications.api.ts

**apps/mobile/src/modules/notifications/components/**
- NotificationRow.tsx

**apps/mobile/src/modules/notifications/hooks/**
- useNotifications.ts

**apps/mobile/src/modules/notifications/screens/**
- NotificationsScreen.tsx

**apps/mobile/src/modules/profile/**
- index.ts

**apps/mobile/src/modules/profile/components/**
- AcademicFields.tsx

**apps/mobile/src/modules/profile/hooks/**
- useAcademicLabels.ts

**apps/mobile/src/modules/profile/screens/**
- EditAcademicScreen.tsx
- ProfileScreen.tsx
- ProfileSetupScreen.tsx

**apps/mobile/src/modules/progress/**
- index.ts

**apps/mobile/src/modules/progress/hooks/**
- useProgress.ts

**apps/mobile/src/modules/progress/screens/**
- ProgressScreen.tsx

**apps/mobile/src/modules/support/**
- index.ts

**apps/mobile/src/modules/support/api/**
- support.api.ts

**apps/mobile/src/modules/support/components/**
- NewTicketSheet.tsx

**apps/mobile/src/modules/support/hooks/**
- useTickets.ts

**apps/mobile/src/modules/support/screens/**
- SupportScreen.tsx
- TicketScreen.tsx

**docs/**
- ARCHITECTURE.md
- ROADMAP.md

**packages/contracts/src/**
- auth.ts
- index.ts
- notification.ts
- support.ts
- validation.ts

**packages/domain/src/**
- index.ts

**packages/domain/src/constants/**
- engagement.ts

**packages/i18n/src/locales/**
- am.json
- en.json
