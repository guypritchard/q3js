# Q3JS master server

The master server is the Q3JS game-server registry. Packaged Q3JS servers send
periodic heartbeats to it; the master queries their Quake status through the
WebSocket gateway, persists the latest successful response, and removes servers
that stop reporting.

The public API is compatible with the previous Q3JS server registry:

- `PUT /api/servers/heartbeat` registers or refreshes a server.
- `GET /api/servers` returns live servers with their latest status and players.
- `GET /api/status` reports application status.
- `POST /api/events` accepts authenticated join, leave, and kill events from
  packaged game servers.
- `GET /api/players` searches player profiles by Quake handle.
- `GET /api/players/{playerName}` returns detailed player statistics.
- `GET /api/scoreboard` returns searchable and paginated global frag rankings.
- `GET /api/scoreboard/distribution` returns hourly or daily frag activity.
- `GET /api/stats` returns players online, the top fragger from the rolling last
  24 hours, and the all-time recorded frag count.
- `GET /api/country` resolves the requester's public IP address to a country so
  browser clients can include it in their Quake userinfo.
- `POST /api/voice/token` issues a microphone-only LiveKit token for the voice
  room belonging to a currently listed game server.
- `POST /api/auth/login` authenticates the configured administrator and returns
  a signed JWT bearer token with the `admin` role.
- `GET /q/health` reports Quarkus health checks.
- `GET /q/openapi` returns the generated OpenAPI document.
- `GET /q/swagger-ui` opens the interactive Swagger UI.

Swagger UI is included in packaged builds as well as development mode.
Building the master also writes `target/openapi/openapi.json` and
`target/openapi/openapi.yaml`; the website uses the JSON document to generate its
typed API client and TanStack Query options.

## Development

Start PostgreSQL from the repository root:

```shell
docker compose up -d database
```

Then start the master server from the repository root:

```shell
make master-run
```

Run a packaged Q3JS server separately with `make server-run`. Its local defaults
publish `localhost:27961` to this master at `http://localhost:8080`.

Event ingestion requires the `X-Q3JS-Client-Secret` header. Heartbeats may use
the same header; matching servers are persisted as official, while missing or
invalid secrets remain registered as community servers. The master in dev or
test mode and a packaged server targeting localhost share a development-only
fallback. A deployed master requires an explicit secret; generate one and
provide the same value to both processes:

```shell
export Q3JS_EVENT_CLIENT_SECRET="$(openssl rand -hex 32)"
```

## Admin authentication

Admin authentication uses a password from `Q3JS_ADMIN_PASSWORD`. Successful
requests to `POST /api/auth/login` return a short-lived RS256 JWT bearer token.
Generate a dedicated signing key pair and configure its filesystem locations:

```shell
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out privateKey.pem
openssl pkey -in privateKey.pem -pubout -out publicKey.pem
export Q3JS_ADMIN_PASSWORD=replace-with-a-strong-admin-password
export Q3JS_ADMIN_JWT_PRIVATE_KEY_LOCATION=/absolute/path/to/privateKey.pem
export Q3JS_ADMIN_JWT_PUBLIC_KEY_LOCATION=/absolute/path/to/publicKey.pem
export Q3JS_ADMIN_TOKEN_TTL=1h
```

Keep the private key outside the application image and mount it as a runtime
secret. Admin endpoints can use Quarkus `@RolesAllowed("admin")`; clients send
the login response's `access_token` as `Authorization: Bearer <token>`.

The game server posts to `/api/events` on `Q3JS_MASTER_URL` by default. Override
that endpoint independently with `Q3JS_EVENT_URL`.

Servers are refreshed every five seconds. A failed status query retains the last
successful response, while a missing heartbeat removes the server after five
minutes. These values are configured with `q3js.master.refresh-every`,
`q3js.master.prune-every`, `q3js.master.heartbeat-ttl`, and
`q3js.master.server-status-timeout`.

## Voice chat

The master signs LiveKit room tokens; API credentials remain server-side. Set
the following variables on the master service:

```shell
export Q3JS_LIVEKIT_URL=https://staging.livekit.q3js.com
export Q3JS_LIVEKIT_API_KEY=replace-with-the-livekit-api-key
export Q3JS_LIVEKIT_API_SECRET=replace-with-the-livekit-api-secret
export Q3JS_LIVEKIT_TOKEN_TTL=6h
```

For local development, copy `.env.example` to `.env` inside the `master`
directory and run `make master-run` from the repository root. That target starts
Maven with `master` as its working directory so Quarkus automatically loads
`master/.env`. The standard `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` names are
also accepted as fallbacks.

Development defaults to `https://staging.livekit.q3js.com` for signaling. The
deployed LiveKit stack should advertise its own TURN service; the current
staging infrastructure endpoints are `https://staging.turn.q3js.com` for TURN
and `https://staging.whip.q3js.com/whip` for WHIP ingress. The website does not
connect to either origin directly: LiveKit sends authenticated ICE/TURN details
to room clients, while WHIP is for ingest rather than two-way room chat.

Room names are stable hashes of the listed server's `host:proxyPort`. The token
endpoint rejects servers that are not currently in the master registry and
grants only room subscription plus microphone publication; camera, screen
share, and data publication are disabled.

## jOOQ code generation

jOOQ generates records, POJOs, tables, keys, and sequences from the migrated
development database on demand:

```shell
./mvnw jooq-codegen:generate
```

Generated classes use the `com.q3js.master.database.generated` package and are
written under `src/main/java/com/q3js/master/database/generated`; they should be
committed with the migration that changed them. The development database must
be running and migrated before generation. Override the code-generation connection
when needed with:

```shell
./mvnw jooq-codegen:generate \
  -Djooq.codegen.jdbc.url=jdbc:postgresql://localhost:5432/postgres \
  -Djooq.codegen.jdbc.user=postgres \
  -Djooq.codegen.jdbc.password=postgres
```

The local defaults are `postgres` for the database, user, and password. Override
them with `Q3JS_DB_URL`, `Q3JS_DB_USER`, and `Q3JS_DB_PASSWORD`.

## GeoIP country lookup

The master bundles the DB-IP Country Lite database used by `GET /api/country`.
Override it with `Q3JS_COUNTRY_DB_PATH`, or change the fallback classpath resource
with `Q3JS_COUNTRY_DB_RESOURCE`. DB-IP Lite is licensed under CC BY 4.0 and
requires attribution: <https://db-ip.com>.

Loopback addresses cannot be geolocated. In development and tests they use `RS`
so local clients exercise the complete scoreboard path; override that with the
two-letter `Q3JS_DEV_COUNTRY_CODE` environment variable. Packaged deployments do
not use a fallback and only return countries resolved from the requester's IP.

## Build

```shell
make master
```

Application services can inject the configured `org.jooq.DSLContext`; it uses
Quarkus's managed PostgreSQL datasource and the PostgreSQL dialect.

## Container image

Build the production Quarkus image from the repository root:

```shell
docker build -f master/Dockerfile -t q3js-master .
```

The packaged application requires PostgreSQL and an explicit production event
secret:

```shell
docker run --rm -p 8080:8080 \
  -e Q3JS_DB_URL=jdbc:postgresql://database:5432/postgres \
  -e Q3JS_DB_USER=postgres \
  -e Q3JS_DB_PASSWORD=replace-with-the-database-password \
  -e Q3JS_EVENT_CLIENT_SECRET=replace-with-the-shared-event-secret \
  -e Q3JS_ADMIN_PASSWORD=replace-with-a-strong-admin-password \
  -e Q3JS_ADMIN_JWT_PRIVATE_KEY_LOCATION=/run/secrets/q3js-admin-private-key.pem \
  -e Q3JS_ADMIN_JWT_PUBLIC_KEY_LOCATION=/run/secrets/q3js-admin-public-key.pem \
  -e Q3JS_CORS_ORIGINS=https://q3js.example.com \
  q3js-master
```

Flyway validates and applies the committed schema migrations when the container
starts.
