# Phase 16 changes (F11e: Admin Scan to PDF)

Sixth Admin phase: **Scan to PDF**, built from your field lists for COC, Exams, Materials and Quizzes, on mock data.
Copy every file in this zip into your project (after Phase 15), keeping the folder paths. Each code file starts with a comment giving its own path.

## 1. Install

Nothing new to install and nothing to delete. Restart the dev server if it is running.

```bash
npm run dev:admin
```

Sign in with **admin@mastara.demo** / **admin123**, then open **Scan to PDF**.

## 2. What to try

- **Scan list:** four sample scans (a quiz, a mid exam, a COC paper, a note). Filter by document type, search by ID, exam set, course, university or title, and **View** a scan to see its details, pages and answers.
- **New Scan:**
  - **Scanned pages:** Add pages (JPG, PNG, WebP or PDF, up to 10 MB each, up to 40 pages), move them up or down, remove them. Images show a small preview. Pages are kept in the order shown.
  - **Document type** decides the fields:
    - **COC:** University → Program / Department → Year.
    - **Exam** (Mid, Final, Mock): Exam set ID → University → Program / Department → Semester → Stream → Course.
    - **Material** (Module, Note, Amharic Note): the same as an exam, then Topic → Title → Description.
    - **Quiz** (Quiz 1, 2, 3): the same as a material (Exam set ID first).
  - The lists follow each other: choosing a university narrows the programs; semester and stream narrow the courses; the course gives the topics. Changing one clears what depended on it.
  - **Answers** (COC, Exam, Quiz): one block per question with the Question ID (and the Question type for exams). Type the answer, attach an image or PDF, or do both; **Add question** adds another block.
  - **Save Scan** says what is missing. After saving, the form clears for the next scan.
- **Audit Log / Dashboard:** every saved scan is recorded as "Scan added".

## 3. Checks

```bash
npm run typecheck
```

## Decisions to confirm

- **"Scan" means upload:** the admin adds scanned images or PDFs from the computer. Taking photos with the camera is not included.
- **Pages are not really merged yet.** The mock keeps file names and sizes only; the backend phase stores the files and joins the pages into one PDF.
- **Exam set ID is typed by hand** (2–20 letters, digits or dashes, for example MID-2016) until exam sets are built in F11f. Materials get it too, because your list puts it first for all of them.
- **COC "Year"** is the year of the paper, a four-digit number from 1990 to 2100. Tell me if it should be an Ethiopian-calendar year or a year of study.
- **COC has no exam set ID, semester, stream or course,** as in your list.
- **Question rows everywhere:** exams, quizzes and COC all use the same answer blocks (your list shows one question ID for quizzes and exams; you can add more blocks). For a quiz, the Question ID is typed, not picked from the question list.
- **Materials have no answers.**
- **No edit or delete yet:** a saved scan can be viewed, not changed. Say if you want that next.
- **The top-bar search** does not apply here; the page has its own search box.

## Removed in Phase 16

Nothing. The Scan to PDF placeholder page was replaced.

## Added or changed

**./**

- README.md

**apps/admin-web/src/app/(portal)/scan-to-pdf/new/**

- page.tsx

**apps/admin-web/src/app/(portal)/scan-to-pdf/**

- page.tsx

**apps/admin-web/src/core/mock/data/**

- index.ts
- scansAdmin.ts

**apps/admin-web/src/modules/catalog/**

- index.ts

**apps/admin-web/src/modules/content/**

- index.ts

**apps/admin-web/src/modules/scans/api/**

- scans.api.ts

**apps/admin-web/src/modules/scans/components/**

- AnswersEditor.tsx
- PagesPicker.tsx
- ScanDetailsDialog.tsx
- Scans.module.css

**apps/admin-web/src/modules/scans/hooks/**

- useScanOptions.ts
- useScans.ts

**apps/admin-web/src/modules/scans/**

- index.ts

**apps/admin-web/src/modules/scans/lib/**

- scanForm.ts
- scanText.ts

**apps/admin-web/src/modules/scans/screens/**

- NewScanScreen.tsx
- ScansListScreen.tsx

**docs/**

- ARCHITECTURE.md
- ROADMAP.md

**docs/changes/**

- PHASE16-CHANGES.md

**packages/contracts/src/**

- adminScans.ts
- index.ts

**packages/domain/src/assessment/**

- scanRules.ts

**packages/domain/src/constants/**

- admin.ts

**packages/domain/src/**

- index.ts

**packages/i18n/src/admin/**

- en.json

