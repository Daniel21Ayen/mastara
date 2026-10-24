# Admin Security Architecture & Permission Scopes Plan

## Overview
To enforce the principle of least privilege, administrator capabilities are segmented into distinct permission scopes. Administrative personnel are assigned only the minimum privileges necessary to execute their role.

## Defined Administrative Scopes

### 1. `RECEIPT_REVIEWER`
- **Scope & Responsibility:** Verification, approval, and rejection of student payment proof uploads (bank receipts, transfer screenshots).
- **Authorized Endpoints:**
  - `GET /api/v1/admin/payments` (List pending/approved/rejected payments)
  - `POST /api/v1/admin/payments/:id/approve` (Approve payment & trigger entitlements)
  - `POST /api/v1/admin/payments/:id/reject` (Reject payment with reason)
  - `GET /api/v1/admin/payments/:id/receipt-url` (Get time-limited presigned URL)
- **Forbidden Actions:** Cannot edit academic courses, modules, chapters, exam questions, or alter student roles.

### 2. `CONTENT_EDITOR`
- **Scope & Responsibility:** Management of academic curriculum, catalog, learning modules, questions, and exam scans.
- **Authorized Endpoints:**
  - `POST/PUT/DELETE /api/v1/admin/catalog/*` (Universities, Programs, Semesters, Courses)
  - `POST/PUT/DELETE /api/v1/admin/content/*` (Chapters, Materials, Videos, PDFs)
  - `POST/PUT/DELETE /api/v1/admin/tests/*` (Question banks, quizzes, exams)
  - `POST /api/v1/admin/scans/*` (Trigger PDF scanning and OCR processing)
- **Forbidden Actions:** Cannot access student payment slips, view banking receipts, approve financial transactions, or view audit logs.

### 3. `SUPER_ADMIN`
- **Scope & Responsibility:** System configuration, audit investigation, user status modification, and scope assignments.
- **Authorized Endpoints:** Full platform access.

## Implementation Details
- **Enforcement Guard:** `@RequireAdminScope(AdminScope.RECEIPT_REVIEWER)` decorator paired with `AdminScopeGuard`.
- **JWT Payload:** Includes `admin_scopes: string[]` claim.
- **Session Duration:** 15 minutes max lifetime (`JWT_EXPIRES_IN=15m`).
- **Audit Logging:** Every administrative action is logged to `AuditLog` with actor ID, IP address, user-agent, target entity, and timestamp.
