#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ROOT="$(pwd)"
EMSDK_ROOT="${EMSDK_ROOT:-$PROJECT_ROOT/emsdk}"
BASEQ3_SRC="${BASEQ3_SRC:-$PROJECT_ROOT/baseq3}"
BUILD_DIR="${BUILD_DIR:-$PROJECT_ROOT/build-web}"
WEB_PORT="${WEB_PORT:-8000}"

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

emcmake cmake ../ioq3 \
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
  -DCMAKE_EXE_LINKER_FLAGS="-sUSE_SDL=2 -sALLOW_MEMORY_GROWTH=1 -sFORCE_FILESYSTEM=1 -sMIN_WEBGL_VERSION=2 -sMAX_WEBGL_VERSION=2 -sENVIRONMENT=web"

emmake make -j"$(nproc)"

cd Release

if [[ ! -d "$BASEQ3_SRC" ]]; then
  echo "baseq3 source not found at $BASEQ3_SRC" >&2; exit 1
fi
rm -rf baseq3
cp -r "$BASEQ3_SRC" ./baseq3

echo "Starting HTTP server on http://127.0.0.1:${WEB_PORT}/ioquake3.html"
python -m http.server "${WEB_PORT}" --bind 0.0.0.0
