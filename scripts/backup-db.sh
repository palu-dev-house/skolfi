#!/usr/bin/env bash
# ============================================
# Database Backup Script
# Dumps PostgreSQL via pg_dump, compresses with gzip,
# and saves to local backups/ directory.
#
# Usage:
#   ./scripts/backup-db.sh              # uses .env.local
#   DIRECT_URL=... ./scripts/backup-db.sh  # override connection
#
# Cron (daily 2 AM):
#   0 2 * * * cd /path/to/project && ./scripts/backup-db.sh >> logs/backup.log 2>&1
#
# Prerequisites:
#   - pg_dump installed (brew install libpq)
# ============================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"

# Load .env.local if no DIRECT_URL set
if [ -z "${DIRECT_URL:-}" ]; then
  ENV_FILE="$PROJECT_DIR/.env.local"
  if [ ! -f "$ENV_FILE" ]; then
    echo "[ERROR] No DIRECT_URL set and $ENV_FILE not found"
    exit 1
  fi
  export DIRECT_URL=$(grep '^DIRECT_URL=' "$ENV_FILE" | cut -d'=' -f2-)
fi

if [ -z "${DIRECT_URL:-}" ]; then
  echo "[ERROR] DIRECT_URL is not set"
  exit 1
fi

# Config
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="backup_${TIMESTAMP}.sql.gz"
RETAIN_DAYS=${RETAIN_DAYS:-30}

# Ensure backup dir exists
mkdir -p "$BACKUP_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting database backup..."

# 1. Dump database
echo "[INFO] Running pg_dump..."
pg_dump "$DIRECT_URL" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --format=plain \
  | gzip > "$BACKUP_DIR/$FILENAME"

FILE_SIZE=$(du -h "$BACKUP_DIR/$FILENAME" | cut -f1)
echo "[INFO] Dump complete: $FILENAME ($FILE_SIZE)"

# 2. Clean up old backups (older than RETAIN_DAYS)
echo "[INFO] Cleaning backups older than $RETAIN_DAYS days..."
DELETED=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETAIN_DAYS -delete -print | wc -l | tr -d ' ')
echo "[INFO] Deleted $DELETED old backup(s)"

# 3. Show backup summary
TOTAL=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" | wc -l | tr -d ' ')
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "[INFO] Total backups: $TOTAL ($TOTAL_SIZE)"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup complete: $BACKUP_DIR/$FILENAME"
