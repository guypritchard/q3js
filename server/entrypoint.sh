#!/usr/bin/env bash
set -Eeuo pipefail

set -m

args=("$@")
has_fs_game_arg=false

for ((i = 0; i < ${#args[@]} - 1; i++)); do
  if [[ "${args[$i]}" == "+set" && "${args[$((i + 1))]}" == "fs_game" ]]; then
    has_fs_game_arg=true
    break
  fi
done

if [[ "$has_fs_game_arg" == false ]]; then
  args=("+set" "fs_game" "${FS_GAME:-q3js}" "${args[@]}")
fi

node ../proxy/index.js &
PROXY_PID=$!

./ioq3ded "${args[@]}" &
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
