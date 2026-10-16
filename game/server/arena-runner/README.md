# Named WASM arena runner (local proof of concept)

This independent process runs up to four operator-configured arenas, each in its
own Node worker with an Emscripten dedicated-server instance. Clients send raw
binary Quake datagrams to `/arenas/<id>/ws`; endpoint IDs remain internal. There
is no UDP port, master registration, public management API, or production change.

## Build and run

Run `sh game/server/arena-runner/build-wasm.sh` with Emscripten, CMake and Ninja
installed, or build the independent `game/server/arena-runner/Dockerfile` from
the repository root. The packet-hook target supports both
`worker` and `node`; the older browser-only artifact is **not** sufficient.
Copy generated `ioq3ded.js` to `ioq3ded.mjs`, with `ioq3ded.wasm` beside it.
Do not use the separate legacy NODERAWFS Node server target.
The build script copies these and the freshly built `qagame.qvm` into
`game/server/dist/arena-runtime`. The game module is required: it runs from an
in-memory `q3js` mod directory ahead of stock VMs and includes Q3JS's bots-only
intermission exit behavior. Do not substitute an older stock game module.

Install workspace dependencies. Set these environment variables and run
`pnpm --dir game/server arena:run`:

```text
Q3JS_ARENA_CONFIG=<absolute path to example.json or your config>
Q3JS_ARENA_RUNTIME=<absolute path to ioq3ded.mjs>
Q3JS_ARENA_ASSETS=<absolute path to installed baseq3 directory>
Q3JS_ARENA_PORT=3090
```

The default bind address is `127.0.0.1`. `Q3JS_ARENA_HOST` can override it for
isolated container testing. Only list legally installed PK3 filenames in config;
files are read by the runner, not uploaded by clients. Each worker copies them
into its own MEMFS: stock packages can consume **hundreds of MB per arena** in
addition to WASM memory. Four is a configuration ceiling, not a recommendation
for a small host. Node workers provide instance/crash isolation, **not** a security
sandbox or hard WASM/RSS memory quota. Run inside a resource-limited container
before exposing it; client input is untrusted even with trusted PK3 content.

`GET /healthz` returns 200 only when all configured engines are ready; `GET
/arenas` lists states and relative gateway paths. Stop with SIGTERM/SIGINT; start
again to restart. Crashes/startup timeouts fail closed; they do not auto-restart.
A worker heartbeat detects a hung runtime after readiness. Arena home files are
ephemeral; there is no persistence yet. Sockets use bounded packets, queues,
connection counts, heartbeat liveness and per-connection input rates. Admission
is basic, not a substitute for production IP limits/bans or event reporting.

## Integration boundary

A future single Caddy `/arenas/*` route can forward to this runner, preserving
paths and avoiding per-arena hostnames/DNS changes. Persistent master heartbeats
currently assume `/ws`, so automatic discovery requires a validated gateway-path
contract; it is intentionally not changed by this milestone. The browser-host
relay/master and native Transit Hub remain independent.

Run `pnpm --dir game/server test` for config, fake-worker routing/isolation and
lifecycle regressions. Fake-worker tests **do not prove WASM execution or real
gameplay**. A real-engine smoke test must load installed PK3s, receive getstatus
through the named WebSocket, and observe a map transition. Interactive gameplay
and map-transition client continuity must be verified before production rollout.

With a built runtime and installed stock assets, run `node
game/server/arena-runner/smoke.mjs` using the same runtime/assets environment.
It starts an isolated test arena, queries real getstatus over its named route,
and verifies a time-limit-driven `q3dm6` to `q3dm7` transition before shutting
down. Allow three minutes; it never registers with the master.

## Verified milestone

On 2026-10-16 an isolated Node 24 container (no external network or published
ports, 1.5 GiB memory limit, two CPUs, installed stock PK3s mounted read-only)
passed this smoke test: real WASM startup, named-route getstatus, and automatic
`q3dm6` to `q3dm7` transition over the same WebSocket. The dual-target artifact
also initialized in a real Chromium module worker with filesystem/packet hooks
available. Neither test establishes interactive gameplay, client continuity
through map changes, or safe public deployment. Existing production containers
were not recreated or restarted.
