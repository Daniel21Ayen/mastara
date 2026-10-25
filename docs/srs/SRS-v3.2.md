# Software Requirements Specification (SRS) v3.2
**Project**: Mastara — Kewakibt Enterprise Educational Platform  
**Document Version**: 3.2  
**Date**: October 24, 2026  
**Status**: Approved Baseline  
**Supersedes**: SRS v3.1 (October 19, 2026)

---

## 1. Introduction & Executive Summary

### 1.1 Purpose
This document defines the formal software requirements for **Mastara**, an enterprise offline-first educational platform developed for Ethiopian university students. Mastara bridges the connectivity and resource constraints of Ethiopian higher education through local cryptographic storage, resilient peer-and-device synchronization, and an intuitive mobile learning experience.

### 1.2 Document Versioning & Header/Footer Alignment
This specification formally resolves the title and footer version discrepancy observed in SRS v3.1. All references, headers, and footers consistently designate **SRS v3.2**, incorporating the architectural decisions finalized between October 20 and October 23, 2026.

---

## 2. Key Architectural Decisions (October 20–23, 2026 Baseline)

### 2.1 Offline Registration & Account Lifecycle
Students frequently install the mobile application in areas with zero cellular connectivity.
- **LOCAL_ONLY State**: A student may register an account offline with their phone number, full name, and password. The application computes a salted SHA-256 hash stored in on-device SQLite. No network requests are dispatched until purchase or online sync.
- **Seamless Upgrade**: Upon initiating their first purchase or performing a cloud sync, the client submits the registration payload to `/auth/register-offline`, synchronizing the account and receiving a signed auth token and permanent student identifier.

### 2.2 Sequential Student Identifiers (MS IDs)
- All registered students are assigned a sequential identifier prefixed with `MS` followed by four or more digits (starting at `MS0001`).
- Identifiers are generated atomically on the central PostgreSQL database via sequence counter and are displayed prominently on the mobile Profile screen and in administrative records.

### 2.3 Strict CSV-Only Server-Side Import (Zero-Trust)
- Content import endpoints (`/admin/tests/import-csv` and question uploaders) enforce strict server-side content inspection.
- The server inspects the raw file buffer magic bytes:
  - Rejects `%PDF` (`0x25 0x50 0x44 0x46`).
  - Rejects PK/ZIP (`0x50 0x4B 0x03 0x04`).
- File extension matching (`.csv`) and MIME headers (`text/csv`) alone are untrusted. Imports failing magic byte inspection return `400 BAD_REQUEST: CSV_FILE_REQUIRED`.

### 2.4 Revision of D5, FR-C07, and NFR-04: Mandatory Downloads
- **Decision D5 (Revised)**: Online streaming of video, audio, and heavy chapter documents is formally deprecated.
- **FR-C07 & NFR-04 (Revised)**: Educational content (materials, chapters, exam sets, and notes) **must be downloaded to encrypted local storage before it can be opened**. Attempting to open undownloaded content while offline or online triggers `403 CONTENT_NOT_DOWNLOADED` with an immediate prompt to download the bundle.
- Pre-download verification validates available storage against bundle size plus a 50 MB safety margin.

### 2.5 Single Unified Access Model (`canOpen`)
All access evaluations across the NestJS API server guards and the React Native mobile client execute through the universal function `canOpen(student, item)`.
Evaluation order is deterministic:
1. `UNAVAILABLE`: Item or parent course is unpublished (`published_at == null`) or inactive (`is_active == false`).
2. `ENTITLED`: Student holds an active, unexpired signed entitlement for the course.
3. `FREE_COURSE`: Course access type is explicitly `FREE`.
4. `FREE_ITEM`: Specific item-level preview flag is active (preview chapter, free trial test set, COC sample).
5. `LOCKED`: All other items are locked, returning `reason: 'PURCHASE_REQUIRED'` or `'COURSE_NOT_ENROLLED'`.

### 2.6 Single Paywall Component (`LockedContentSheet`)
When access is denied with `403 CONTENT_LOCKED`, the mobile client maps the response to a single unified bottom sheet component:
- **Bilingual Copy**:
  - English: *"Unlock Full Course Access — Get complete access to all chapters, lecture notes, test sets, and previous exams."*
  - Amharic: *"ሙሉ የኮርሱን ይዘት ይክፈቱ — ሁሉንም ምዕራፎች፣ የማስታወሻ ጽሑፎች፣ የፈተና ጥያቄዎች እና ያለፉ ፈተናዎችን ያግኙ።"*
- **Action Button**: *"Purchase Course / ኮርስ ይግዙ"*, which navigates directly to the Store screen with `courseId` pre-selected.
- Deployed uniformly at all 4 content gates:
  1. Materials: Non-preview Chapters.
  2. Exams: Mid, Final, and Mock examination sets.
  3. Tests: Chapter assessment quizzes.
  4. COC: Full qualification sample exams.

---

## 3. Functional Requirements

### 3.1 Content & Question Numbering (FR-Q)
- **FR-Q01 (Scoped Display Number)**: Every question in an exam set or quiz topic possesses a `display_number` integer $\ge 1$, completely separated from the global database primary key `id` and `question_number`.
- **FR-Q02 (Transactional Allocation)**: When creating a question, the server allocates `display_number` in a Prisma interactive transaction utilizing a counter scoped to the exam set or topic.
- **FR-Q03 (Gapless Deletion Renumbering)**: Deleting a question decrements the `display_number` of all subsequent questions in the set, guaranteeing that students always see a contiguous, gapless $1, 2, 3 \dots N$ sequence.
- **FR-Q04 (Creation-Order Backfill)**: Existing questions without a `display_number` are automatically backfilled in their original creation order (`created_at ASC`).

### 3.2 Content Structure & Amharic Notes Migration (FR-C)
- **FR-C01 (Topic Items Separation)**: Legacy columns `title_am`, `body_en`, and `body_am` on the `contents` table are eliminated.
- **FR-C02 (Content Kinds)**: English and Amharic notes exist as independent content records under a topic with `ContentKind.NOTE` and `ContentKind.AMHARIC_NOTE`, sharing the standard `title` and `body` fields.

### 3.3 Downloads & Cryptographic Key Management (FR-D)
- **FR-D01 (Download State Machine)**: Every downloadable course-pack transitions through 5 explicit states:
  `not_downloaded` $\to$ `downloading` (with percentage progress) $\to$ `downloaded` $\to$ `update_available` $\to$ `failed`.
- **FR-D02 (Action Button)**: Download action toggles strictly between `Download` and `Delete`. Initiating `Delete` purges both the on-disk encrypted files and the SQLite metadata rows.
- **FR-D03 (Cryptographic Keys)**:
  - Free content is encrypted using a device-specific hardware key stored in SecureStore.
  - Paid content requires an HMAC-SHA256 signed entitlement key issued by the central API upon purchase approval.

### 3.4 Admin Content Management (FR-ADM)
- **FR-ADM01 (List-First Pattern)**: Navigation to Content opens a filterable list table with active status toggles, inline editing, gapless deletion, URL-synchronized pagination, and an `+ Add` button launching the creation drawer.
- **FR-ADM02 (Test Set Form)**: The test set dialog captures all 7 required attributes:
  1. Program (Dropdown selection)
  2. Semester (Dropdown selection)
  3. Stream (`NATURAL`, `SOCIAL`, `COMMON`)
  4. Course (Filtered by program and semester)
  5. Test Set ID / Title (Text)
  6. Time Allowed (Integer minutes, $\ge 1$)
  7. Access / Permission (`ENROLLED_ONLY` or `FREE_TRIAL`)

---

## 4. Non-Functional Requirements & Performance

### 4.1 NFR-01: ARM64 Release APK Size (< 20 MB)
- The Android release APK for `arm64-v8a` must not exceed **20.0 MB**.
- Evaluated automatically in CI via `apps/mobile/scripts/check-app-size.mjs`.

### 4.2 NFR-02: Device Memory Footprint on 2 GB Android Devices (< 120 MB RAM)
- The foreground process Resident Set Size (RSS) must remain strictly **under 120 MB RAM** during syllabus navigation and exam sessions.
- **Single Shared KaTeX Renderer**: Replaces individual per-formula WebViews with a unified shared renderer (`SharedKatexRenderer`), creating at most 1 Chromium instance per document. Simple math expressions ($E = mc^2$) render natively as zero-overhead text.

---

## 5. Operational Procedures & SLAs

### 5.1 Payment Review SLA (Manual CBE / Telebirr Verification)
Until the automated payment gateway is active:
1. **Student Submission**: The student submits their mobile transaction reference (CBE Birr SMS or Telebirr transaction code) along with an optional bank slip screenshot.
2. **Review Window**: Finance operators must verify and approve or reject submissions within **15 minutes** between 08:00 and 20:00 East Africa Time (EAT), and within **60 minutes** outside business hours.
3. **Escalation**: Unreviewed payments pending $> 30$ minutes generate high-priority admin dashboard alerts.

### 5.2 Student Data Deletion & Privacy Process
In compliance with student privacy standards:
1. **Deletion Request**: A student may submit an account deletion request via the Profile settings or support ticket.
2. **Processing Window**: Central records are purged within **7 business days**.
3. **Purge Actions**:
   - PII (Phone number, full name, device IDs) is permanently anonymized (`MS_DELETED_<id>`).
   - Active device locks are immediately released.
   - Financial audit logs retain transaction references for tax compliance without associating identifiable personal student data.

### 5.3 Automated Payment Gateway Migration Plan
- **Phase 1 (Current)**: Manual bank receipt and SMS reference verification via Admin Payments portal.
- **Phase 2 (Immediate Target)**: Direct Webhook integration with **Chapa** and **Telebirr SuperApp SDK** for instantaneous entitlement provisioning upon payment completion.
- **Phase 3**: Commercial Bank of Ethiopia (CBE Birr) direct corporate API integration.

---

## 6. Section 13: Release Checklist & Acceptance Criteria

| # | Item | Acceptance Criteria | Responsible |
|---|---|---|---|
| 13.1 | **CI Pipeline** | Clean clone passes install, typecheck, lint, unit tests, throwaway Postgres migrations, API integration tests, and gitleaks scan. | CI / DevOps |
| 13.2 | **Size Gate** | Android release APK (`arm64-v8a`) $\le 20.0$ MB verified by `check-app-size.mjs`. | Mobile Lead |
| 13.3 | **Memory Budget** | Foreground RAM on 2 GB device $\le 120$ MB verified via `adb shell dumpsys meminfo`. | Performance Lead |
| 13.4 | **Access Security** | `canOpen` unit test matrix passes 100% of combinations; undownloaded content returns `CONTENT_NOT_DOWNLOADED`. | Security Lead |
| 13.5 | **Question Numbering** | `display_number` restarts at 1 per set, survives concurrent creates, and maintains gapless order upon deletion. | Backend Lead |
| 13.6 | **Paywall Uniformity** | `LockedContentSheet` displays bilingual English/Amharic copy and opens Store with pre-selected course across all 4 gates. | QA Lead |
| 13.7 | **Admin UI Parity** | Content list-first pattern, 7-field test set form, active-state color matching (`var(--color-primary)`), and CSV magic byte validation verified in Playwright. | Frontend Lead |
| 13.8 | **Offline Account Sync** | Local-only registration operates seamlessly offline; student ID `MS0001+` assigned upon first sync. | Mobile Lead |

---
*End of Specification — Mastara SRS v3.2*
