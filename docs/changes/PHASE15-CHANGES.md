# Phase 15 changes (F11d2: Admin Content → Tests)

Fifth Admin phase, the Tests half of your **updated Content designs**: the Tests overview (Quiz 1–3), Test Management (question list) and Create / Edit Question, all on mock data.
Copy every file in this zip into your project (after Phase 14), keeping the folder paths. Each code file starts with a comment giving its own path.

## 1. Install

Nothing new to install and nothing to delete. Restart the dev server if it is running.

```bash
npm run dev:admin
```

Sign in with **admin@mastara.demo** / **admin123**, then open **Content → Tests**.

## 2. What to try

- **Tests overview** (Content → Tests tab, or Sidebar → Tests): pick a course. Quiz 1, 2 and 3 show their question count; **Tests Overview** lists them with minutes and status. The ⋮ menu has **Manage questions** and **Edit settings** (time allowed 5–180 minutes, Published / Draft). **Quick Actions** (Add Quiz 1/2/3) open a new question in that quiz. **Recent Updates** shows the latest edited questions.
  - A quiz can only be published when it has a published question. Taking a published quiz back to draft asks for a reason.
- **Test Management** (Manage, or Sidebar → Quiz 1/2/3): questions of that quiz across all courses with ID, Question, Course, Type, Topic, Status and Edit. Filter by course, type and status; the top-bar search matches ID, title, text and topic. Quiz tabs switch quizzes. **New Question** opens the editor.
- **Create Question:** pick the course at the top, the quiz with the Quiz 1/2/3 buttons, and the topic in the **Courses & Topics** tree (or the Topic list). Then title, question type and text (up to 500 characters; formulas between `$` signs).
  - **Multiple Choice:** 2 to 6 options; mark the right one with its radio or the Correct Answer list; Add Option / delete.
  - **True/False:** choose the correct answer.
  - **Short Answer** and **Blank Space:** accepted answers (a student's answer counts if it matches one). In Blank Space the text must contain `___` where the answer goes.
  - **Review as student** shows the question as the quiz shows it, with the right answer noted for you.
  - **Save Draft** accepts unfinished work. **Publish** needs a finished question and says what is missing.
  - **Add Question** saves a draft and clears the form for the next one (same quiz, topic and type). **Reset** clears the form. **New Topic** adds a topic to the course.
- **Edit Question** (Edit in the list): the same page with the saved question. **Update** keeps it published; **Save Draft** on a published question takes it away from students, so it asks for a reason. **Save Changes** saves without changing status. **Next** opens the next question of the same quiz and course. Changing the course at the top leaves for the list.
- **Audit Log / Dashboard:** every create, edit, publish and unpublish of a question or quiz is recorded.

## 3. Checks

```bash
npm run typecheck
```

## Decisions to confirm

- **"New Test" button:** your design says "New Test", but it opens the question editor, so it is labelled **New Question**.
- **Blank Space** is delivered to the student app as a short answer with `___` in the text, so the mobile contracts did not change.
- **Question text is English only** (the design has no Amharic fields) and plain text with `$…$` formulas; there is no rich-text toolbar yet.
- **Save Draft / Publish apply to the question**; a quiz has its own status in **Edit settings**.
- **Add Question** and **Save Draft** both save a draft when adding; Add Question then clears the form for the next one. **Next** exists only when editing.
- **A question stays in its course**; it can move to another quiz or topic of that course.
- **The tree shows the selected course** only, not every course.
- **Free-trial flags** for quizzes are not included yet.
- **Payments badge** in the sidebar still waits for F11g.
- **Sample content:** every course gets Quiz 1 (5 questions, 15 min, published), Quiz 2 (8 questions, 20 min, published) and Quiz 3 (6 questions, 15 min, draft), created the first time they are needed.
- **Moved shared pieces:** the topic dialog can now choose its module (used by New Topic); new shared UI `RadioGroup` and `ButtonLink`.

## Removed in Phase 15

Nothing. The two Tests placeholder pages were replaced by the real pages.

## Added or changed

**./**

- README.md

**apps/admin-web/src/app/(portal)/content/tests/[quiz]/[questionId]/**

- page.tsx

**apps/admin-web/src/app/(portal)/content/tests/[quiz]/new/**

- page.tsx

**apps/admin-web/src/app/(portal)/content/tests/[quiz]/**

- page.tsx

**apps/admin-web/src/app/(portal)/content/tests/**

- page.tsx

**apps/admin-web/src/core/mock/data/**

- index.ts
- testsAdmin.ts

**apps/admin-web/src/modules/content/components/**

- TopicFormDialog.tsx

**apps/admin-web/src/modules/content/**

- index.ts

**apps/admin-web/src/modules/content/screens/**

- ModulesScreen.tsx

**apps/admin-web/src/modules/tests/api/**

- tests.api.ts

**apps/admin-web/src/modules/tests/components/**

- AnswerList.tsx
- Editor.module.css
- OptionsEditor.tsx
- QuestionPreviewDialog.module.css
- QuestionPreviewDialog.tsx
- QuizSettingsDialog.tsx
- QuizTabs.tsx
- StatusBadge.tsx
- TestUpdates.module.css
- TestUpdates.tsx
- TopicTree.module.css
- TopicTree.tsx

**apps/admin-web/src/modules/tests/hooks/**

- useTests.ts

**apps/admin-web/src/modules/tests/**

- index.ts

**apps/admin-web/src/modules/tests/lib/**

- questionForm.ts

**apps/admin-web/src/modules/tests/screens/**

- QuestionEditorScreen.tsx
- TestListScreen.tsx
- Tests.module.css
- TestsOverviewScreen.tsx

**apps/admin-web/src/shared/ui/**

- Button.module.css
- ButtonLink.tsx
- Icon.tsx
- RadioGroup.module.css
- RadioGroup.tsx
- index.ts

**docs/**

- ARCHITECTURE.md
- ROADMAP.md

**docs/changes/**

- PHASE15-CHANGES.md

**packages/contracts/src/**

- adminTests.ts
- index.ts

**packages/domain/src/assessment/**

- questionRules.ts

**packages/domain/src/constants/**

- admin.ts

**packages/domain/src/**

- index.ts

**packages/i18n/src/admin/**

- en.json

