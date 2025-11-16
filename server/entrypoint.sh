#!/usr/bin/env bash
set -Eeuo pipefail

node ../proxy/index.js &

./build/Release/ioq3ded \
  +set dedicated 2 \
  +set sv_pure 1 \
  +set sv_allowDownload 1 \
  +set net_ip 0.0.0.0 \
  +set sv_dlrate 0 \
  +set com_hunkMegs 256 \
  +exec autoexec.cfg
