# Named WASM arena runner

This independent process runs up to four operator-configured arenas, each in its
own Node worker with an Emscripten dedicated-server instance. Clients send raw
binary Quake datagrams to `/arenas/<id>/ws`; endpoint IDs remain internal. There
is no UDP port or per-arena DNS record. The website merges ready arenas with
the master list, without changing the master heartbeat contract or restarting it.

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
Q3JS_ARENA_MASTER_URL=http://master:8080
```

The default bind address is `127.0.0.1`. `Q3JS_ARENA_HOST` can override it for
isolated container testing. Only list legally installed PK3 filenames in config;
files are read by the runner, not uploaded by clients. Each worker copies them
into its own MEMFS: stock packages can consume **hundreds of MB per arena** in
addition to WASM memory. Four is a configuration ceiling, not a recommendation
for a small host. Node workers provide instance/crash isolation, **not** a security
sandbox or hard WASM/RSS memory quota. Run inside a resource-limited container
before exposing it; client input is untrusted even with trusted PK3 content.

`GET /healthz` returns 200 when all configured engines are ready or intentionally
stopped. `GET /arenas` lists states, stable gateway paths and live Quake status;
status older than 15 seconds is omitted. An arena with no fresh status is not
advertised by the website. The stock master `/api/servers` remains unchanged.

`POST /arenas/<id>/start`, `/stop`, and `/restart` accept an administrator bearer
JWT from the existing admin login. Every request is verified by the master using
its read-only admin-protected `/api/admin/bans` endpoint; signature, expiry and
admin-role checks remain centralized. Missing/invalid tokens are rejected;
verification outages fail closed. No cookie auth or arbitrary command/config API
is exposed. Only preconfigured IDs can be managed; per-arena actions are serialized.
The website's `/admin` page provides these controls, confirming disruptive actions.
Configure `Q3JS_ARENA_MASTER_URL` to enable them; omit it to disable management.

Stop the process with SIGTERM/SIGINT. Crashes/startup timeouts fail closed; they
do not auto-restart individually (use authenticated Start/Restart).
A worker heartbeat detects a hung runtime after readiness. Arena home files are
ephemeral; there is no persistence yet. Sockets use bounded packets, queues,
connection counts, heartbeat liveness and per-connection input rates. Admission
has per-connection limits. In deployment, set the existing
`Q3JS_EVENT_CLIENT_SECRET` and `Q3JS_TRUST_PROXY_HOPS=1` so the runner reuses the
native server's ban synchronization and trusted-proxy address handling. New bans
disconnect existing sockets. No new shared secret is required. Run
`pnpm --dir game/server build` before local use with bans enabled, to build the
shared support modules; the Dockerfile builds them automatically. Player-connection
and kill-event reporting are not yet implemented for WASM arenas. WASM game
modules have no libcurl, so do not assume native kill telemetry works here.

## Integration boundary

Caddy forwards `/arenas` and `/arenas/*` to the runner on loopback port 3090,
preserving paths. Browser-host relay/master, native rotation and Transit Hub
remain independent. `deploy/wasm-arenas.json` defines the production playlist;
the Compose service is `wasm-arenas` with a read-only filesystem, read-only
assets/config, a 1536 MiB aggregate memory ceiling and two CPUs. Do not configure
four simultaneous stock arenas on that budget. An optional per-arena
`"autostart": false` keeps an arena stopped until an administrator starts it.
Runtime start/stop state is in memory, not persisted across container recreation;
the config's autostart setting wins on boot.

Run `pnpm --dir game/server test` for config, fake-worker routing/isolation and
lifecycle regressions. Fake-worker tests **do not prove WASM execution or real
gameplay**. A real-engine smoke test must load installed PK3s, receive getstatus
through the named WebSocket, and observe a map transition. Interactive gameplay
and map-transition client continuity require a real browser test, not this unit suite.

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

On 2026-10-17, the phase-two browser check joined through the public named route,
rendered live gameplay, moved/fired, and re-entered on `q3dm7 → q3dm6`. The check
broke a tied score using the normal console `kill` command and acknowledged
intermission readiness; ordinary Quake sudden-death/readiness rules still apply.
Real admin JWT verification rejected missing/invalid credentials and accepted
Stop/Start without restarting the master, native rotation, or Transit Hub.
