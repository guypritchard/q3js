#!/usr/bin/env bash

set -Eeuo pipefail

node ./ws-udp-proxy/index.js &

./build/Release/ioq3ded \
  +set dedicated 2 \
  +set sv_pure 1 \
  +set net_ip 0.0.0.0 \
  +set sv_master3 "192.168.0.11" \
  +set sv_maxclients 64 \
  +set rconPassword "qweqwe1*" \
  +map q3dm17
