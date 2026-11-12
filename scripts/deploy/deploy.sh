#!/usr/bin/env bash
# HUDA deployment over SSH — Debian 12 + systemd + Nginx (NO Docker).
#
# Usage:  deploy.sh <artifact.tar.gz> <staging|production>
#
# Reads per-profile environment variables (set by GitHub Actions from Secrets/Vars):
#   <PROFILE>_HOST          — SSH host (required secret)
#   <PROFILE>_SSH_KEY       — private SSH key (required secret)
#   <PROFILE>_DEPLOY_PATH   — base dir on server, e.g. /opt/huda/staging (required secret)
#   <PROFILE>_SERVICE       — systemd unit name (default: huda-<profile>)
#   <PROFILE>_HEALTH_URL    — health endpoint (default: http://127.0.0.1:3000/api/health)
#
# Guarantees:
#   - SQLite database lives OUTSIDE the release tree (<DEPLOY_PATH>/data) and is NEVER overwritten.
#   - A consistent backup (sqlite3 .backup, fallback: file copy) is taken before every deploy.
#   - Release dirs are immutable; switching is an atomic symlink rename.
#   - Health check after restart; automatic rollback to the previous release on failure.
#   - Last 10 DB backups are retained; older ones pruned.
set -euo pipefail

ARTIFACT="${1:?usage: deploy.sh <artifact.tar.gz> <profile>}"
PROFILE="${2:?usage: deploy.sh <artifact.tar.gz> <profile>}"

HOST_VAR="${PROFILE^^}_HOST"
KEY_VAR="${PROFILE^^}_SSH_KEY"
PATH_VAR="${PROFILE^^}_DEPLOY_PATH"
SERVICE_VAR="${PROFILE^^}_SERVICE"
HEALTH_VAR="${PROFILE^^}_HEALTH_URL"

HOST="${!HOST_VAR:?missing $HOST_VAR (GitHub secret)}"
SSH_KEY="${!KEY_VAR:?missing $KEY_VAR (GitHub secret)}"
DEPLOY_PATH="${!PATH_VAR:?missing $PATH_VAR (GitHub secret)}"
SERVICE="${!SERVICE_VAR:-huda-$PROFILE}"
HEALTH_URL="${!HEALTH_VAR:-http://127.0.0.1:3000/api/health}"

KEY_FILE="$(mktemp /tmp/huda-deploy-key-XXXXXX)"
trap 'rm -f "$KEY_FILE"' EXIT
printf '%s\n' "$SSH_KEY" > "$KEY_FILE"
chmod 600 "$KEY_FILE"

SSH_OPTS=(-i "$KEY_FILE" -o StrictHostKeyChecking=accept-new -o BatchMode=yes)

echo "==> [1/4] Uploading artifact to $HOST:/tmp/huda-artifact.tar.gz"
scp "${SSH_OPTS[@]}" "$ARTIFACT" "$HOST:/tmp/huda-artifact.tar.gz"

echo "==> [2/4] Remote release install (deploy path: $DEPLOY_PATH)"
"${SSH_OPTS[@]}" "$HOST" bash -s -- "$DEPLOY_PATH" "$SERVICE" "$HEALTH_URL" <<'REMOTE'
set -euo pipefail
DEPLOY_PATH="$1"; SERVICE="$2"; HEALTH_URL="$3"

RELEASES="$DEPLOY_PATH/releases"
DATA="$DEPLOY_PATH/data"
BACKUPS="$DATA/backups"
mkdir -p "$RELEASES" "$BACKUPS"

PREV_TARGET=""
if [ -L "$DEPLOY_PATH/current" ]; then
  PREV_TARGET=$(readlink "$DEPLOY_PATH/current")
fi

REL="$RELEASES/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$REL"
tar -xzf /tmp/huda-artifact.tar.gz -C "$REL"

DB="$DATA/app.db"
if [ -f "$DB" ]; then
  TS=$(date +%Y%m%d-%H%M%S)
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$DB" ".backup '$BACKUPS/app-$TS.db'" \
      && echo "DB backup (sqlite3 .backup): $BACKUPS/app-$TS.db" \
      || { cp "$DB" "$BACKUPS/app-$TS.db"; echo "DB backup (file copy fallback): $BACKUPS/app-$TS.db"; }
  else
    cp "$DB" "$BACKUPS/app-$TS.db"
    echo "DB backup (file copy — install sqlite3 for consistent .backup): $BACKUPS/app-$TS.db"
  fi
  # keep last 10 backups
  ls -1t "$BACKUPS" | tail -n +11 | while read -r old; do rm -f -- "$BACKUPS/$old"; done
else
  echo "No existing DB at $DB — first deployment; the app will create it on first run."
fi

ln -sfn "$REL" "$DEPLOY_PATH/.current-new" && mv -Tf "$DEPLOY_PATH/.current-new" "$DEPLOY_PATH/current"
systemctl restart "$SERVICE"

ok=0
for i in $(seq 1 30); do
  if curl -fsS "$HEALTH_URL" 2>/dev/null | grep -q '"status":"ok"'; then ok=1; break; fi
  sleep 2
done

if [ "$ok" -ne 1 ]; then
  echo "HEALTH CHECK FAILED after restart — rolling back."
  if [ -n "$PREV_TARGET" ] && [ -d "$PREV_TARGET" ]; then
    ln -sfn "$PREV_TARGET" "$DEPLOY_PATH/.current-rollback" \
      && mv -Tf "$DEPLOY_PATH/.current-rollback" "$DEPLOY_PATH/current"
    systemctl restart "$SERVICE"
    echo "Rolled back to previous release: $PREV_TARGET"
  fi
  journalctl -u "$SERVICE" -n 50 --no-pager || true
  exit 1
fi

echo "Deployment OK: $REL (service: $SERVICE)"
rm -f /tmp/huda-artifact.tar.gz
# keep last 10 release dirs
ls -1t "$RELEASES" | tail -n +11 | while read -r old; do rm -rf -- "$RELEASES/$old"; done
REMOTE

echo "==> [3/4] Health verification"
"${SSH_OPTS[@]}" "$HOST" curl -fsS "$HEALTH_URL" | tee /dev/stderr | grep -q '"status":"ok"'

echo "==> [4/4] Smoke test: homepage HTTP status"
HTTP_CODE=$("${SSH_OPTS[@]}" "$HOST" curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${HEALTH_URL#*://127.0.0.1:}" | head -c3 || true)
echo "homepage smoke HTTP code: $HTTP_CODE (200/3xx expected via health port mapping)"

echo "DEPLOY_RESULT=success"
