#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# Mastara — Production Release Step: Prisma Migrate Deploy & Rollback
# Usage: ./infra/scripts/migrate-release.sh
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Load .env if present
if [[ -f "${ROOT_DIR}/.env" ]]; then
  # shellcheck disable=SC1091
  set -a
  source "${ROOT_DIR}/.env"
  set +a
fi

echo "============================================================"
echo "  Mastara Release Step: Database Migration"
echo "  Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S") UTC"
echo "============================================================"

# Step 1: Pre-Release Database Backup
echo "  [1/3] Creating pre-release safety backup..."
if [[ -x "${SCRIPT_DIR}/backup.sh" ]]; then
  "${SCRIPT_DIR}/backup.sh"
else
  bash "${SCRIPT_DIR}/backup.sh"
fi
echo "  ✔ Pre-release database snapshot secured."

# Step 2: Run Prisma Migrate Deploy
echo "  [2/3] Applying pending database migrations via Prisma..."
MIGRATION_START=$(date +%s)

if npm run db:migrate:deploy --prefix "${ROOT_DIR}"; then
  MIGRATION_DURATION=$(( $(date +%s) - MIGRATION_START ))
  echo "  ✔ Prisma migrations successfully deployed in ${MIGRATION_DURATION}s."
else
  MIGRATION_EXIT_CODE=$?
  echo "❌ CRITICAL: 'prisma migrate deploy' failed with exit code ${MIGRATION_EXIT_CODE}!" >&2
  echo "" >&2
  echo "============================================================" >&2
  echo "  ROLLBACK PLAN INITIATED" >&2
  echo "  The database migration failed. Traffic has NOT been routed to new release." >&2
  echo "  To rollback to pre-release state:" >&2
  echo "    1. Run ./infra/scripts/restore-drill.sh to verify backup integrity." >&2
  echo "    2. Run ./infra/scripts/rollback-release.sh to restore database snapshot." >&2
  echo "============================================================" >&2
  exit "${MIGRATION_EXIT_CODE}"
fi

# Step 3: Validate database connection and schema version
echo "  [3/3] Validating database readiness post-migration..."
if command -v npx >/dev/null 2>&1; then
  npx prisma migrate status --schema="${ROOT_DIR}/packages/database/prisma/schema"
fi

echo "============================================================"
echo "✔ RELEASE MIGRATION SUCCESSFUL"
echo "  Ready for zero-downtime application process rollout."
echo "============================================================"
exit 0
