# Isolated proof-of-concept build/run image; not wired into production Compose.
FROM emscripten/emsdk:6.0.5 AS builder
USER root
RUN apt-get update \
    && apt-get install --yes --no-install-recommends cmake ninja-build \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global pnpm@11.2.2
COPY game/engine /source/game/engine
COPY game/server/arena-runner/build-wasm.sh /source/game/server/arena-runner/build-wasm.sh
RUN sh /source/game/server/arena-runner/build-wasm.sh

FROM node:24-bookworm-slim
WORKDIR /runner
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund ws@8.18.3
COPY --from=builder /source/game/server/dist/arena-runtime ./runtime
COPY game/server/arena-runner ./arena-runner
USER node
ENV Q3JS_ARENA_RUNTIME=/runner/runtime/ioq3ded.mjs
CMD ["node", "arena-runner/main.mjs"]
