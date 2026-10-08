# Mastara (ማስታራ)

> **Bilingual, offline-first learning platform for Ethiopian university freshmen.**  
> *Merged Baseline Architecture & Software Requirements Specification v2.3*

---

## 📖 Overview

**Mastara (ማስታራ)** is designed to help Ethiopian university freshmen transition from simply finding study materials to deeply understanding concepts, practicing effectively, and sitting for university and national examinations. 

Built specifically for high resilience on budget mobile devices (Tecno, Infinix class with 2–3 GB RAM) and unreliable internet connections, Mastara combines:
- **One Logical Bilingual Model:** Side-by-side English and Amharic content with 100% offline KaTeX STEM formula rendering.
- **Strict Device Integrity:** One Student account strictly bound to one physical device hardware UUID.
- **Monotonic Anti-Cheat Exams:** Offline and online examination timers impervious to device system clock tampering.
- **National COC Module:** A standalone cross-course question pool independent of single-course exams.
- **Local Commerce Verification:** Manual CBE Mobile Banking, CBE Birr, and Telebirr payment proof verification with automated server-side entitlement expiry.

---

## 🏛️ System Architecture

Mastara is structured as a high-performance **Turborepo** monorepo using **npm workspaces**:

```
mastara/
├── apps/
│   ├── api/             # NestJS REST backend (auth, device lock, sync, commerce, catalog)
│   ├── admin-web/       # Next.js (App Router) operational portal & scan workstation
│   ├── mobile/          # React Native with Expo (Android-first, iOS supported)
│   └── worker/          # Background job queues (PDF conversion, entitlement expiry)
│
├── packages/
│   ├── database/        # PostgreSQL 16+ schemas via Prisma 7 (multi-file partitions)
│   ├── domain/          # Pure business logic (pricing engine, timer math, entitlements)
│   ├── contracts/       # Shared API DTOs and validation schemas
│   ├── config/          # Centralized configuration and environment validation
│   ├── i18n/            # Amharic (am.json) and English (en.json) localization catalogs
│   ├── sdk/             # End-to-end typed API client for mobile and web
│   ├── ui-tokens/       # Design tokens (colors, typography, spacing)
│   ├── ui-native/       # Shared mobile component library
│   ├── ui-web/          # Shared Admin web component library
│   └── utils/           # Utilities (UUIDv7, monotonic clocks, cryptographic hashes)
│
├── infra/               # Deployment (Nginx, PM2 configs, database backup scripts)
└── docs/                # Architecture Decision Records (ADRs), API specs, and SRS
```

---

## ⚡ Key Architectural Partitions

| Partition | Core Responsibilities |
| :--- | :--- |
| **Partition A: Identity & Device** | Student registration, JWT session rotation, and strict **1 Student = 1 Hardware Device** binding (`x-device-id`). Second device access triggers a localized Amharic/English lock modal (`403 DEVICE_MISMATCH_LOCKED`). |
| **Partition B: Academic Catalog** | Cascading hierarchy: **University → Program → Semester → Course**. Stream filtering strictly separates courses by `NATURAL`, `SOCIAL`, and `COMMON` streams. |
| **Partition C: Bilingual STEM Content** | Single logical bilingual records (`title_en`, `title_am`, `body_en`, `body_am`). Mixed Amharic and inline/block LaTeX formulas render offline without CDN dependencies. |
| **Partition D: Assessments & Exams** | Practice & Quizzes 1–3 with immediate feedback. Mid, Final, and Mock exams grouped by university. Answers written to encrypted SQLite in **under 10 ms**. Monotonic elapsed time timer resists clock manipulation. |
| **Partition E: Standalone COC Exam** | National Cross-Course COC examination module accessible strictly from the Home dashboard. Questions drawn from a cross-course pool with full breakdown analytics. |
| **Partition F: Commerce & Entitlements** | Pricing engine enforcing Semester Bundles (7–10 courses default 200 ETB), tiered Extra Courses (100 ETB then 50 ETB), and Full Freshman packages (350 ETB). Proof verification via CBE and Telebirr with `UNIQUE(transaction_reference)` database constraints. |
| **Partition G: Offline Synchronization** | Local outbox queue powered by UUIDv7 operation IDs. NetInfo worker automatically flushes mutations on reconnect. Idempotent sync endpoints guarantee zero answer loss. |
| **Partition H: Admin Operations** | Comprehensive control plane: payment queue verification, student scope adjustments, catalog publishing, and **Scan-to-PDF Workstation** (converting 6+ images into one optimized PDF). |

---

## 🛠️ Technology Stack

- **Mobile Client:** React Native with Expo (Hermes engine, Encrypted SQLite)
- **Admin Portal:** Next.js (App Router, Tailwind CSS / Vanilla CSS)
- **Backend API:** NestJS (Node.js LTS, Express, Passport, JWT)
- **Database:** PostgreSQL 16+ (UUIDv7, Timestamptz, JSONB, native Enums)
- **ORM:** Prisma 7.10.0 (Native multi-file schema organization)
- **Cache & Queue:** Redis 7 (Alpine)
- **Object Storage:** S3-compatible bucket (MinIO for local development)
- **Containerization:** Docker & Docker Compose

---

## 🚀 Getting Started (Docker-First)

### 1. Prerequisites
- [Docker](https://docs.docker.com/get-docker/) (v24.0 or newer)
- [Docker Compose](https://docs.docker.com/compose/) (v2.20 or newer)
- [Node.js](https://nodejs.org/) (v20 LTS or v22) & npm

### 2. Clone and Configure
```bash
# Clone the repository
git clone https://github.com/Kewakibt-Enterprise-Platform/mastara.git
cd mastara

# Create local environment configuration from template
cp .env.example .env
```

### 3. Start Infrastructure Containers
Start PostgreSQL 16, Redis 7, and MinIO locally:
```bash
docker compose up -d
```

Verify running containers:
```bash
docker compose ps
```

| Service | Container Name | Host Port | Internal Port |
| :--- | :--- | :--- | :--- |
| **PostgreSQL 16** | `mastara-postgres` | `5433` | `5432` |
| **Redis 7** | `mastara-redis` | `6380` | `6379` |
| **MinIO API** | `mastara-minio` | `9002` | `9000` |
| **MinIO Console**| `mastara-minio` | `9003` | `9001` |

---

## 🔒 Hard Release Gates & Non-Functional Requirements

- **App Package Target:** Under **50 MB** installed release package (hard gate; no bundled textbooks).
- **Runtime Memory:** Under **120 MB** on 2–3 GB RAM reference devices.
- **Local Write Latency:** **< 10 ms** p95 persistence time for question answer selection.
- **Zero Answer Loss:** Local answers survive process kills, airplane mode, and crashes.
- **Anti-Clock Tampering:** System clock rollbacks cannot extend test or exam durations.
- **Security & Authorization:** Server-side role resolution; client roles are ignored and logged. Receipts restricted strictly to Admin inspection.

---

## 📜 Branching & Commit Conventions

This project follows **Conventional Commits**:
- `feat(scope): ...` for new features
- `fix(scope): ...` for bug fixes
- `chore(scope): ...` for tooling, configuration, and dependencies
- `docs(scope): ...` for documentation updates

**Active Development Branch:** `feat/backend-foundation`

---

## 📄 License
Confidential and Proprietary — Kewakibt Enterprise Platform. All rights reserved.
