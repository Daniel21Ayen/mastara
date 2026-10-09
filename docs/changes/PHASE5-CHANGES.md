# Phase 5 changes (Quizzes)

Copy every file in this zip into your project, keeping the folder paths. Each code file starts with a comment giving its own path.

## Delete these files from your project

- none

## Run

No new packages are needed.

```bash
npm run dev:mobile
```

## New and changed files

**./**
- README.md

**apps/mobile/app/quiz/**
- [chapterId].tsx

**apps/mobile/src/core/mock/data/**
- index.ts
- quizzes.ts

**apps/mobile/src/modules/courses/screens/**
- CourseScreen.tsx

**apps/mobile/src/modules/quizzes/**
- index.ts

**apps/mobile/src/modules/quizzes/api/**
- quiz.api.ts

**apps/mobile/src/modules/quizzes/components/**
- FeedbackPanel.tsx
- OptionButton.tsx
- PracticeResult.tsx
- QuestionView.tsx
- QuizChapterRow.tsx
- TestsTab.tsx

**apps/mobile/src/modules/quizzes/hooks/**
- usePracticeData.ts
- usePracticeSession.ts
- useQuizChapters.ts

**apps/mobile/src/modules/quizzes/repo/**
- attempt.repository.ts

**apps/mobile/src/modules/quizzes/screens/**
- PracticeScreen.tsx

**apps/mobile/src/shared/ui/**
- NumberCircle.tsx
- index.ts

**docs/**
- ROADMAP.md

**packages/contracts/src/**
- index.ts
- quiz.ts

**packages/domain/src/**
- index.ts

**packages/domain/src/constants/**
- assessment.ts

**packages/domain/src/quiz/**
- grade.ts
- practice.ts

**packages/i18n/src/locales/**
- am.json
- en.json
