# ADR 003: Server-Side Magic Byte Validation for CSV-Only Question Imports

## Status
Accepted (October 22, 2026)

## Context
Admins upload question banks in CSV format. Previous implementations relied on client-side MIME checks (`text/csv`) and file extensions (`.csv`), which allowed malformed files, binary PDFs, or zip archives to be passed to the parser, causing server crashes, memory leaks, or corrupted database rows.

## Decision
1. Enforce strict server-side content verification on raw file buffers.
2. Directly inspect magic bytes:
   - Reject files beginning with `%PDF` (`0x25 0x50 0x44 0x46`).
   - Reject files beginning with `PK\x03\x04` (`0x50 0x4B 0x03 0x04`).
3. Reject non-text content with `400 BAD_REQUEST: CSV_FILE_REQUIRED`.
4. Parse text using an auto-detecting delimiter parser (supporting commas, tabs, and semicolons) with transaction rollback on error.

## Consequences
- Guarantees zero binary corruption in assessment import pipelines.
- Prevents accidental upload of syllabus PDFs or zip bundles into question banks.
