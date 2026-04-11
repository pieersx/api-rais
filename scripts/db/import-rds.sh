#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

DUMP_PATH="${DUMP_PATH:-$ROOT_DIR/database/dumps/aws-rds/rais-full-backup-2026.rds.sql}"
RDS_HOST="${RDS_HOST:-}"
RDS_PORT="${RDS_PORT:-3306}"
RDS_USER="${RDS_USER:-}"
RDS_PASSWORD="${RDS_PASSWORD:-}"
RDS_DB_NAME="${RDS_DB_NAME:-rais}"

if ! command -v mysql >/dev/null 2>&1; then
  echo "Error: mysql client is not installed"
  exit 1
fi

if [[ -z "$RDS_HOST" || -z "$RDS_USER" || -z "$RDS_PASSWORD" ]]; then
  echo "Usage:"
  echo "  RDS_HOST=<endpoint> RDS_USER=<user> RDS_PASSWORD=<password> [RDS_PORT=3306] [RDS_DB_NAME=rais] [DUMP_PATH=...] bash scripts/db/import-rds.sh"
  exit 1
fi

if [[ ! -f "$DUMP_PATH" ]]; then
  echo "Error: dump file not found at $DUMP_PATH"
  exit 1
fi

echo "Importing dump into $RDS_HOST:$RDS_PORT/$RDS_DB_NAME"
echo "This may take several minutes for large datasets..."

MYSQL_PWD="$RDS_PASSWORD" mysql \
  --ssl-mode=REQUIRED \
  --host="$RDS_HOST" \
  --port="$RDS_PORT" \
  --user="$RDS_USER" \
  "$RDS_DB_NAME" < "$DUMP_PATH"

echo "Import completed successfully"
