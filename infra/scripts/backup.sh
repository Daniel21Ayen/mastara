#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# Mastara — Daily Automatic PostgreSQL Backup Script
# Usage: ./infra/scripts/backup.sh
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

# Configuration
BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/infra/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP="$(date -u +"%Y%m%d_%H%M%S")"

PGUSER="${POSTGRES_USER:-mastara}"
PGPASSWORD="${POSTGRES_PASSWORD:-mastara_secure_pass_2026}"
PGDATABASE="${POSTGRES_DB:-mastara}"
PGHOST="${POSTGRES_HOST:-127.0.0.1}"
PGPORT="${POSTGRES_HOST_PORT:-5433}"

# Parse DATABASE_URL if explicitly set and individual vars not set
if [[ -n "${DATABASE_URL:-}" && "${DATABASE_URL}" =~ postgresql://([^:]+):([^@]+)@([^:/]+):([0-9]+)/([^?]+) ]]; then
  PGUSER="${BASH_REMATCH[1]}"
  PGPASSWORD="${BASH_REMATCH[2]}"
  PGHOST="${BASH_REMATCH[3]}"
  PGPORT="${BASH_REMATCH[4]}"
  PGDATABASE="${BASH_REMATCH[5]}"
fi

mkdir -p "${BACKUP_DIR}"

BACKUP_FILE="${BACKUP_DIR}/mastara_${PGDATABASE}_${TIMESTAMP}.dump"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

echo "============================================================"
echo "  Mastara Automated PostgreSQL Backup"
echo "  Target: ${PGDATABASE}@${PGHOST}:${PGPORT}"
echo "  Timestamp: ${TIMESTAMP} UTC"
echo "============================================================"

START_TIME=$(date +%s)

# Execute pg_dump (Custom compressed archive format -Fc)
if command -v pg_dump >/dev/null 2>&1; then
  echo "  Executing local pg_dump..."
  PGPASSWORD="${PGPASSWORD}" pg_dump \
    -h "${PGHOST}" \
    -p "${PGPORT}" \
    -U "${PGUSER}" \
    -d "${PGDATABASE}" \
    -Fc \
    -f "${BACKUP_FILE}"
elif command -v docker >/dev/null 2>&1 && docker ps | grep -q "mastara-postgres"; then
  echo "  Executing pg_dump via docker container mastara-postgres..."
  docker exec -e PGPASSWORD="${PGPASSWORD}" mastara-postgres \
    pg_dump -U "${PGUSER}" -d "${PGDATABASE}" -Fc > "${BACKUP_FILE}"
else
  echo "ERROR: Neither pg_dump nor running mastara-postgres container found!" >&2
  exit 1
fi

# Verify backup file size
if [[ ! -s "${BACKUP_FILE}" ]]; then
  echo "ERROR: Backup file was created but is empty (0 bytes)!" >&2
  rm -f "${BACKUP_FILE}"
  exit 1
fi

chmod 600 "${BACKUP_FILE}"
FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)

# Generate SHA-256 checksum for integrity verification
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "${BACKUP_FILE}" > "${CHECKSUM_FILE}"
elif command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "${BACKUP_FILE}" > "${CHECKSUM_FILE}"
fi

DURATION=$(( $(date +%s) - START_TIME ))

echo "✔ Backup completed successfully in ${DURATION}s"
echo "  Path: ${BACKUP_FILE}"
echo "  Size: ${FILE_SIZE}"
if [[ -f "${CHECKSUM_FILE}" ]]; then
  echo "  SHA256: $(cat "${CHECKSUM_FILE}")"
fi

# Retention policy: remove backups older than RETENTION_DAYS
echo "  Cleaning backups older than ${RETENTION_DAYS} days in ${BACKUP_DIR}..."
find "${BACKUP_DIR}" -name "mastara_*.dump" -mtime +"${RETENTION_DAYS}" -delete || true
find "${BACKUP_DIR}" -name "mastara_*.dump.sha256" -mtime +"${RETENTION_DAYS}" -delete || true

echo "✔ Retention policy applied."
echo "============================================================"
exit 0
