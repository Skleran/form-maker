#!/bin/sh
# Backs up the database and uploaded files of the running Docker stack.
#   BACKUP_DIR=/var/backups/formmaker KEEP_DAYS=14 sh scripts/backup.sh
# Copy backups off this server too. Schedule daily with cron:
#   0 3 * * * cd /path/to/form-maker && sh scripts/backup.sh >> backups/backup.log 2>&1
#
# Restore (replaces current data; stop the app first with: docker stop form-maker-app):
#   docker exec -i form-maker-db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < db-<stamp>.dump
#   docker start form-maker-app
#   docker exec -i form-maker-app sh -c 'tar -C /app -xzf -' < uploads-<stamp>.tar.gz
set -eu

BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

# Written to a temporary name first, so a failed run never looks like a finished backup
docker exec form-maker-db sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > "$BACKUP_DIR/db-$STAMP.dump.tmp"
mv "$BACKUP_DIR/db-$STAMP.dump.tmp" "$BACKUP_DIR/db-$STAMP.dump"

docker exec form-maker-app sh -c 'tar -C /app -czf - uploads' > "$BACKUP_DIR/uploads-$STAMP.tar.gz.tmp"
mv "$BACKUP_DIR/uploads-$STAMP.tar.gz.tmp" "$BACKUP_DIR/uploads-$STAMP.tar.gz"

find "$BACKUP_DIR" -type f \( -name 'db-*.dump' -o -name 'uploads-*.tar.gz' \) -mtime +"$KEEP_DAYS" -delete

echo "Backup finished: $BACKUP_DIR/db-$STAMP.dump, $BACKUP_DIR/uploads-$STAMP.tar.gz"
