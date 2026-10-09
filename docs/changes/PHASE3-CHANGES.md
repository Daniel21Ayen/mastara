# Phase 3 changes (Home and My Courses)
Copy every file in this zip into your project, keeping the folder paths. Each code file starts with a comment giving its own path.
## Delete these files from your project
- `apps/mobile/app/home.tsx`
- `apps/mobile/src/modules/home/screens/HomePlaceholderScreen.tsx`

## Install new packages (once)
```bash
cd apps/mobile
npx expo install @expo/vector-icons
```

## Run
```bash
npm run dev:mobile
```

## New and changed files

**./**
- README.md

**apps/mobile/app/(tabs)/**
- _layout.tsx
- course.tsx
- home.tsx
- profile.tsx
- progress.tsx

**apps/mobile/app/course/**
- [courseId].tsx

**apps/mobile/src/core/i18n/**
- I18nProvider.tsx

**apps/mobile/src/core/mock/data/**
- index.ts
- progress.ts

**apps/mobile/src/core/navigation/**
- index.ts
- studentTabs.ts

**apps/mobile/src/core/theme/**
- fonts.ts

**apps/mobile/src/modules/courses/**
- index.ts

**apps/mobile/src/modules/courses/screens/**
- CourseDetailPlaceholderScreen.tsx

**apps/mobile/src/modules/home/**
- index.ts

**apps/mobile/src/modules/home/api/**
- home.api.ts

**apps/mobile/src/modules/home/components/**
- CocExamCard.tsx
- ContinueLearningCard.tsx
- HomeHeader.tsx
- QuickCard.tsx
- RecentlyAccessedList.tsx

**apps/mobile/src/modules/home/hooks/**
- useHomeData.ts

**apps/mobile/src/modules/home/screens/**
- HomeScreen.tsx

**apps/mobile/src/modules/my-courses/**
- index.ts

**apps/mobile/src/modules/my-courses/api/**
- myCourses.api.ts

**apps/mobile/src/modules/my-courses/components/**
- AddCoursesSheet.tsx
- CourseCard.tsx
- CourseFilterSheet.tsx
- CourseSearchBar.tsx

**apps/mobile/src/modules/my-courses/hooks/**
- useMyCourses.ts

**apps/mobile/src/modules/my-courses/lib/**
- filterCourses.ts

**apps/mobile/src/modules/my-courses/screens/**
- MyCoursesScreen.tsx

**apps/mobile/src/modules/profile/**
- index.ts

**apps/mobile/src/modules/profile/screens/**
- ProfilePlaceholderScreen.tsx

**apps/mobile/src/modules/progress/**
- index.ts

**apps/mobile/src/modules/progress/screens/**
- ProgressPlaceholderScreen.tsx

**apps/mobile/src/shared/hooks/**
- index.ts
- useComingSoon.ts
- useTimeAgo.ts

**apps/mobile/src/shared/ui/**
- BottomSheet.tsx
- ChipGroup.tsx
- Icon.tsx
- ListRow.tsx
- ProgressBar.tsx
- Screen.tsx
- SectionHeader.tsx
- SelectField.tsx
- index.ts

**docs/**
- ROADMAP.md

**packages/contracts/src/**
- index.ts
- learning.ts

**packages/domain/src/**
- index.ts

**packages/domain/src/constants/**
- learning.ts

**packages/domain/src/progress/**
- progress.ts

**packages/domain/src/time/**
- timeAgo.ts

**packages/i18n/src/**
- index.ts

**packages/i18n/src/locales/**
- am.json
- en.json

**packages/ui-tokens/src/**
- colors.ts
