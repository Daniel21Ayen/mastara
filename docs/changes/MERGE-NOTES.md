# Combined repository (R4 student app + Admin Phases 11-18)

Layers applied in this order, later layers win only for files they own:
1. `mastara-phase-R4`        student app, shared packages, root tooling
2. `mastara-admin-complete`  Admin portal (Phases 11-16) + `integration/link-admin.mjs`
3. `mastara-phase17`         Admin Questions & exam sets
4. `mastara-phase18`         Admin Payments

## Decisions made while merging
- Phase 17/18 `packages/{domain,contracts}/src/index.ts` were NOT used: they are copies that drop student exports
  (`mathLayout`, `submission`, `selectDue`, `trustedTime`, `maskIdentifier`, `bytes`, `resolveRead` ...).
  The R4 barrels stay; the admin modules are exported through `adminExports.ts` (one added line per barrel).
- `adminExports.ts` (domain, contracts) now also export `assessment/setRules`, `payments/decision`,
  `adminExamSets`, `adminPayments`.
- Phase 17/18 did not ship `packages/i18n/src/admin/en.json`. 184 keys (payments, questions, EXAM_SET_* audit
  actions, `payments.stream.BOTH`) were reconstructed from the call sites. Reword them freely.
- `link-admin.mjs --write` was run: dev:admin script, turbo tasks, .gitignore/.prettierignore/eslint ignores.

## Not in any upload (still missing from the target structure)
`apps/api`, `apps/worker`, `packages/database`, `packages/sdk`, `infra/`, `tests/`. The admin and student apps run
on mock data. Admin F11h Pricing/Audit Log and F11i Notifications/Support are still placeholders.

## Not verified here (no network)
`npm install`, `npm run typecheck`, `next build`, Expo start.

## Fix round 1 (from the first typecheck on a real machine)
- Admin mock data (`paymentsAdmin.ts`, `examSetsAdmin.ts`, `students.ts`) used the student `ERROR_CODES` for admin codes
  (`NOT_FOUND`, `INVALID_STATE`, `IDENTIFIER_DUPLICATE`); they now use `ADMIN_ERROR_CODES`.
- Mobile `createStyles` now mirrors React Native's own `StyleSheet.create` signature so `'row'`, `'center'`, `'absolute'` stay literal types.
- `StyleSheet.absoluteFillObject` -> `StyleSheet.absoluteFill`; local `ViewToken` type; `AcademicValues` is a `type` (no index-signature error);
  `TextField.error` accepts `undefined`.
- "Cannot find module expo-router / expo-clipboard / ..." is not a code bug: the Expo packages are installed with the
  `npx expo install ...` command in README "First run" (they are intentionally not in package.json).

## Courses update (catalog)
- Add Course: University list starts with "All universities" (course open to every university, then Semester 1 or 2 only); logo shown next to the chosen university.
- Free trial: "Free trial items" number (0-20) replaces the Promotional tick box. `promotional` is now true when the number is above 0.
- Every Catalog tab (Universities, Programs, Semesters, Courses): pagination, Active/Inactive switch (Inactive asks for a reason), Delete with confirmation.
- Delete is refused (IN_USE) while programs, courses or students still use the entry.
- Status labels read Active / Inactive (PUBLISHED / DRAFT underneath).
- Added five missing admin validation texts (question ID, prompt, minutes, year, reject reason).
