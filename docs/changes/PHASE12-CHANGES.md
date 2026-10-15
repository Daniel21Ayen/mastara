# Phase 12 changes (F11b: Admin Students)

Second Admin phase: the Students list, the student profile (device and access) and the sensitive student actions, all on mock data.
Copy every file in this zip into your project (after Phase 11), keeping the folder paths. Each code file starts with a comment giving its own path.

## 1. Install

Nothing new to install. If the dev server is running, restart it.

```bash
npm run dev:admin
```

Sign in with **admin@mastara.demo** / **admin123**, then open **Students**.

## 2. What to try

- **List (screen 3):** 2,458 students, 10 per page, with Previous / Next. Filter by university, stream and access. Type in the top-bar search (ID such as `ST003`, a name, `0911000001` or `+251911000001`, or an email) and use **Clear search** to go back.
- **Profile (screen 4):** click **View**. See profile, device and the My Course List with access and expiry.
- **Suspend / Reactivate, Revoke device:** each opens a dialog that needs a reason (at least 5 characters). Escape or Cancel closes it without any change. Revoke is disabled when the phone is already released (try ST003).
- **Grant or extend access:** choose a course, days (1 to 365, default 30) and a reason, then **Apply**. The dialog shows the new end date; active access is extended, expired access restarts today.
- **Add student:** name, phone or email, university, program, semester, stream. A phone that already exists (in any format) is refused. The new student opens as ST2459 with no courses.
- **Dashboard:** the student, entitlement and expiring numbers now come from the student store, and Recent activity shows what you just did.

## 3. Checks

```bash
npm run typecheck
```

## Decisions to confirm

- **Course counts:** the design sheets show 8, 5, 3, 7, 10 courses. The shared mock catalog has 6 courses per stream and semester (3 common + 3 stream), so counts here are 6, 5, 3, 6, 6. This follows the student app's mock data; it will match once the real catalog exists.
- **Page size is 10** (the design shows 5 per page, 492 pages). One constant, `STUDENTS_PAGE_SIZE`, changes it.
- **Days field:** the design's Grant card has course and reason only. I added **Days** (default 30) because an admin has to say how long.
- **Reason for every action:** SRS 6.6 requires it for suspend, device revoke and grant; I also ask for it on Reactivate. Add student has no reason.
- **Add student** sets no password: the student sets one when signing in from the app (to confirm with the backend phase B2).
- **Payment history** (SRS 6.6) is not on the profile yet; F11g adds it together with the payments store.
- **Colours:** status chips again use tints of the four palette colours with a text label.

## Removed in Phase 12

- none

## Added or changed

**./**

- README.md

**apps/admin-web/src/app/(portal)/students/**

- page.tsx

**apps/admin-web/src/app/(portal)/students/[id]/**

- page.tsx

**apps/admin-web/src/core/format/**

- dates.ts
- index.ts

**apps/admin-web/src/core/i18n/**

- errorText.ts
- index.ts

**apps/admin-web/src/core/mock/data/**

- catalog.ts
- dashboard.ts
- index.ts
- students.ts

**apps/admin-web/src/modules/dashboard/components/**

- ActivityList.tsx

**apps/admin-web/src/modules/shell/components/**

- PortalShell.tsx
- Topbar.tsx

**apps/admin-web/src/modules/students/**

- index.ts

**apps/admin-web/src/modules/students/api/**

- students.api.ts

**apps/admin-web/src/modules/students/components/**

- ActionDialog.module.css
- ActionDialog.tsx
- AddStudentDialog.tsx
- GrantAccessForm.module.css
- GrantAccessForm.tsx
- StatusBadges.tsx

**apps/admin-web/src/modules/students/hooks/**

- useStudents.ts

**apps/admin-web/src/modules/students/screens/**

- StudentProfileScreen.module.css
- StudentProfileScreen.tsx
- StudentsScreen.module.css
- StudentsScreen.tsx

**apps/admin-web/src/shared/ui/**

- DataTable.module.css
- DataTable.tsx
- DescriptionList.module.css
- DescriptionList.tsx
- Modal.module.css
- Modal.tsx
- PageHeader.module.css
- PageHeader.tsx
- Pagination.module.css
- Pagination.tsx
- SelectField.module.css
- SelectField.tsx
- TextArea.tsx
- TextField.module.css
- index.ts

**docs/**

- ARCHITECTURE.md
- ROADMAP.md

**docs/changes/**

- PHASE12-CHANGES.md

**packages/contracts/src/**

- index.ts
- students.ts

**packages/domain/src/**

- index.ts

**packages/domain/src/access/**

- grantAccess.ts
- studentAccess.ts

**packages/domain/src/constants/**

- admin.ts
- errors.ts

**packages/domain/src/identity/**

- identifier.ts

**packages/i18n/src/admin/**

- en.json
