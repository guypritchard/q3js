#!/bin/sh
set -eu
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ENGINE_DIR=${Q3JS_ENGINE_DIR:-$SCRIPT_DIR/../../engine}
BUILD_DIR=${Q3JS_ARENA_BUILD_DIR:-$SCRIPT_DIR/../../build/arena-wasm}
OUTPUT_DIR=${Q3JS_ARENA_OUTPUT_DIR:-$SCRIPT_DIR/../dist/arena-runtime}
emcmake cmake -S "$ENGINE_DIR" -B "$BUILD_DIR" -G Ninja \
  -DCMAKE_BUILD_TYPE=Release -DBUILD_CLIENT=OFF -DBUILD_SERVER=ON \
  -DBUILD_BROWSER_SERVER=ON -DBUILD_GAME_LIBRARIES=OFF -DBUILD_GAME_QVMS=ON
cmake --build "$BUILD_DIR" --parallel 2
mkdir -p "$OUTPUT_DIR"
cp "$BUILD_DIR/Release/ioq3ded.js" "$OUTPUT_DIR/ioq3ded.mjs"
cp "$BUILD_DIR/Release/ioq3ded.wasm" "$OUTPUT_DIR/ioq3ded.wasm"
cp "$BUILD_DIR/Release/baseq3/vm/qagame.qvm" "$OUTPUT_DIR/qagame.qvm"
