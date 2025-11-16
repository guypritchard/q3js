#!/usr/bin/env bash
set -Eeuo pipefail

CURRENT_DIR="$(pwd)"
BASEQ3_SRC="${BASEQ3_SRC:-$CURRENT_DIR/../baseq3}"
BUILD_DIR="${BUILD_DIR:-$CURRENT_DIR/build}"

cd "$CURRENT_DIR/.."
unzip -o baseq3.zip
cd "$CURRENT_DIR"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
pushd "$BUILD_DIR" >/dev/null

cmake ../../../ioq3 \
  -DBUILD_CLIENT=OFF \
  -DBUILD_SERVER=ON \
  -DBUILD_GAME_QVMS=ON \
  -DBUILD_RENDERER_GL1=OFF \
  -DBUILD_RENDERER_GL2=OFF

make -j"$(nproc)"

cd Release

if [[ ! -d "$BASEQ3_SRC" ]]; then
  echo "baseq3 source not found at $BASEQ3_SRC" >&2; exit 1
fi
rm -rf baseq3
cp -r "$BASEQ3_SRC" ./baseq3

