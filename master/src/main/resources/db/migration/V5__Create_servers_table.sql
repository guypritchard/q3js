-- Store registered servers and the latest fetched /info payload.
CREATE TABLE IF NOT EXISTS servers
(
    id                BIGSERIAL PRIMARY KEY,

    -- routing / identity
    host              TEXT        NOT NULL,
    proxy_port        INTEGER     NOT NULL CHECK (proxy_port BETWEEN 1 AND 65535),
    target_host       TEXT,
    target_port       INTEGER     NOT NULL CHECK (target_port BETWEEN 1 AND 65535),

    secure            BOOLEAN     NOT NULL DEFAULT FALSE,

    -- mod / game identity
    fs_game           TEXT,
    gamename          TEXT        NOT NULL,
    com_gamename      TEXT        NOT NULL,
    com_protocol      INTEGER     NOT NULL,
    version           TEXT        NOT NULL,

    -- denormalized /info fields
    sv_hostname       TEXT        NOT NULL,
    mapname           TEXT        NOT NULL,
    g_gametype        INTEGER     NOT NULL,
    fraglimit         INTEGER     NOT NULL,
    timelimit         INTEGER     NOT NULL,
    sv_maxclients     INTEGER     NOT NULL,
    g_needpass        INTEGER     NOT NULL,
    capturelimit      INTEGER     NOT NULL,

    players           INTEGER     NOT NULL,
    ping              INTEGER     NOT NULL,
    port              INTEGER     NOT NULL CHECK (port BETWEEN 1 AND 65535),
    challenge         TEXT        NOT NULL,

    sv_maxping        INTEGER     NOT NULL,
    sv_minping        INTEGER     NOT NULL,
    dmflags           INTEGER     NOT NULL,
    sv_privateclients INTEGER     NOT NULL,
    sv_minrate        INTEGER     NOT NULL,
    sv_maxrate        INTEGER     NOT NULL,
    sv_dlrate         INTEGER     NOT NULL,
    sv_floodprotect   INTEGER     NOT NULL,
    sv_allowdownload  INTEGER     NOT NULL,
    bot_minplayers    INTEGER     NOT NULL,
    g_maxgameclients  INTEGER     NOT NULL,

    -- extracted users list from payload
    users             JSONB       NOT NULL CHECK (JSONB_TYPEOF(users) = 'array'),

    -- control flags
    permanent         BOOLEAN     NOT NULL DEFAULT FALSE,
    display_order     INTEGER     NOT NULL DEFAULT 0,

    -- raw payload
    info              JSONB       NOT NULL,

    -- timestamps
    info_refreshed_at TIMESTAMPTZ,
    last_heartbeat_at TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_servers_host_proxy_target
        UNIQUE (host, proxy_port, target_port)
);

CREATE INDEX IF NOT EXISTS idx_servers_display_order
    ON servers (display_order ASC, players DESC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_servers_players
    ON servers (players DESC);

CREATE INDEX IF NOT EXISTS idx_servers_mapname
    ON servers (mapname);

CREATE INDEX IF NOT EXISTS idx_servers_gametype
    ON servers (g_gametype);

CREATE INDEX IF NOT EXISTS idx_servers_last_heartbeat_at
    ON servers (last_heartbeat_at DESC);

CREATE INDEX IF NOT EXISTS idx_servers_info_refreshed_at
    ON servers (info_refreshed_at DESC);

CREATE INDEX IF NOT EXISTS idx_servers_info_gin
    ON servers USING GIN (info);

CREATE INDEX IF NOT EXISTS idx_servers_users_gin
    ON servers USING GIN (users);