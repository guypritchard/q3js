# Production deployment

This stack runs on the NAS Docker LXC and is exposed only through Caddy and the
Cloudflare tunnel. Container ports bind to loopback; PostgreSQL has no host port.

## Data layout

```text
/srv/sites/q3js/
├── app/                 repository checkout
└── data/
    ├── game/baseq3/     legally obtained PK3 files
    ├── game/missionpack/
    ├── arena-state/     rotating FFA server state
    ├── hub-state/       Transit Hub server state
    ├── master/          generated JWT signing keys
    └── postgres/        PostgreSQL data
```

Run the root-only bootstrap once to create directories, install the bundled map,
set volume ownership, and generate independent deployment secrets. Then build
and start from the repository root:

```sh
./deploy/bootstrap.sh
docker compose --env-file deploy/.env -f deploy/compose.yml build
docker compose --env-file deploy/.env -f deploy/compose.yml up -d
```

Run `deploy/install-caddy.sh` in CT 101 to validate and install the marked Caddy
block with a timestamped backup. Then add `q3js.amber-fly.org` and
`q3js-ffa.amber-fly.org` to the existing Cloudflare tunnel by running
`deploy/install-cloudflare.py` in CT 102. The installer creates timestamped DNS
and tunnel-config backups before changing routes and preserves the catch-all
rule in final position.

The browser-host relay is intentionally a single master instance because active
WebSocket sessions are held in memory. Do not scale `master` without replacing
that registry with shared state and connection-aware routing.

The Transit Hub runs as a persistent combined dedicated-server/gateway service.
Caddy routes `wss://q3js.amber-fly.org/ws` to its loopback-only TCP port; the
Hub's Quake UDP socket is not published and is never sent through Cloudflare.

The independent `Q3JS Arena Rotation` service runs a four-bot, 12-slot FFA and
cycles through `q3dm6`, `q3dm7`, `q3dm13`, `q3dm15`, and `q3dm17`. Caddy routes
`wss://q3js-ffa.amber-fly.org/ws` to loopback port `3084`; its UDP socket also
remains private. Arena state is persisted separately from the Hub.

To add or update only the arena without interrupting memory-resident browser
hosts or the Transit Hub, prepare its state directory, build the shared server
image, install the proxy/tunnel routes, and target only `arena-server`:

```sh
./deploy/bootstrap.sh
docker compose --env-file deploy/.env -f deploy/compose.yml build arena-server
./deploy/install-caddy.sh
# Run deploy/install-cloudflare.py in CT 102, where the Cloudflare API token lives.
docker compose --env-file deploy/.env -f deploy/compose.yml up -d --no-deps arena-server
docker compose --env-file deploy/.env -f deploy/compose.yml ps arena-server master hub-server
```

Do not run a stack-wide `up` for an arena-only change: recreating `master`
disconnects its memory-resident browser-host sessions, and recreating
`hub-server` interrupts connected Hub players.
