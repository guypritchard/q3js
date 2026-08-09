# Q3JS server

Combined Q3JS dedicated server and WebSocket-to-UDP gateway. The Node entry
point owns the `ioq3ded` child process, health endpoint, gateway lifecycle, and
graceful shutdown.

Build and run from the repository root:

```sh
make server
Q3JS_BASEPATH=/path/containing/baseq3 make server-run
```

The release contains `ioq3ded` and a content-addressed PK3 with `cgame.qvm`,
`qagame.qvm`, and `ui.qvm`. The server advertises and transfers that PK3 with
Quake 3's built-in download protocol; the gateway does not serve game files.

Once the game is ready, the packaged server registers its published WebSocket
address with the Q3JS master and refreshes that heartbeat every five seconds.
The master then obtains map, player, and game information through the same
WebSocket-to-UDP gateway used by browser clients.

Browser connections use `ws://localhost:27961/ws`. Native Quake traffic and
the gateway target use UDP port `27960`. `GET /healthz` reports combined
gateway and game-server readiness.

Runtime variables:

- `Q3JS_BASEPATH`: directory containing `baseq3` assets (defaults to `game/server/data`)
- `Q3JS_HOME_PATH`: writable server state (defaults to `game/server/state`)
- `Q3JS_GAME_HOST`, `Q3JS_GAME_PORT`: ioq3ded bind/target, defaults `127.0.0.1:27960`
- `Q3JS_GATEWAY_HOST`, `Q3JS_GATEWAY_PORT`: gateway bind, defaults `0.0.0.0:27961`
- `Q3JS_TRUST_PROXY_HOPS`: number of trusted reverse proxies in front of the
  gateway, defaults to `0`. Set this to `1` for a single TLS/WebSocket reverse
  proxy that securely appends or overwrites `X-Forwarded-For`; the gateway uses
  it to expose the original peer as `clientip` in Quake userinfo.
- `Q3JS_MASTER_URL`: master HTTP base URL, defaults `http://localhost:8080`
- `Q3JS_EVENT_URL`: authenticated event-ingestion endpoint, defaults to
  `/api/events` on `Q3JS_MASTER_URL`
- `Q3JS_EVENT_CLIENT_SECRET`: optional shared event-ingestion secret. Local
  development uses the same fallback as the master application. Community
  servers omit it: they register as unofficial and event reporting is disabled.
  Project-managed servers provide the master application's secret to enable
  authenticated events and official status. `openssl rand -hex 32` generates
  a suitable secret for operators running their own master.
- `Q3JS_PUBLISH_HOST`, `Q3JS_PUBLISH_PORT`: browser-reachable gateway address,
  defaults `localhost` and `Q3JS_GATEWAY_PORT`
- `Q3JS_SECURE`: publish the gateway as `wss` instead of `ws`, defaults `false`
- `Q3JS_HEARTBEAT_INTERVAL_MS`, `Q3JS_HEARTBEAT_TIMEOUT_MS`: heartbeat timing,
  defaults `5000` and `3000`
- `Q3JS_RCON_PASSWORD`: optional RCON password
- `Q3JS_SERVER_CONFIG`: complete ioq3 server config. When set, it replaces the
  bundled `q3js-defaults.cfg` and `autoexec.cfg`; include a `map` command.

Arguments passed to `game/server/run.sh` are appended to the ioq3ded command line.

## Container image

Build the combined game server and WebSocket gateway from the repository root:

```sh
docker build -f game/server/Dockerfile -t q3js-server .
```

The image never downloads or contains proprietary Quake III data. Mount the
directory containing `pak0.pk3` through `pak8.pk3` at `/data/baseq3`, and
persist generated server state at `/state`:

```sh
docker run --rm \
  -p 27960:27960/udp \
  -p 27961:27961/tcp \
  -v /path/to/baseq3:/data/baseq3:ro \
  -v q3js-server-state:/state \
  -e Q3JS_MASTER_URL=https://master.q3js.com \
  -e Q3JS_PUBLISH_HOST=YOUR_PUBLIC_IP_OR_HOSTNAME \
  -e Q3JS_PUBLISH_PORT=27961 \
  -e Q3JS_SECURE=false \
  -e 'Q3JS_SERVER_CONFIG=seta sv_hostname "Q3JS Arena"; seta sv_maxclients "16"; seta g_gametype "0"; seta fraglimit "20"; seta timelimit "15"; map q3dm17' \
  lukaklacar/q3js-server:1.0.0
```

This public example registers an unofficial community server. Operators of the
Q3JS production master add `Q3JS_EVENT_CLIENT_SECRET` separately; community
operators do not need or receive that private credential.

In Dokploy, attach the PK3 volume to `/data/baseq3`. The PK3 files must be at
the root of that volume; no build arguments or download URLs are required.
Put the full Quake config in a single `Q3JS_SERVER_CONFIG` environment entry;
commands may be separated with semicolons or literal newlines.
