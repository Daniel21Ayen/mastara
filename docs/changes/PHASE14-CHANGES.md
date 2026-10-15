# Phase 14 changes (F11d: Admin Content → Material)

Fourth Admin phase, built on your **updated Content designs**: the new sidebar sub-menu and the Material pages (overview, Modules, Notes, Amharic Notes) with a bilingual note editor, all on mock data. The Tests pages of the same design (Quiz 1–3, Test Management, Create / Edit Question) are Phase 15.
Copy every file in this zip into your project (after Phase 13), keeping the folder paths. Each code file starts with a comment giving its own path.

## 1. Install

Nothing new to install. **Delete the five old files listed under "Removed in Phase 14"** (they moved to `shared/forms`). Restart the dev server if it is running.

```bash
npm run dev:admin
```

Sign in with **admin@mastara.demo** / **admin123**, then open **Content**.

## 2. What to try

- **Sidebar:** Content opens a sub-menu with **Material** (Modules, Notes, Amharic Notes) and **Tests** (Quiz 1, 2, 3). Group headings open and close. The Tests links open a placeholder until Phase 15.
- **Material Management (Content):** pick a course at the top right (it stays chosen on every Content page). See module, note and Amharic-note counts, Course Overview, Quick Actions (Add Module, Add Note, Add Amharic Note) and Recent Updates.
- **Modules:** each module shows topics and notes counts and a status. Open one to see its topics and notes, **Edit module** or **Add topic**. The ring shows published modules out of all modules. Unpublishing a module asks for a reason.
- **Notes:** the ⋮ menu has **Edit note** and **Review as student**. The editor has English and Amharic tabs, a live preview with formulas (`$x^2$` inline, `$$x^2$$` on its own line), a free-trial flag, **Review as student**, **Save Draft** and **Publish**.
  - Publishing needs a title and text in both languages; the tab with the gap opens for you.
  - Every publish is a new version (v1, v2, …). The version shows in the audit log text.
  - Saving a published note as draft takes it away from students, so it asks for a reason.
- **Amharic Notes:** the list shows the Amharic title of each note that has an Amharic view. **Add Amharic Note** picks an existing note and saves its Amharic view into the same record. There is no second file.
- **Top-bar search:** on Content pages it filters the page you are on.
- **Dashboard:** Recent activity shows content changes.

## 3. Checks

```bash
npm run typecheck
```

## Decisions to confirm

- **Split of the Content design:** Material is this phase; Tests (screens 1, 2 and 4 of your sheet) is Phase 15. The roadmap now lists them as F11d and F11d2. The quiz questions that were planned under Questions & COC (F11f) are built in F11d2.
- **Sidebar label:** the design says **Questions & Q&A**, so the menu label changed from "Questions & COC". The page behind it is still F11f.
- **Payments badge (17):** not shown yet. It comes from the payments queue in F11g.
- **Note editor is a dialog** (the design shows no editor for notes). It follows the question editor's look: two language tabs, preview, Save Draft / Publish.
- **Publish rule:** both languages must be complete. Drafts may have gaps.
- **Versions:** a save that leaves a note published counts as a new version. Saving the Amharic view of a published note also makes a new version, because students see the change.
- **Reason to unpublish** (module or note), as for courses in Phase 13. Other edits need none.
- **Topics** can be added but not edited or removed yet. They are the topic tree the question editor uses in Phase 15.
- **Free trial** is a flag per note here. Module, quiz and exam free flags follow in their own phases.
- **Sample content:** every course gets 5 modules (first 3 published), 24 topics and 14 notes (8 with Amharic), created the first time the course is opened. The sample course in your design (Computer Science, CS101) is not in the catalog, so the picker lists the catalog's courses.
- **Formula preview** draws formulas in plain Unicode. The student app's KaTeX is the reference look.
- **Shared form pieces moved** to `shared/forms` (used by Catalog and Content). No change for the user.

## Removed in Phase 14

Delete these files (moved to `apps/admin-web/src/shared/forms/`):

- apps/admin-web/src/modules/catalog/components/FormShell.module.css
- apps/admin-web/src/modules/catalog/components/FormShell.tsx
- apps/admin-web/src/modules/catalog/components/StatusFields.tsx
- apps/admin-web/src/modules/catalog/lib/reason.ts
- apps/admin-web/src/modules/catalog/lib/fieldErrors.ts

## Added or changed

**./**

- README.md

**apps/admin-web/src/app/(portal)/content/**

- layout.tsx
- page.tsx

**apps/admin-web/src/app/(portal)/content/amharic-notes/**

- page.tsx

**apps/admin-web/src/app/(portal)/content/modules/**

- page.tsx

**apps/admin-web/src/app/(portal)/content/notes/**

- page.tsx

**apps/admin-web/src/app/(portal)/content/tests/**

- page.tsx

**apps/admin-web/src/app/(portal)/content/tests/[quiz]/**

- page.tsx

**apps/admin-web/src/core/mock/data/**

- contentAdmin.ts
- index.ts

**apps/admin-web/src/core/navigation/**

- adminNav.ts
- index.ts

**apps/admin-web/src/modules/catalog/components/**

- CourseFormDialog.tsx
- ProgramFormDialog.tsx
- UniversityFormDialog.tsx

**apps/admin-web/src/modules/content/**

- index.ts

**apps/admin-web/src/modules/content/api/**

- content.api.ts

**apps/admin-web/src/modules/content/components/**

- AmharicNoteDialog.tsx
- ContentHeader.tsx
- ContentShell.tsx
- ContentTabs.tsx
- CourseGate.tsx
- CoursePicker.module.css
- CoursePicker.tsx
- EditorDialog.module.css
- ModuleFormDialog.tsx
- ModuleProgress.module.css
- ModuleProgress.tsx
- NoteEditorDialog.tsx
- NotePreviewDialog.tsx
- NoteRow.module.css
- NoteRow.tsx
- RichPreview.module.css
- RichPreview.tsx
- SidePanels.module.css
- SidePanels.tsx
- TopicFormDialog.tsx

**apps/admin-web/src/modules/content/hooks/**

- useContent.ts

**apps/admin-web/src/modules/content/lib/**

- matchesSearch.ts

**apps/admin-web/src/modules/content/screens/**

- MaterialScreen.tsx
- MaterialScreens.module.css
- ModulesScreen.tsx
- NotesScreen.tsx

**apps/admin-web/src/modules/content/state/**

- ContentCourseContext.tsx

**apps/admin-web/src/modules/shell/components/**

- Sidebar.module.css
- Sidebar.tsx
- Topbar.tsx

**apps/admin-web/src/shared/forms/**

- FormShell.module.css
- FormShell.tsx
- StatusFields.tsx
- fieldErrors.ts
- index.ts
- reason.ts

**apps/admin-web/src/shared/ui/**

- Icon.tsx
- Modal.module.css
- Modal.tsx
- PageHeader.module.css
- PageHeader.tsx
- RowMenu.module.css
- RowMenu.tsx
- SelectField.module.css
- TabLinks.module.css
- TabLinks.tsx
- index.ts

**docs/**

- ARCHITECTURE.md
- ROADMAP.md

**docs/changes/**

- PHASE14-CHANGES.md

**packages/contracts/src/**

- adminContent.ts
- index.ts

**packages/domain/src/**

- index.ts

**packages/domain/src/constants/**

- admin.ts

**packages/domain/src/content/**

- publish.ts

**packages/i18n/src/admin/**

- en.json
