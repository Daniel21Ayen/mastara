# Phase 18 changes (F11g: Admin Payments)

Eighth Admin phase: the **Payment Queue** and **Payment Review** pages (your designs 9 and 10), on mock data.
Copy every file in this zip into your project (after Phase 17), keeping the folder paths. Each code file starts with a comment giving its own path.

## 1. Install

Nothing new to install. **Delete nothing by hand** (see "Removed in Phase 18"). Restart the dev server if it is running.

```bash
npm run dev:admin
```

Sign in with **admin@mastara.demo** / **admin123**, then open **Payments**.

## 2. What to try

- **Payment Queue:** tabs **Pending (18)**, **Approved**, **Rejected**; a **Payment method** filter; the top-bar search ("Search student or reference") finds a student name or ID, or a reference. Newest first, 10 per page. Each row shows student, product, amount, method, reference, submitted date and the **Checks** column (**Unique** or **Duplicate**). Approved and Rejected rows show their status and a **View** button instead.
- **Review:** the receipt on the left with **zoom out / in, rotate left / right and Reset**; on the right the student, university, product, courses selected, amount, method, reference, submitted date and the days of access the order gives.
  - **Duplicate reference:** a red warning names the earlier payment. **Approve and activate access** stays off until you tick "I checked this payment and want to approve it anyway".
  - **Reject:** choose a reason (amount or reference does not match, receipt is unreadable, reference already used); without one the page asks for it.
  - **Approve and activate access:** unlocks the student's courses for the order's days. Open the student's profile to see the access.
  - A decided payment is read only.
- **Dashboard / Audit Log:** the waiting-payments and duplicate-reference numbers now come from the queue and drop as you decide payments. Each approval or rejection is audited (the rejection reason is saved).

## 3. Checks

```bash
npm run typecheck
```

## Decisions to confirm

- **Built on the student app's order rules.** Products (Semester Bundle, Single course, Full Package), payment methods (CBE Mobile Banking, CBE Birr, Telebirr) and reject reasons are the ones the student app already uses.
- **Duplicate rule:** a payment is flagged when an earlier payment used the same reference (spaces, dashes and letter case ignored). Duplicates can still be approved after you confirm; I made the confirmation a tick box so it cannot be done by accident.
- **Amounts and access days are the default prices** (for example 200 ETB for a bundle, 150 or 365 days) until you set them in Products and Pricing (F11h). I do not compare the amount on the receipt with the price, since the receipt is not read by the system.
- **The receipt is a drawing** made from the order's own details so zoom and rotate can be tried. The backend phase shows the student's uploaded screenshot here.
- **Courses selected:** a Semester Bundle shows 7 to 10 courses (as your design does), taken from both semesters of the student's program.
- **Rejecting** returns the student's waiting courses to the free trial and the student sees the reason.
- **Sidebar badge** with the waiting count is not added yet; say if you want it.
- **Payment history on the student profile** (SRS 6.6) is not added in this phase.

## Removed in Phase 18

Nothing. The Payments placeholder page was replaced.

## Added or changed

**./**

- README.md

**apps/admin-web/src/app/(portal)/commerce/payments/**

- page.tsx

**apps/admin-web/src/app/(portal)/commerce/payments/[id]/**

- page.tsx

**apps/admin-web/src/core/mock/data/**

- dashboard.ts
- index.ts
- paymentsAdmin.ts
- students.ts

**apps/admin-web/src/modules/payments/**

- index.ts

**apps/admin-web/src/modules/payments/api/**

- payments.api.ts

**apps/admin-web/src/modules/payments/components/**

- PaymentBadges.tsx
- Payments.module.css
- ReceiptViewer.tsx

**apps/admin-web/src/modules/payments/hooks/**

- usePayments.ts

**apps/admin-web/src/modules/payments/lib/**

- paymentText.ts

**apps/admin-web/src/modules/payments/screens/**

- PaymentQueueScreen.tsx
- PaymentReviewScreen.tsx

**apps/admin-web/src/modules/shell/components/**

- Topbar.tsx

**docs/**

- ARCHITECTURE.md
- ROADMAP.md

**docs/changes/**

- PHASE18-CHANGES.md

**packages/contracts/src/**

- adminPayments.ts
- index.ts

**packages/domain/src/**

- index.ts

**packages/domain/src/constants/**

- admin.ts

**packages/domain/src/payments/**

- decision.ts

**packages/i18n/src/admin/**

- en.json
