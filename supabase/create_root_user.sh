#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SUPABASE_URL_DEFAULT="https://dslfmrecdeckuwhlhbsw.supabase.co"
APP_SCHEMA_DEFAULT="myappdb"
ROOT_USERNAME_DEFAULT="eliuortega"
ROOT_PASSWORD_DEFAULT="1807"
ROOT_EMAIL_DEFAULT="eliuortega@saltorsystem.local"
ROOT_NAME_DEFAULT="eliuortega"

read -r -p "Supabase URL [${SUPABASE_URL_DEFAULT}]: " INPUT_URL
SUPABASE_URL="${INPUT_URL:-$SUPABASE_URL_DEFAULT}"

read -r -p "Schema [${APP_SCHEMA_DEFAULT}]: " INPUT_SCHEMA
APP_SCHEMA="${INPUT_SCHEMA:-$APP_SCHEMA_DEFAULT}"

read -r -p "Root username [${ROOT_USERNAME_DEFAULT}]: " INPUT_USER
ROOT_USERNAME="${INPUT_USER:-$ROOT_USERNAME_DEFAULT}"

read -r -s -p "Root password [${ROOT_PASSWORD_DEFAULT}]: " INPUT_PASS
echo
ROOT_PASSWORD="${INPUT_PASS:-$ROOT_PASSWORD_DEFAULT}"

read -r -p "Root email [${ROOT_EMAIL_DEFAULT}]: " INPUT_EMAIL
ROOT_EMAIL="${INPUT_EMAIL:-$ROOT_EMAIL_DEFAULT}"

read -r -p "Root name [${ROOT_NAME_DEFAULT}]: " INPUT_NAME
ROOT_NAME="${INPUT_NAME:-$ROOT_NAME_DEFAULT}"

echo "Pega tu SUPABASE SERVICE ROLE KEY (sb_secret_... o service_role JWT) y presiona ENTER:"
read -r SUPABASE_SERVICE_KEY

if [[ -z "${SUPABASE_SERVICE_KEY}" || "${SUPABASE_SERVICE_KEY}" == "<TU_SERVICE_ROLE_KEY>" ]]; then
  echo "Error: Debes usar una clave real de Supabase, no placeholder."
  exit 1
fi

export SUPABASE_URL
export SUPABASE_SERVICE_KEY
export APP_SCHEMA
export ROOT_USERNAME
export ROOT_PASSWORD
export ROOT_EMAIL
export ROOT_NAME

node supabase/create_root_user.mjs
