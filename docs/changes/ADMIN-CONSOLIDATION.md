# Admin side, consolidated (Phases 11 to 16 in one zip)

One zip holds the whole Admin portal as of Phase 16, with every conflict against the student app (up to R4) resolved.
Do **not** apply the six phase zips any more; use this one.

## Install

```bash
# from the repository root, after unzipping this file into it (it contains one top folder: mastara/)
node integration/link-admin.mjs            # check only
node integration/link-admin.mjs --write    # adds 1 line to 3 shared barrels + dev:admin script + .next ignores
npm install
cp apps/admin-web/.env.example apps/admin-web/.env.local
npm run dev:admin                          # http://localhost:3001  (admin@mastara.demo / admin123)
```

The script never replaces a file, can be run again, and tells you about anything it cannot fix itself.

## Conflicts found and how they were resolved

| # | Conflict | Evidence | Resolution |
|---|---|---|---|
| 1 | `en.json` for Phases 13 to 16 was **missing** from the four zips (notes list it, zips do not contain it): 314 of 461 text keys had no text | key check of code vs `en.json` | **Rewritten**: 546 keys, every static and dynamic key covered, placeholders match the call sites |
| 2 | `README.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md` were changed by both tracks (R4 lacks admin, Phase 16 has old student text) | diff | **Merged**: R4 student content + admin sections; the old F10a to F10e admin plan is replaced by F11a to F11i |
| 3 | `constants/errors.ts` (Phases 12, 13) would drop `CONTENT_NOT_DOWNLOADED` added by R3 | R4 architecture doc | Not shipped. Admin uses its own `ADMIN_ERROR_CODES` (`constants/adminErrors.ts`). If an old `errors.ts` is already in your repo, the script reports the missing codes |
| 4 | Shared barrels (`domain/contracts/i18n index.ts`) were overwritten with Phase 10 copies, losing later student exports (`selectDue`, `trustedTime`, `submission`, `mathLayout`, ...) | R4 architecture doc | Not shipped. Admin exports sit in `adminExports.ts` / `adminStrings.ts`; each barrel gets one added line |
| 5 | Root `eslint.config.mjs`, `turbo.json`, `package.json`, `.gitignore`, `.prettierignore` from Phase 11 would overwrite the student's (R2's StyleSheet lint guard lives in the ESLint file) | R4 architecture doc | Not shipped. The script adds only what admin needs |
| 6 | `ui-tokens` reorganised by R2 (`lightColors` / `darkColors`); the portal imported the old `colors` | R4 architecture doc | `core/theme/cssVariables.ts` reads `lightColors`, falling back to `colors` |

## Verified here
- All 174 admin source files: every relative / `@/` import and CSS-module class resolves; no hard-coded colours.
- 546 text keys: all used keys exist; all enum-built keys exist (audit actions, statuses, question types, scan kinds ...); placeholder names match.
- Admin domain rules run correctly (grant dates, question problems, scan files, course codes, versions, identifiers); validation message numbers match the constants.
- Shimmed type check: no unresolved module, name or export, no duplicate export, also when the old per-phase barrel lines are still present.
- `link-admin.mjs`: dry run, write and repeat run tested on a simulated repo.

## NOT verified (needs your machine)
- `npm install`, `next build` and the real type check (zod, React and Next types were not available here).
- Visual check of the reconstructed English texts in the browser; reword in `packages/i18n/src/admin/en.json` as you like.
- The student-owned files the portal reads (`academic`, `auth`, `validation` contracts, `ui-tokens`, `parseMath`, `timeAgo` ...) were not in any zip; the script checks they exist.

## Not part of this zip
Admin F11f Questions & COC sets, F11g Payments, F11h Pricing and Audit Log, F11i Notifications/support are not in any uploaded file; their menu items open "Coming in F11x" pages. F11f must follow the F4d exam contract and carry the exam and COC set minutes (see `docs/ROADMAP.md`).

## Known notes
- Admin question types are Multiple Choice (one answer), True/False, Short Answer and Blank Space. The student app also has select-all questions; the portal cannot author those yet.
- Original per-phase notes are kept in `docs/changes/PHASE11-CHANGES.md` to `PHASE16-CHANGES.md` (their "copy this zip" steps are superseded by this file).
