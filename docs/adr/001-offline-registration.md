# ADR 001: Offline Registration and Delayed Account Synchronization

## Status
Accepted (October 20, 2026)

## Context
Many university students in Ethiopia install the Mastara mobile app via offline distribution channels (e.g. Xender, local campus hotspots) without reliable internet access. Forcing immediate network registration prevented students from using the app to explore syllabi, read free trial notes, and prepare offline profiles.

## Decision
1. Introduce a `LOCAL_ONLY` account lifecycle state in the mobile application.
2. Allow registration on-device by computing a salted SHA-256 password hash stored directly in the local SQLite database.
3. No network requests are dispatched during offline registration.
4. When the student initiates their first course purchase or an online data synchronization, the account is submitted to `/auth/register-offline`, synchronizing credentials and assigning a permanent central student identifier (`MS0001+`).

## Consequences
- Students can immediately use the app completely offline upon install.
- Password hashes generated offline are cryptographically salted, preventing rainbow table attacks if local storage is extracted.
- Account collisions on phone numbers are resolved gracefully during the initial purchase synchronization.
