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
block with a timestamped backup. Then add `q3js.amber-fly.org` to the existing
Cloudflare tunnel by running `deploy/install-cloudflare.py` in CT 102. The
installer creates timestamped DNS and tunnel-config backups before changing the
route and preserves the catch-all rule in final position.

The browser-host relay is intentionally a single master instance because active
WebSocket sessions are held in memory. Do not scale `master` without replacing
that registry with shared state and connection-aware routing.

The Transit Hub runs as a persistent combined dedicated-server/gateway service.
Caddy routes `wss://q3js.amber-fly.org/ws` to its loopback-only TCP port; the
Hub's Quake UDP socket is not published and is never sent through Cloudflare.
