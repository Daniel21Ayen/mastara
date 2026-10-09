# Phase 4 changes (Course screen, Material and Reader)

Copy every file in this zip into your project, keeping the folder paths. Each code file starts with a comment giving its own path.

## Delete these files from your project
- `apps/mobile/src/modules/courses/screens/CourseDetailPlaceholderScreen.tsx`

## Run

No new packages are needed.

```bash
npm run dev:mobile
```

## New and changed files

**./**
- README.md

**apps/mobile/app/course/**
- [courseId].tsx

**apps/mobile/app/reader/**
- [topicId].tsx

**apps/mobile/src/core/mock/data/**
- content.ts
- index.ts

**apps/mobile/src/modules/access/**
- index.ts

**apps/mobile/src/modules/access/components/**
- LockedSheet.tsx

**apps/mobile/src/modules/courses/**
- index.ts

**apps/mobile/src/modules/courses/api/**
- content.api.ts

**apps/mobile/src/modules/courses/components/**
- ComingSoonTab.tsx
- CourseHeader.tsx
- MaterialTab.tsx
- TopicRow.tsx

**apps/mobile/src/modules/courses/hooks/**
- useCourseDetail.ts
- useTopics.ts

**apps/mobile/src/modules/courses/screens/**
- CourseScreen.tsx

**apps/mobile/src/modules/my-courses/**
- index.ts

**apps/mobile/src/modules/reader/**
- index.ts

**apps/mobile/src/modules/reader/hooks/**
- useReader.ts

**apps/mobile/src/modules/reader/screens/**
- ReaderScreen.tsx

**apps/mobile/src/shared/ui/**
- AppText.tsx
- Icon.tsx
- MathSpan.tsx
- RichText.tsx
- TopBar.tsx
- UnderlineTabs.tsx
- index.ts

**docs/**
- ROADMAP.md

**packages/contracts/src/**
- content.ts
- index.ts

**packages/domain/src/**
- index.ts

**packages/domain/src/access/**
- canOpenContent.ts

**packages/domain/src/constants/**
- content.ts

**packages/domain/src/math/**
- latexToUnicode.ts
- parseMath.ts

**packages/i18n/src/locales/**
- am.json
- en.json
