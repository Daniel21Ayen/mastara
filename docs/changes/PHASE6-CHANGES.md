# Phase 6 changes (Exams and COC)

Copy every file in this zip into your project, keeping the folder paths. Each code file starts with a comment giving its own path.

## Delete these files from your project

- `apps/mobile/src/modules/courses/components/ComingSoonTab.tsx`
- `apps/mobile/src/modules/quizzes/components/FeedbackPanel.tsx`
- `apps/mobile/src/modules/quizzes/components/OptionButton.tsx`
- `apps/mobile/src/modules/quizzes/components/QuestionView.tsx`

## Run

No new packages are needed.

```bash
npm run dev:mobile
```

## New and changed files

**./**
- README.md

**apps/mobile/app/coc/**
- [setId].tsx
- index.tsx

**apps/mobile/app/exam/**
- [examId].tsx

**apps/mobile/src/core/mock/data/**
- exams.ts
- index.ts
- quizzes.ts

**apps/mobile/src/core/timer/**
- index.ts
- monotonicClock.ts

**apps/mobile/src/modules/assessment/**
- index.ts

**apps/mobile/src/modules/assessment/components/**
- FeedbackPanel.tsx
- OptionButton.tsx
- QuestionView.tsx

**apps/mobile/src/modules/coc/**
- index.ts

**apps/mobile/src/modules/coc/api/**
- coc.api.ts

**apps/mobile/src/modules/coc/hooks/**
- useCocData.ts

**apps/mobile/src/modules/coc/screens/**
- CocExamScreen.tsx
- CocScreen.tsx

**apps/mobile/src/modules/courses/screens/**
- CourseScreen.tsx

**apps/mobile/src/modules/exams/**
- index.ts

**apps/mobile/src/modules/exams/api/**
- exam.api.ts

**apps/mobile/src/modules/exams/components/**
- ExamFlow.tsx
- ExamInstructions.tsx
- ExamResultView.tsx
- ExamRow.tsx
- ExamRunner.tsx
- ExamTimerBadge.tsx
- ExamsTab.tsx
- QuestionPalette.tsx

**apps/mobile/src/modules/exams/hooks/**
- useExamData.ts
- useExamSession.ts
- useExamTimer.ts
- useExams.ts

**apps/mobile/src/modules/exams/repo/**
- examResult.repository.ts

**apps/mobile/src/modules/exams/screens/**
- ExamScreen.tsx

**apps/mobile/src/modules/home/screens/**
- HomeScreen.tsx

**apps/mobile/src/modules/quizzes/screens/**
- PracticeScreen.tsx

**apps/mobile/src/shared/ui/**
- Icon.tsx

**docs/**
- ROADMAP.md

**packages/contracts/src/**
- exam.ts
- index.ts
- quiz.ts

**packages/domain/src/**
- index.ts

**packages/domain/src/exam/**
- score.ts
- session.ts
- timer.ts

**packages/i18n/src/locales/**
- am.json
- en.json
