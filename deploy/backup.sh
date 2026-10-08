#!/usr/bin/env bash
# Daily backup of the database and uploaded pictures. CI copies this file to $DIR.
# Install on each server (as root):
#   echo '30 2 * * * root /opt/techbestie/backup.sh >> /var/log/techbestie-backup.log 2>&1' > /etc/cron.d/techbestie-backup
#
# pg_dump runs in a throwaway postgres container that shares the app container's
# network, so it reaches the database exactly as the app does (own or shared Postgres).
# Restore:  pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" db-*.dump
#           tar -xzf uploads-*.tar.gz -C /opt/techbestie
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
# shellcheck disable=SC1091
[ -f .env ] && set -a && . ./.env && set +a
CONTAINER="${BACKUP_CONTAINER:-$(docker compose ps -q app)}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
# pg_dump must be at least as new as the server.
PG_IMAGE="${BACKUP_PG_IMAGE:-postgres:17-alpine}"
OUT="$DIR/backups"
STAMP="$(date +%Y%m%d-%H%M%S)"

[ -n "$CONTAINER" ] || { echo "app container is not running" >&2; exit 1; }
install -d -m 700 "$OUT"

URL="$(docker exec "$CONTAINER" printenv DATABASE_URL)"
docker run --rm --network "container:$CONTAINER" -e URL="$URL" "$PG_IMAGE" \
  sh -c 'pg_dump --format=custom --no-owner --no-privileges "$URL"' > "$OUT/db-$STAMP.dump.tmp"
mv "$OUT/db-$STAMP.dump.tmp" "$OUT/db-$STAMP.dump"
tar -czf "$OUT/uploads-$STAMP.tar.gz" uploads
chmod 600 "$OUT"/*-"$STAMP".*

find "$OUT" -type f \( -name 'db-*.dump' -o -name 'uploads-*.tar.gz' \) -mtime +"$KEEP_DAYS" -delete
echo "$(date -Is) backup ok: $(du -h "$OUT/db-$STAMP.dump" | cut -f1) db, $(du -h "$OUT/uploads-$STAMP.tar.gz" | cut -f1) uploads"
