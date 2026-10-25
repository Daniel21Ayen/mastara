# ADR 004: Mandatory Offline Downloads and Cryptographic Content Keys (Revision of D5, FR-C07, NFR-04)

## Status
Accepted (October 22, 2026)

## Context
Initial specifications assumed streaming media and live cloud document rendering. In practice, campus internet is intermittent, expensive, and subject to packet loss. Attempting to view un-downloaded materials caused spinning loaders, empty screens, and failed exam attempts. Furthermore, paid content required offline cryptographic protection against extraction.

## Decision
1. Revise Decision D5, FR-C07, and NFR-04: Educational content **must be downloaded locally before it can be opened**.
2. If content is not present in local SQLite and encrypted disk storage, opening it throws `CONTENT_NOT_DOWNLOADED` with an immediate prompt to download.
3. Downloads manage 5 explicit states: `not_downloaded`, `downloading` (progress), `downloaded`, `update_available`, `failed`.
4. Deleting a course purges both database rows and encrypted file blobs.
5. Content encryption:
   - Free trial preview items use a device-specific hardware key stored in SecureStore.
   - Paid courses require an HMAC-SHA256 signed entitlement key issued by the backend upon verified purchase.

## Consequences
- Guaranteed zero-buffering study and exam experience once downloaded.
- Protects commercial educational IP on student devices.
- Requires pre-flight storage validation before initiating downloads.
