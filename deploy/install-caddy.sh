#!/bin/sh
set -eu

TARGET=/etc/caddy/Caddyfile
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
CANDIDATE=$(mktemp)
trap 'rm -f "$CANDIDATE"' EXIT

if grep -q '^# >>> q3js >>>$' "$TARGET"; then
  awk -v block="$SCRIPT_DIR/Caddyfile" '
    /^# >>> q3js >>>$/ {
      while ((getline line < block) > 0) print line
      close(block)
      replacing = 1
      next
    }
    /^# <<< q3js <<</ && replacing { replacing = 0; next }
    !replacing { print }
  ' "$TARGET" > "$CANDIDATE"
else
  cp "$TARGET" "$CANDIDATE"
  printf '\n' >> "$CANDIDATE"
  cat "$SCRIPT_DIR/Caddyfile" >> "$CANDIDATE"
fi
caddy validate --config "$CANDIDATE" --adapter caddyfile

cp -a "$TARGET" "$TARGET.bak.q3js-$TIMESTAMP"
cp "$CANDIDATE" "$TARGET"
systemctl reload caddy
