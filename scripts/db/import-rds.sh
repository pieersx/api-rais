#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

DUMP_PATH="${DUMP_PATH:-$ROOT_DIR/database/dumps/aws-rds/rais-full-backup-2026.rds.sql}"
RDS_HOST="${RDS_HOST:-}"
RDS_PORT="${RDS_PORT:-3306}"
RDS_USER="${RDS_USER:-}"
RDS_PASSWORD="${RDS_PASSWORD:-}"
RDS_DB_NAME="${RDS_DB_NAME:-rais}"
USE_DOCKER_MYSQL="${USE_DOCKER_MYSQL:-auto}"
MYSQL_DOCKER_IMAGE="${MYSQL_DOCKER_IMAGE:-mysql:8}"

function resolve_import_mode() {
  case "${USE_DOCKER_MYSQL,,}" in
    auto)
      if command -v mysql >/dev/null 2>&1; then
        echo "local"
      else
        echo "docker"
      fi
      ;;
    true|1|yes)
      echo "docker"
      ;;
    false|0|no)
      echo "local"
      ;;
    *)
      echo "invalid"
      ;;
  esac
}

if [[ -z "$RDS_HOST" || -z "$RDS_USER" || -z "$RDS_PASSWORD" ]]; then
  echo "Usage:"
  echo "  RDS_HOST=<endpoint> RDS_USER=<user> RDS_PASSWORD=<password> [RDS_PORT=3306] [RDS_DB_NAME=rais] [DUMP_PATH=...] [USE_DOCKER_MYSQL=auto|true|false] [MYSQL_DOCKER_IMAGE=mysql:8] bash scripts/db/import-rds.sh"
  exit 1
fi

if [[ ! -f "$DUMP_PATH" ]]; then
  echo "Error: dump file not found at $DUMP_PATH"
  exit 1
fi

IMPORT_MODE="$(resolve_import_mode)"

if [[ "$IMPORT_MODE" == "invalid" ]]; then
  echo "Error: USE_DOCKER_MYSQL must be one of: auto, true, false"
  exit 1
fi

if [[ "$IMPORT_MODE" == "local" ]] && ! command -v mysql >/dev/null 2>&1; then
  echo "Error: mysql client is not installed"
  echo "Tip: set USE_DOCKER_MYSQL=true to import using Docker"
  exit 1
fi

if [[ "$IMPORT_MODE" == "docker" ]] && ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker is not installed"
  echo "Tip: install Docker or set USE_DOCKER_MYSQL=false to use local mysql"
  exit 1
fi

echo "Importing dump into $RDS_HOST:$RDS_PORT/$RDS_DB_NAME"
echo "This may take several minutes for large datasets..."

if [[ "$IMPORT_MODE" == "local" ]]; then
  echo "Import mode: local mysql client"
  MYSQL_PWD="$RDS_PASSWORD" mysql \
    --ssl-mode=REQUIRED \
    --host="$RDS_HOST" \
    --port="$RDS_PORT" \
    --user="$RDS_USER" \
    "$RDS_DB_NAME" < "$DUMP_PATH"
else
  echo "Import mode: docker ($MYSQL_DOCKER_IMAGE)"
  docker run --rm -i \
    -e MYSQL_PWD="$RDS_PASSWORD" \
    "$MYSQL_DOCKER_IMAGE" \
    mysql \
      --ssl-mode=REQUIRED \
      --host="$RDS_HOST" \
      --port="$RDS_PORT" \
      --user="$RDS_USER" \
      "$RDS_DB_NAME" < "$DUMP_PATH"
fi

echo "Import completed successfully"
