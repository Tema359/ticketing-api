#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

SECRET_FILE='secrets/db_password'
DATABASE_NAME='ticketing'
DATABASE_USER='ticketing'

if [[ ! -f "$SECRET_FILE" ]]; then
  echo "Secret file not found: $SECRET_FILE" >&2
  exit 1
fi

NEW_PASSWORD="ticketing-$(openssl rand -hex 16)"

echo '1. Updating the PostgreSQL role password...'
DB_PASSWORD_SECRET_FILE="$SECRET_FILE" docker compose exec -T db psql \
  --username "$DATABASE_USER" \
  --dbname "$DATABASE_NAME" \
  --set ON_ERROR_STOP=1 \
  --variable "role=$DATABASE_USER" \
  --variable "pw=$NEW_PASSWORD" \
  >/dev/null <<'SQL'
ALTER ROLE :"role" WITH PASSWORD :'pw';
SQL

echo '2. Updating the secret file...'
umask 077
printf '%s' "$NEW_PASSWORD" > "$SECRET_FILE"
chmod 600 "$SECRET_FILE"

echo "3. Closing old connections for $DATABASE_USER..."
DB_PASSWORD_SECRET_FILE="$SECRET_FILE" docker compose exec -T db psql \
  --username "$DATABASE_USER" \
  --dbname "$DATABASE_NAME" \
  --tuples-only \
  --no-align \
  --set ON_ERROR_STOP=1 \
  --command "SELECT count(pg_terminate_backend(pid)) FROM pg_stat_activity WHERE usename = '$DATABASE_USER' AND pid <> pg_backend_pid();"

unset NEW_PASSWORD
echo 'Done: the database and secret file use the new password.'
echo 'The application was not restarted; verify with: curl -s localhost:3000/health/db'
