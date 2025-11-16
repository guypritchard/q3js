#!/usr/bin/env bash
set -Eeuo pipefail

# Kill both on Ctrl+C
trap 'kill $PROXY_PID' SIGINT SIGTERM

# Start proxy in background
node ./ws-udp-proxy/index.js &
PROXY_PID=$!

# Run ioq3ded in foreground (keeps stdin)
./build/Release/ioq3ded \
  +set dedicated 2 \
  +set sv_pure 1 \
  +set sv_allowDownload 1 \
  +set net_ip 0.0.0.0 \
  +set sv_dlrate 0 \
  +set sv_master3 "master.q3js.com:27950" \
  +map 13vast \
  +set com_hunkMegs 256 \
  +exec autoexec.cfg

# When ioq3ded exits, also stop proxy
kill $PROXY_PID 2>/dev/null || true
