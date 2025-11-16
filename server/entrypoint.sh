#!/usr/bin/env bash
set -Eeuo pipefail

set -m

node ../proxy/index.js &
PROXY_PID=$!

./ioq3ded "$@" &
Q3_PID=$!

cleanup() {
  echo "Shutting down..."
  kill -TERM -$PROXY_PID 2>/dev/null || true
  kill -TERM -$Q3_PID 2>/dev/null || true
}
trap cleanup SIGINT SIGTERM

# Wait for both
wait $PROXY_PID
wait $Q3_PID
