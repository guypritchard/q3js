#!/usr/bin/env bash
set -Eeuo pipefail

node ./ws-udp-proxy/index.js &

./build/Release/ioq3ded \
  +set dedicated 2 \
  +set sv_pure 1 \
  +set net_ip 0.0.0.0 \
  +set sv_master3 "192.168.0.11" \
  +set sv_maxclients 64 \
  +set rconPassword "${RCON_PASSWORD}" \
  +set sv_hostname "Q3DM17 24/7" \
  +set bot_minplayers 2 \
  +addbot sarge 2 \
  +addbot daemia 2 \
  +map q3dm17
