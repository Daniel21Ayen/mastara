# ADR 005: Universal canOpen Access Function and Unified Paywall Component

## Status
Accepted (October 23, 2026)

## Context
Previously, access control logic was fragmented across client screens and API controllers, leading to inconsistencies where students saw content marked free on one screen but were blocked on another. Paywall modals also exhibited varying wording and buttons.

## Decision
1. Implement a single source-of-truth access evaluation function: `canOpen(student, item)` in `@mastara/domain`, shared across API guards and mobile client views.
2. Evaluation order is strictly:
   1. `UNAVAILABLE`: Inactive or unpublished content.
   2. `ENTITLED`: Active paid student entitlement.
   3. `FREE_COURSE`: Entire course marked free.
   4. `FREE_ITEM`: Item-level free trial flag.
   5. `LOCKED`: Return reason `PURCHASE_REQUIRED` or `COURSE_NOT_ENROLLED`.
3. Standardize the paywall UI to `LockedContentSheet`:
   - Bilingual copy in English and Amharic.
   - Single "Purchase Course / ኮርስ ይግዙ" button navigating to the Store with `courseId` pre-selected.
   - Deployed at all 4 content gates: Materials, Exams, Tests, and COC.

## Consequences
- Guaranteed 1:1 parity between server access decisions and mobile UI display.
- Single codebase to maintain for paywall UX and monetization flows.
