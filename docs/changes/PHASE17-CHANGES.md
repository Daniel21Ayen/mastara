# Phase 17 changes (F11f: Admin Questions & exam sets)

Seventh Admin phase: **Exam Set Management**, built from your five designs (Mid, Final, COC and Mock), on mock data.
Copy every file in this zip into your project (after Phase 16), keeping the folder paths. Each code file starts with a comment giving its own path.

## 1. Install

Nothing new to install. **Delete nothing by hand** (see "Removed in Phase 17"). Restart the dev server if it is running.

```bash
npm run dev:admin
```

Sign in with **admin@mastara.demo** / **admin123**, then open **Questions & Q&A** (it opens Mid Exams).

## 2. What to try

- **Exam Set Management:** tabs **Mid Exams, Final Exams, COC Exam, Mock Exam**. Each table shows University, Exam Set ID, Program, Course Title, Semester, Stream, Year, Grouped Question IDs, Group Status and Actions. Filter by status; the top-bar search ("Search questions & COC…") finds a set ID, question ID, course, program or university.
  - Click a **question ID** to see that question as a student sees it.
  - **View:** the set's details and questions, read only.
  - **Verify:** checks every question is finished (and, for Mid and Final, has a topic), then **Publish set**. A published set shows **Unpublish set**, which needs a reason (saved in the audit log).
  - **Edit:** opens the set in the question form.
- **New question** (per tab): Exam Set ID, University, Program / Department, Semester, Stream, Course (not for COC), Question Type, Topic (Mid and Final only), Question ID, the question (formulas between `$` signs, 0/1000), then the answers for the type, **Access / Permission** (Paid or Free), **Year** and **Allowed Time**.
  - **Add Question** puts the question in "Questions in this set" below; fill in another. Each can be edited or removed there.
  - **Publish** saves the set with its questions and makes it live. **Save Draft** keeps it unpublished. **Reset** clears the form.
  - Typing an Exam Set ID that already exists opens that set instead of creating a duplicate.
  - A question ID can only be used once across all sets.
- **Build Exam Set** (**Build COC set** on the COC tab): names a set and says who it is for; it starts as a draft and opens the form to add questions.
- **Audit Log / Dashboard:** sets are recorded as created, updated, published or unpublished.

## 3. Checks

```bash
npm run typecheck
```

## Decisions to confirm

- **Built from your five images.** The list and form follow them. Differences are listed below.
- **Save Draft is added** next to Reset and Publish (your design has only Publish), so a set can be unpublished work. Verify is where a set is checked and published or unpublished.
- **Correct answer input:** your form has a "Correct Answer Input" select and a "Type correct answer" box. I used the answer editors from Tests instead: radio buttons pick the correct option for Multiple Choice, True / False, and an accepted-answers list for Short Answer and Blank Space. Say if you want your exact controls.
- **Add Question** keeps several questions in one set before saving, which is how I read the button.
- **COC sets have no course** (your COC form has none), so they mix courses freely and the table shows "Mixed courses".
- **Stream "Both"** in your design is the catalog's **Common** stream; the course list shows only courses of that exact stream, as in Scan to PDF.
- **Year** is the year the academic year starts and is shown as "2025 / 2026" (2022 to 2026 can be chosen). **Allowed time** is 1 to 300 minutes.
- **Exam Set ID** uses the same rule as in Scan to PDF (2–20 letters, digits or dashes). The two are not linked yet.
- **Question ID** is typed (letters, digits, dashes, underscores; 2–40).
- **Questions are English only,** and only multiple choice, true / false, short answer and blank space.
- **Quiz questions stay in Content → Tests.** This page is for Mid, Final, COC and Mock.
- **Q&A (student support)** is not part of this page; the menu name is unchanged.
- **The sidebar sub-menu** in your images (Mid & Final Exam, COC Exam, Mock Exam) is not added; the four tabs do the same job.

## Removed in Phase 17

Nothing. The Questions & Q&A placeholder page was replaced.

## Added or changed

**./**

- README.md

**apps/admin-web/src/app/(portal)/questions/[kind]/[setId]/**

- page.tsx

**apps/admin-web/src/app/(portal)/questions/[kind]/new/**

- page.tsx

**apps/admin-web/src/app/(portal)/questions/[kind]/**

- page.tsx

**apps/admin-web/src/app/(portal)/questions/**

- page.tsx

**apps/admin-web/src/core/mock/data/**

- examSetsAdmin.ts
- index.ts

**apps/admin-web/src/modules/questions/api/**

- questions.api.ts

**apps/admin-web/src/modules/questions/components/**

- BuildSetDialog.tsx
- Questions.module.css
- SetFields.tsx
- SetReviewDialog.tsx
- SetTabs.tsx

**apps/admin-web/src/modules/questions/hooks/**

- useExamSets.ts

**apps/admin-web/src/modules/questions/**

- index.ts

**apps/admin-web/src/modules/questions/lib/**

- examSetForm.ts

**apps/admin-web/src/modules/questions/screens/**

- ExamSetsListScreen.tsx
- QuestionFormScreen.tsx

**apps/admin-web/src/modules/scans/**

- index.ts

**apps/admin-web/src/modules/shell/components/**

- Topbar.tsx

**apps/admin-web/src/modules/tests/**

- index.ts

**docs/**

- ARCHITECTURE.md
- ROADMAP.md

**docs/changes/**

- PHASE17-CHANGES.md

**packages/contracts/src/**

- adminExamSets.ts
- adminScans.ts
- index.ts

**packages/domain/src/assessment/**

- setRules.ts

**packages/domain/src/constants/**

- admin.ts

**packages/domain/src/**

- index.ts

**packages/i18n/src/admin/**

- en.json
