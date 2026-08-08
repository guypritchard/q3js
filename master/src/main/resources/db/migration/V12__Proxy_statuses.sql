CREATE TABLE IF NOT EXISTS proxy_statuses
(
    host         TEXT        NOT NULL,
    proxy_port   INTEGER     NOT NULL,
    connections  INTEGER     NOT NULL CHECK (connections >= 0),
    source_ip    TEXT        NOT NULL,
    received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (host, proxy_port),
    FOREIGN KEY (host, proxy_port)
        REFERENCES servers (host, proxy_port)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_proxy_statuses_received_at
    ON proxy_statuses (received_at DESC);

CREATE TABLE IF NOT EXISTS proxy_status_players
(
    host          TEXT    NOT NULL,
    proxy_port    INTEGER NOT NULL,
    player_index  INTEGER NOT NULL CHECK (player_index >= 0),
    ip            TEXT    NOT NULL,
    name          TEXT    NOT NULL,
    country_code  TEXT,
    PRIMARY KEY (host, proxy_port, player_index),
    FOREIGN KEY (host, proxy_port)
        REFERENCES proxy_statuses (host, proxy_port)
        ON DELETE CASCADE,
    CONSTRAINT proxy_status_players_country_code_check
        CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$')
);

CREATE INDEX IF NOT EXISTS idx_proxy_status_players_name
    ON proxy_status_players (name);

CREATE INDEX IF NOT EXISTS idx_proxy_status_players_ip
    ON proxy_status_players (ip);
