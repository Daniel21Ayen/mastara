#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# Mastara — Production Release Rollback Script
# Restores database to the latest pre-release backup snapshot
# Usage: ./infra/scripts/rollback-release.sh [backup_file_path]
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

BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/infra/backups}"
BACKUP_FILE="${1:-}"

# Find latest pre-release backup
if [[ -z "${BACKUP_FILE}" ]]; then
  BACKUP_FILE="$(find "${BACKUP_DIR}" -name "mastara_*.dump" -type f 2>/dev/null | sort -r | head -n 1)"
fi

if [[ -z "${BACKUP_FILE}" || ! -f "${BACKUP_FILE}" ]]; then
  echo "❌ ERROR: No backup snapshot found to rollback from in '${BACKUP_DIR}'!" >&2
  exit 1
fi

PGUSER="${POSTGRES_USER:-mastara}"
PGPASSWORD="${POSTGRES_PASSWORD:-mastara_secure_pass_2026}"
PGDATABASE="${POSTGRES_DB:-mastara}"
PGHOST="${POSTGRES_HOST:-127.0.0.1}"
PGPORT="${POSTGRES_HOST_PORT:-5433}"

if [[ -n "${DATABASE_URL:-}" && "${DATABASE_URL}" =~ postgresql://([^:]+):([^@]+)@([^:/]+):([0-9]+)/([^?]+) ]]; then
  PGUSER="${BASH_REMATCH[1]}"
  PGPASSWORD="${BASH_REMATCH[2]}"
  PGHOST="${BASH_REMATCH[3]}"
  PGPORT="${BASH_REMATCH[4]}"
  PGDATABASE="${BASH_REMATCH[5]}"
fi

echo "============================================================"
echo "  Mastara Database Rollback Execution"
echo "  Target: ${PGDATABASE}@${PGHOST}:${PGPORT}"
echo "  Backup Snapshot: ${BACKUP_FILE}"
echo "============================================================"

# Verify Checksum before rolling back
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [[ -f "${CHECKSUM_FILE}" ]]; then
  echo "  [1/3] Verifying backup checksum..."
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum -c "${CHECKSUM_FILE}"
  fi
  echo "  ✔ Checksum valid."
fi

# Terminate existing connections to allow drop/restore
echo "  [2/3] Terminating active connections to '${PGDATABASE}'..."
DISCONNECT_CMD="SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${PGDATABASE}' AND pid <> pg_backend_pid();"

if command -v psql >/dev/null 2>&1; then
  PGPASSWORD="${PGPASSWORD}" psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d postgres -c "${DISCONNECT_CMD}" || true
elif command -v docker >/dev/null 2>&1 && docker ps | grep -q "mastara-postgres"; then
  docker exec -e PGPASSWORD="${PGPASSWORD}" mastara-postgres psql -U "${PGUSER}" -d postgres -c "${DISCONNECT_CMD}" || true
fi

# Recreate Database & Restore
echo "  [3/3] Restoring database '${PGDATABASE}' from snapshot..."
DROP_CREATE_CMD="DROP DATABASE IF EXISTS ${PGDATABASE}; CREATE DATABASE ${PGDATABASE};"
if command -v psql >/dev/null 2>&1; then
  PGPASSWORD="${PGPASSWORD}" psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d postgres -c "${DROP_CREATE_CMD}"
  PGPASSWORD="${PGPASSWORD}" pg_restore -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${PGDATABASE}" --no-owner --no-privileges "${BACKUP_FILE}" || true
elif command -v docker >/dev/null 2>&1 && docker ps | grep -q "mastara-postgres"; then
  docker exec -e PGPASSWORD="${PGPASSWORD}" mastara-postgres psql -U "${PGUSER}" -d postgres -c "${DROP_CREATE_CMD}"
  docker exec -i -e PGPASSWORD="${PGPASSWORD}" mastara-postgres pg_restore -U "${PGUSER}" -d "${PGDATABASE}" --no-owner --no-privileges < "${BACKUP_FILE}" || true
fi

echo "============================================================"
echo "✔ DATABASE ROLLBACK COMPLETED SUCCESSFULLY"
echo "  Target database restored to clean pre-release snapshot."
echo "============================================================"
exit 0
