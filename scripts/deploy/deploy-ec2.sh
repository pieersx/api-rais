#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

EC2_HOST="${EC2_HOST:-}"
SSH_KEY_PATH="${SSH_KEY_PATH:-}"
SSH_USER="${SSH_USER:-ubuntu}"
APP_DIR="${APP_DIR:-/opt/rais-api/current}"
REMOTE_TMP_DIR="${REMOTE_TMP_DIR:-/home/${SSH_USER}/rais-api-upload}"

DB_HOST="${DB_HOST:-}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-rais}"
BASE_URL="${BASE_URL:-}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
PAGE_SIZE="${PAGE_SIZE:-100}"
PORT="${PORT:-3000}"

if [[ -z "$EC2_HOST" || -z "$SSH_KEY_PATH" || -z "$DB_HOST" || -z "$DB_USER" || -z "$DB_PASSWORD" || -z "$BASE_URL" || -z "$ADMIN_EMAIL" ]]; then
  echo "Usage:"
  echo "  EC2_HOST=<host> SSH_KEY_PATH=<path.pem> DB_HOST=<rds-endpoint> DB_USER=<user> DB_PASSWORD=<password> DB_NAME=rais BASE_URL=http://<host>/oai ADMIN_EMAIL=rais@unmsm.edu.pe bash scripts/deploy/deploy-ec2.sh"
  exit 1
fi

SSH_OPTS=(
  -i "$SSH_KEY_PATH"
  -o StrictHostKeyChecking=no
  -o UserKnownHostsFile=/dev/null
)

if command -v rsync >/dev/null 2>&1; then
  rsync -az --delete \
    --exclude ".git" \
    --exclude "node_modules" \
    --exclude ".env" \
    --exclude "database/dumps" \
    --exclude "infra/terraform/.terraform" \
    --exclude "infra/terraform/terraform.tfstate*" \
    -e "ssh ${SSH_OPTS[*]}" \
    "$ROOT_DIR/" "$SSH_USER@$EC2_HOST:$REMOTE_TMP_DIR/"
else
  ssh "${SSH_OPTS[@]}" "$SSH_USER@$EC2_HOST" "rm -rf '$REMOTE_TMP_DIR' && mkdir -p '$REMOTE_TMP_DIR'"
  tar \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.env' \
    --exclude='database/dumps' \
    --exclude='infra/terraform/.terraform' \
    --exclude='infra/terraform/terraform.tfstate*' \
    -C "$ROOT_DIR" -czf - . | ssh "${SSH_OPTS[@]}" "$SSH_USER@$EC2_HOST" "tar -xzf - -C '$REMOTE_TMP_DIR'"
fi

ssh "${SSH_OPTS[@]}" "$SSH_USER@$EC2_HOST" "bash -s" <<EOF
set -euo pipefail

sudo mkdir -p "$APP_DIR"
sudo rsync -a --delete "$REMOTE_TMP_DIR/" "$APP_DIR/"
sudo chown -R $SSH_USER:$SSH_USER "$APP_DIR"

cat > "$APP_DIR/.env" <<ENVEOF
PORT=$PORT
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
BASE_URL=$BASE_URL
PAGE_SIZE=$PAGE_SIZE
ADMIN_EMAIL=$ADMIN_EMAIL
ENVEOF

cd "$APP_DIR"
corepack enable
corepack prepare pnpm@10.27.0 --activate
pnpm install --prod --frozen-lockfile

sudo tee /etc/systemd/system/rais-api.service >/dev/null <<SERVICEEOF
[Unit]
Description=RAIS API
After=network.target

[Service]
Type=simple
User=$SSH_USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
ExecStart=/usr/bin/env pnpm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICEEOF

sudo systemctl daemon-reload
sudo systemctl enable rais-api.service
sudo systemctl restart rais-api.service
sudo nginx -t
sudo systemctl restart nginx
EOF

echo "Deployment completed: http://$EC2_HOST/oai"
