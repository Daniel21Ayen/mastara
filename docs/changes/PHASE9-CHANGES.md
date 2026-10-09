# Phase 9 changes (Offline: database, outbox, offline access)

Files added or changed in Phase 9, compared with Phase 8.

## Install new packages (once)

```bash
cd apps/mobile
npx expo install expo-sqlite @react-native-community/netinfo
```

## Removed in Phase 9

- none

## Added or changed

**./**
- README.md

**apps/mobile/**
- .env.example
- app.config.ts

**apps/mobile/app/**
- _layout.tsx

**apps/mobile/src/core/config/**
- env.ts

**apps/mobile/src/core/db/**
- DatabaseProvider.tsx
- attemptStore.ts
- cache.ts
- database.ts
- index.ts
- migrations.ts
- userScope.ts

**apps/mobile/src/core/mock/**
- delay.ts

**apps/mobile/src/core/mock/data/**
- index.ts
- profiles.ts
- syncServer.ts

**apps/mobile/src/core/network/**
- connectivity.ts
- index.ts

**apps/mobile/src/core/session/**
- SessionProvider.tsx

**apps/mobile/src/core/storage/**
- secureStorage.ts

**apps/mobile/src/core/sync/**
- SyncProvider.tsx
- index.ts
- outbox.ts
- syncApi.ts
- syncWorker.ts

**apps/mobile/src/core/timer/**
- index.ts
- uptime.ts

**apps/mobile/src/modules/auth/hooks/**
- useAuth.ts

**apps/mobile/src/modules/coc/api/**
- coc.api.ts

**apps/mobile/src/modules/coc/screens/**
- CocExamScreen.tsx

**apps/mobile/src/modules/course-list/api/**
- courses.api.ts

**apps/mobile/src/modules/courses/api/**
- content.api.ts

**apps/mobile/src/modules/exams/api/**
- exam.api.ts

**apps/mobile/src/modules/exams/components/**
- ExamFlow.tsx
- ExamRunner.tsx

**apps/mobile/src/modules/exams/hooks/**
- useExamSession.ts
- useExamTimer.ts

**apps/mobile/src/modules/exams/lib/**
- savedExam.ts

**apps/mobile/src/modules/exams/repo/**
- examResult.repository.ts

**apps/mobile/src/modules/exams/screens/**
- ExamScreen.tsx

**apps/mobile/src/modules/home/api/**
- home.api.ts

**apps/mobile/src/modules/my-courses/api/**
- myCourses.api.ts

**apps/mobile/src/modules/my-courses/components/**
- AddCoursesSheet.tsx

**apps/mobile/src/modules/notifications/api/**
- notifications.api.ts

**apps/mobile/src/modules/profile/**
- index.ts

**apps/mobile/src/modules/profile/api/**
- academic.api.ts
- profile.api.ts

**apps/mobile/src/modules/profile/components/**
- SyncStatusCard.tsx

**apps/mobile/src/modules/profile/hooks/**
- useSaveProfile.ts

**apps/mobile/src/modules/profile/screens/**
- EditAcademicScreen.tsx
- ProfileScreen.tsx
- ProfileSetupScreen.tsx

**apps/mobile/src/modules/quizzes/api/**
- quiz.api.ts

**apps/mobile/src/modules/quizzes/hooks/**
- usePracticeSession.ts

**apps/mobile/src/modules/quizzes/repo/**
- attempt.repository.ts

**apps/mobile/src/modules/quizzes/screens/**
- PracticeScreen.tsx

**apps/mobile/src/modules/store/api/**
- store.api.ts

**apps/mobile/src/modules/store/screens/**
- CheckoutScreen.tsx

**apps/mobile/src/modules/support/api/**
- support.api.ts

**apps/mobile/src/shared/hooks/**
- index.ts
- usePersistedReducer.ts

**apps/mobile/src/shared/ui/**
- OfflineBanner.tsx
- index.ts

**docs/**
- ARCHITECTURE.md
- ROADMAP.md

**packages/contracts/src/**
- index.ts
- sync.ts

**packages/domain/src/**
- index.ts

**packages/domain/src/access/**
- offlineAccess.ts

**packages/domain/src/constants/**
- errors.ts
- sync.ts

**packages/domain/src/exam/**
- downtime.ts

**packages/domain/src/sync/**
- backoff.ts

**packages/domain/src/uuid/**
- uuidv7.ts

**packages/i18n/src/locales/**
- am.json
- en.json
