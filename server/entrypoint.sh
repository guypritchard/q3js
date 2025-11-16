#!/usr/bin/env bash
set -Eeuo pipefail

cat > ./build/Release/baseq3/autoexec.cfg <<EOL
addbot sarge 1 blue 0
addbot visor 1 red 0
seta bot_nochat 1

// Map rotation setup
set d1 "map q3dm1; set nextmap vstr d2"
set d2 "map q3dm7; set nextmap vstr d3"
set d3 "map q3dm17; set nextmap vstr d4"
set d4 "map q3tourney7; set nextmap vstr d1"

// Start rotation
vstr d1

EOL`

node ./ws-udp-proxy/index.js &

./build/Release/ioq3ded \
  +set dedicated 2 \
  +set sv_pure 1 \
  +set net_ip 0.0.0.0 \
  +set sv_master3 "192.168.0.11" \
  +set sv_maxclients 64 \
  +set rconPassword "${RCON_PASSWORD}" \
  +set sv_hostname "FFA 24/7" \
  +set g_inactivity 360 \
  +set g_dropInactive 1 \
  +set bot_enable 1 \
  +set timelimit 0 \
  +set fraglimit 30 \
  +set sv_maxPing 500 \
  +set sv_minPing 0 \
  +set sv_dlRate 0 \
  +map q3dm17 \
  +exec autoexec.cfg

