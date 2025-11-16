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
  +set g_inactivity 30 \
  +set g_dropInactive 1 \
  +set bot_enable 1 \
#  +set bot_minplayers 3 \
  +set timelimit 0 \
  +set fraglimit 0 \
  +set sv_maxPing 500 \
  +set sv_minPing 0 \
  +map q3dm17

