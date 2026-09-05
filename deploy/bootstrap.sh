#!/bin/sh
set -eu

DEPLOY_ROOT=${Q3JS_DEPLOY_ROOT:-/srv/sites/q3js}
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

install -d -m 0755 \
  "$DEPLOY_ROOT/data/game/baseq3" \
  "$DEPLOY_ROOT/data/game/missionpack" \
  "$DEPLOY_ROOT/data/hub-state" \
  "$DEPLOY_ROOT/data/master" \
  "$DEPLOY_ROOT/data/postgres"
chown 10001:10001 "$DEPLOY_ROOT/data/hub-state"
chown 10001:10001 "$DEPLOY_ROOT/data/master"
chown 70:70 "$DEPLOY_ROOT/data/postgres"

cp "$SCRIPT_DIR/../game/maps/dist/q3js-transit-hub-v007.pk3" \
  "$DEPLOY_ROOT/data/game/baseq3/q3js-transit-hub-v007.pk3"

if [ ! -e "$SCRIPT_DIR/.env" ]; then
  umask 077
  {
    printf 'Q3JS_DEPLOY_ROOT=%s\n' "$DEPLOY_ROOT"
    printf 'Q3JS_DB_PASSWORD=%s\n' "$(openssl rand -hex 32)"
    printf 'Q3JS_EVENT_CLIENT_SECRET=%s\n' "$(openssl rand -hex 32)"
    printf 'Q3JS_ADMIN_PASSWORD=%s\n' "$(openssl rand -hex 32)"
  } > "$SCRIPT_DIR/.env"
fi
