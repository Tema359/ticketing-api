#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV_SLUG="${1:-dev}"
shift || true
[ "$#" -gt 0 ] || set -- npm run start

# The grader cannot access the vault; values are already present in its environment.
if [ "${SKIP_VAULT:-0}" = "1" ]; then
  exec "$@"
fi

CREDS="$ROOT/.secrets/infisical.env"
if [ ! -f "$CREDS" ]; then
  echo "Infisical credentials file not found: $CREDS" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$CREDS"
set +a

if ! command -v infisical >/dev/null 2>&1; then
  echo "Infisical CLI is required to load the '${ENV_SLUG}' environment." >&2
  exit 127
fi

if [ -z "${INFISICAL_TOKEN:-}" ]; then
  INFISICAL_TOKEN="$(infisical login \
    --method=universal-auth \
    --client-id="$INFISICAL_CLIENT_ID" \
    --client-secret="$INFISICAL_CLIENT_SECRET" \
    --domain="$INFISICAL_URL" \
    --silent \
    --plain)"
  export INFISICAL_TOKEN
fi

unset INFISICAL_CLIENT_ID INFISICAL_CLIENT_SECRET

exec infisical run \
  --domain="$INFISICAL_URL" \
  --projectId="$INFISICAL_PROJECT_ID" \
  --project-config-dir="$ROOT" \
  --env="$ENV_SLUG" \
  --silent \
  -- "$@"
