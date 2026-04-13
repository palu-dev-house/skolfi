#!/usr/bin/env bash
# ============================================
# Database Backup Script
# Dumps PostgreSQL via pg_dump, compresses with gzip,
# and uploads to Supabase Storage bucket "db-backups".
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
#   - curl installed
#   - Supabase Storage bucket "db-backups" created (private)
# ============================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env.local if no DIRECT_URL set
if [ -z "${DIRECT_URL:-}" ]; then
  ENV_FILE="$PROJECT_DIR/.env.local"
  if [ ! -f "$ENV_FILE" ]; then
    echo "[ERROR] No DIRECT_URL set and $ENV_FILE not found"
    exit 1
  fi
  export DIRECT_URL=$(grep '^DIRECT_URL=' "$ENV_FILE" | cut -d'=' -f2-)
  export SUPABASE_URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_FILE" | cut -d'=' -f2-)
  export SUPABASE_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' "$ENV_FILE" | cut -d'=' -f2-)
fi

# Validate required vars
for var in DIRECT_URL SUPABASE_URL SUPABASE_KEY; do
  if [ -z "${!var:-}" ]; then
    echo "[ERROR] $var is not set"
    exit 1
  fi
done

# Config
BUCKET="db-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="backup_${TIMESTAMP}.sql.gz"
TMP_DIR=$(mktemp -d)
TMP_FILE="$TMP_DIR/$FILENAME"
RETAIN_DAYS=${RETAIN_DAYS:-30}

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting database backup..."

# 1. Dump database
echo "[INFO] Running pg_dump..."
pg_dump "$DIRECT_URL" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --format=plain \
  | gzip > "$TMP_FILE"

FILE_SIZE=$(du -h "$TMP_FILE" | cut -f1)
echo "[INFO] Dump complete: $FILENAME ($FILE_SIZE)"

# 2. Upload to Supabase Storage
echo "[INFO] Uploading to Supabase Storage bucket '$BUCKET'..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/gzip" \
  --data-binary @"$TMP_FILE" \
  "$SUPABASE_URL/storage/v1/object/$BUCKET/$FILENAME")

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  echo "[OK] Uploaded successfully (HTTP $HTTP_CODE)"
else
  echo "[ERROR] Upload failed (HTTP $HTTP_CODE)"
  # Retry once
  echo "[INFO] Retrying upload..."
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/gzip" \
    --data-binary @"$TMP_FILE" \
    "$SUPABASE_URL/storage/v1/object/$BUCKET/$FILENAME")

  if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
    echo "[OK] Retry succeeded (HTTP $HTTP_CODE)"
  else
    echo "[FATAL] Retry failed (HTTP $HTTP_CODE). Backup NOT uploaded."
    exit 1
  fi
fi

# 3. Clean up old backups (older than RETAIN_DAYS)
echo "[INFO] Cleaning backups older than $RETAIN_DAYS days..."
CUTOFF_DATE=$(date -v-${RETAIN_DAYS}d +%Y%m%d 2>/dev/null || date -d "$RETAIN_DAYS days ago" +%Y%m%d)

# List files in bucket
FILES_JSON=$(curl -s \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  "$SUPABASE_URL/storage/v1/object/list/$BUCKET" \
  -H "Content-Type: application/json" \
  -d '{"prefix":"","limit":1000}')

# Parse and delete old files
OLD_FILES=$(echo "$FILES_JSON" | grep -o '"name":"backup_[0-9]*_[0-9]*\.sql\.gz"' | sed 's/"name":"//;s/"//' | while read -r fname; do
  FILE_DATE=$(echo "$fname" | grep -o '[0-9]\{8\}')
  if [ -n "$FILE_DATE" ] && [ "$FILE_DATE" -lt "$CUTOFF_DATE" ]; then
    echo "$fname"
  fi
done)

if [ -n "$OLD_FILES" ]; then
  DELETED=0
  while IFS= read -r old_file; do
    DEL_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
      -X DELETE \
      -H "Authorization: Bearer $SUPABASE_KEY" \
      "$SUPABASE_URL/storage/v1/object/$BUCKET/$old_file")
    if [ "$DEL_CODE" -ge 200 ] && [ "$DEL_CODE" -lt 300 ]; then
      DELETED=$((DELETED + 1))
    fi
  done <<< "$OLD_FILES"
  echo "[INFO] Deleted $DELETED old backup(s)"
else
  echo "[INFO] No old backups to clean"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup complete: $FILENAME"
