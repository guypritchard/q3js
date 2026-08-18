#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_SOURCE="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR="${Q3JS_MAP_SCRIPT_DIR:-$(cd -- "$(dirname -- "$SCRIPT_SOURCE")" && pwd)}"
Q3MAP2="${Q3MAP2:-q3map2}"
Q3_DATA_DIR="${Q3JS_DATA_DIR:?Set Q3JS_DATA_DIR to the directory containing baseq3}"
QVM_DIR="${Q3JS_QVM_DIR:?Set Q3JS_QVM_DIR to the directory containing qagame.qvm and cgame.qvm}"
BUILD_DIR="${Q3JS_MAP_BUILD_DIR:-$SCRIPT_DIR/build}"
DIST_DIR="${Q3JS_MAP_DIST_DIR:-$SCRIPT_DIR/dist}"
MAP_NAME=q3js_hub

mkdir -p "$BUILD_DIR/maps" "$BUILD_DIR/scripts" "$BUILD_DIR/vm" "$DIST_DIR"
node "$SCRIPT_DIR/generate-map.mjs" "$BUILD_DIR/maps/$MAP_NAME.map"
cp "$SCRIPT_DIR/scripts/$MAP_NAME.arena" "$BUILD_DIR/scripts/$MAP_NAME.arena"
cp "$SCRIPT_DIR/scripts/$MAP_NAME.shader" "$BUILD_DIR/scripts/$MAP_NAME.shader"
cp "$QVM_DIR/qagame.qvm" "$BUILD_DIR/vm/qagame.qvm"
cp "$QVM_DIR/cgame.qvm" "$BUILD_DIR/vm/cgame.qvm"

"$Q3MAP2" -game quake3 -fs_basepath "$Q3_DATA_DIR" -fs_game baseq3 -meta "$BUILD_DIR/maps/$MAP_NAME.map"
"$Q3MAP2" -game quake3 -fs_basepath "$Q3_DATA_DIR" -fs_game baseq3 -vis -saveprt "$BUILD_DIR/maps/$MAP_NAME.map"
"$Q3MAP2" -game quake3 -fs_basepath "$Q3_DATA_DIR" -fs_game baseq3 -light -fast -filter "$BUILD_DIR/maps/$MAP_NAME.map"

touch -t 198001010000 "$BUILD_DIR/maps/$MAP_NAME.bsp" "$BUILD_DIR/scripts/$MAP_NAME.arena" \
  "$BUILD_DIR/scripts/$MAP_NAME.shader" \
  "$BUILD_DIR/vm/qagame.qvm" "$BUILD_DIR/vm/cgame.qvm"
rm -f "$DIST_DIR/q3js-transit-hub-v007.pk3"
(
  cd "$BUILD_DIR"
  zip -q -9 -X "$DIST_DIR/q3js-transit-hub-v007.pk3" \
    "maps/$MAP_NAME.bsp" "scripts/$MAP_NAME.arena" "scripts/$MAP_NAME.shader" \
    "vm/qagame.qvm" "vm/cgame.qvm"
)

echo "Transit Hub package: $DIST_DIR/q3js-transit-hub-v007.pk3"
