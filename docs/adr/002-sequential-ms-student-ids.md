# ADR 002: Sequential MS Student Identifiers

## Status
Accepted (October 21, 2026)

## Context
UUIDs are difficult for Ethiopian university students to memorize, speak over phone support, or write on manual bank deposit slips. The platform required a clean, human-readable student identifier format starting at `MS0001`.

## Decision
1. Introduce an automated sequence counter on the central PostgreSQL database.
2. Format student public identities as `MS` followed by four or more digits (`MS0001`, `MS0002`, ... `MS10450`).
3. Display this identifier prominently on the student profile, in administrative student tables, and require it as the reference tag for manual bank slip verification.

## Consequences
- Greatly simplifies student support and manual bank slip reconciliation.
- Internal database foreign keys continue using standard primary keys, maintaining database integrity and normalization.
