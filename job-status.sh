#!/bin/bash
# Parse DB URL and query job 720001 status
DB_URL="${DATABASE_URL}"
# Extract components from mysql://user:pass@host:port/dbname
PROTO="$(echo $DB_URL | sed 's|://.*||')"
REST="$(echo $DB_URL | sed 's|.*://||')"
USERPASS="$(echo $REST | cut -d@ -f1)"
HOSTPORT_DB="$(echo $REST | cut -d@ -f2)"
DB_USER="$(echo $USERPASS | cut -d: -f1)"
DB_PASS="$(echo $USERPASS | cut -d: -f2)"
HOSTPORT="$(echo $HOSTPORT_DB | cut -d/ -f1)"
DB_NAME="$(echo $HOSTPORT_DB | cut -d/ -f2 | cut -d? -f1)"
DB_HOST="$(echo $HOSTPORT | cut -d: -f1)"
DB_PORT="$(echo $HOSTPORT | cut -d: -f2)"

mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" --ssl-mode=REQUIRED 2>/dev/null <<'SQL'
SELECT status FROM musicVideoJobs WHERE id = 720001;
SELECT sceneIndex, sceneType, mvSceneStatus, lipSyncStatus, compositeStatus, compositeAttempts, DATE_FORMAT(updatedAt, '%H:%i:%s') as upd 
FROM musicVideoScenes WHERE jobId = 720001 ORDER BY sceneIndex;
SQL
# Also show job updatedAt
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" --ssl-mode=REQUIRED 2>/dev/null <<'SQL'
SELECT id, status, DATE_FORMAT(updatedAt, '%Y-%m-%d %H:%i:%s') as updatedAt, DATE_FORMAT(assemblyStartedAt, '%Y-%m-%d %H:%i:%s') as assemblyStartedAt, finalVideoUrl IS NOT NULL as hasFinalVideo FROM musicVideoJobs WHERE id = 720001;
SQL
