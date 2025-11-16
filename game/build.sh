#!/usr/bin/env bash
set -Eeuo pipefail

CURRENT_DIR="$(pwd)"
EMSDK_ROOT="${EMSDK_ROOT:-$CURRENT_DIR/../emsdk}"
BASEQ3_SRC="${BASEQ3_SRC:-$CURRENT_DIR/../baseq3}"
BUILD_DIR="${BUILD_DIR:-$CURRENT_DIR/build}"
SHADER_DIR="$CURRENT_DIR/../ioq3/code/renderergl2/glsl"
WEB_PORT="${WEB_PORT:-8000}"

# Patch shaders
HEADER='#ifdef GL_ES
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
  #else
    precision mediump float;
  #endif
  precision mediump int;
#endif
'

find "$SHADER_DIR" -type f -name '*.glsl' | while read -r file; do
  # Check if header already present (any of its unique lines)
  if grep -q '#ifdef GL_ES' "$file" && grep -q 'precision mediump int;' "$file"; then
    echo "Skipping $file (header already present)"
    continue
  fi

  echo "Updating $file"
  tmp="$(mktemp)"
  printf '%s\n\n' "$HEADER" > "$tmp"
  cat "$file" >> "$tmp"
  mv "$tmp" "$file"
done


if [[ ! -f "$EMSDK_ROOT/emsdk_env.sh" ]]; then
  echo "emsdk_env.sh not found at $EMSDK_ROOT" >&2; exit 1
fi

$EMSDK_ROOT/emsdk install 4.0.19
$EMSDK_ROOT/emsdk activate 4.0.19

source "$EMSDK_ROOT/emsdk_env.sh"

command -v emcc >/dev/null || { echo "emcc not on PATH"; exit 1; }
command -v emcmake >/dev/null || { echo "emcmake not on PATH"; exit 1; }
command -v emmake  >/dev/null || { echo "emmake not on PATH"; exit 1; }
command -v cmake   >/dev/null || { echo "cmake not installed"; exit 1; }

echo "Emscripten: $(emcc --version | head -n1)"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
pushd "$BUILD_DIR" >/dev/null

emcmake cmake ../../../ioq3 \
  -DBUILD_CLIENT=ON \
  -DBUILD_SERVER=OFF \
  -DBUILD_GAME_SO=OFF \
  -DBUILD_GAME_QVMS=OFF \
  -DBUILD_RENDERER_GL1=OFF \
  -DBUILD_RENDERER_GL2=ON \
  -DUSE_RENDERER_DLOPEN=OFF \
  -DUSE_VOIP=OFF \
  -DUSE_OPENAL=OFF \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_C_FLAGS="-sUSE_SDL=2 -sALLOW_MEMORY_GROWTH=1 -sMIN_WEBGL_VERSION=2 -sMAX_WEBGL_VERSION=2 -sFORCE_FILESYSTEM=1 -sENVIRONMENT=web" \
  -DCMAKE_EXE_LINKER_FLAGS="-sUSE_SDL=2 -sALLOW_MEMORY_GROWTH=1 -sFORCE_FILESYSTEM=1 -sMIN_WEBGL_VERSION=2 -sMAX_WEBGL_VERSION=2 -sENVIRONMENT=web -sWASMFS=0 -lidbfs.js -sEXPORTED_RUNTIME_METHODS=['FS']"


emmake make -j"$(nproc)"

cd Release

if [[ ! -d "$BASEQ3_SRC" ]]; then
  echo "baseq3 source not found at $BASEQ3_SRC" >&2; exit 1
fi


rm -rf baseq3
cp -r "$BASEQ3_SRC" ./baseq3
