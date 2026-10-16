# Phase 13 changes (F11c: Admin Courses and catalog)

Third Admin phase: the Courses page (screen 5) and the academic catalog behind it (universities, programs, semesters), all on mock data.
Copy every file in this zip into your project (after Phase 12), keeping the folder paths. Each code file starts with a comment giving its own path.

## 1. Install

Nothing new to install. If the dev server is running, restart it.

```bash
npm run dev:admin
```

Sign in with **admin@mastara.demo** / **admin123**, then open **Courses**.

## 2. What to try

- **Courses (screen 5):** 144 courses, 10 per page. Search by code or title; filter by university, program, semester, stream and status. Columns: code, title, program, semester, stream, free trial, status, edit.
- **Add course:** pick university, program and semester, then code (`ENG101` style, spaces and case are fixed for you), title, stream, promotional and status. A code that already exists in that semester is refused.
- **Edit:** change code, title, stream, promotional and status. Publishing needs no reason; **unpublishing asks for one** (at least 5 characters) and the reason goes to the audit log.
- **Universities and Programs tabs:** add and edit; names must be unique (a program name only within its university). A new program gets **Semester 1 and 2** automatically.
- **Semesters tab:** read-only list with course and published-course counts.
- **Students:** draft universities and programs no longer appear in the Students filters or in Add student. Publish them to see them there.
- **Dashboard:** Recent activity shows catalog changes.

## 3. Checks

```bash
npm run typecheck
```

## Decisions to confirm

- **Program column** is added to the courses table (the design shows university and stream filters only), because the same course code exists under many programs.
- **Page size is 10** (`CATALOG_PAGE_SIZE`).
- **Reason to unpublish:** SRS asks for a reason on sensitive actions; publishing needs none, unpublishing takes content away from students, so it needs one. Other edits need none.
- **Semesters are read-only** and created with the program: every program has two freshman semesters.
- **Free-trial count is read-only** (4 for promotional courses). F11d (Content) flags items per course and will make it real.
- **Course ID and code:** the code is saved in upper case and cannot clash inside a semester; the semester of a course and the university of a program cannot be changed after creation.
- **Visibility rule:** a course reaches students only when its university, program and course are all published. The mock only applies this to the Students options; the real API enforces it.
- **No delete:** entries are unpublished, not removed, so student history stays valid.
- **Seed data:** two draft courses (`FIT102` at AASTU Civil Engineering, `ANT102` at Mekelle Biology) and two promotional ones (`ENG101`, `LOG101`) so the filters have something to show.

## Removed in Phase 13

- none

## Added or changed

**./**

- README.md

**apps/admin-web/src/app/(portal)/catalog/courses/**

- page.tsx

**apps/admin-web/src/app/(portal)/catalog/programs/**

- page.tsx

**apps/admin-web/src/app/(portal)/catalog/semesters/**

- page.tsx

**apps/admin-web/src/app/(portal)/catalog/universities/**

- page.tsx

**apps/admin-web/src/core/i18n/**

- errorText.ts

**apps/admin-web/src/core/mock/data/**

- catalog.ts
- catalogAdmin.ts
- index.ts

**apps/admin-web/src/core/navigation/**

- adminNav.ts

**apps/admin-web/src/modules/catalog/**

- index.ts

**apps/admin-web/src/modules/catalog/api/**

- catalog.api.ts

**apps/admin-web/src/modules/catalog/components/**

- CatalogStatusBadge.tsx
- CatalogTabs.module.css
- CatalogTabs.tsx
- CourseFormDialog.module.css
- CourseFormDialog.tsx
- FormShell.module.css
- FormShell.tsx
- ProgramFormDialog.tsx
- StatusFields.tsx
- UniversityFormDialog.tsx

**apps/admin-web/src/modules/catalog/hooks/**

- useCatalog.ts

**apps/admin-web/src/modules/catalog/lib/**

- fieldErrors.ts
- reason.ts

**apps/admin-web/src/modules/catalog/screens/**

- Catalog.module.css
- CoursesScreen.tsx
- ProgramsScreen.tsx
- SemestersScreen.tsx
- UniversitiesScreen.tsx

**apps/admin-web/src/modules/students/api/**

- students.api.ts

**apps/admin-web/src/shared/ui/**

- Checkbox.module.css
- Checkbox.tsx
- index.ts

**docs/**

- ARCHITECTURE.md
- ROADMAP.md

**docs/changes/**

- PHASE13-CHANGES.md

**packages/contracts/src/**

- catalog.ts
- index.ts

**packages/domain/src/**

- index.ts

**packages/domain/src/catalog/**

- courseCode.ts
- status.ts

**packages/domain/src/constants/**

- admin.ts
- errors.ts

**packages/i18n/src/admin/**

- en.json
