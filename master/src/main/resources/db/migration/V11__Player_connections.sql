CREATE TABLE player_connections
(
    id          BIGSERIAL PRIMARY KEY,
    source_ip   TEXT,
    client_ip   TEXT        NOT NULL,
    player_name TEXT        NOT NULL,
    userinfo    JSONB       NOT NULL,
    server_host TEXT        NOT NULL,
    server_port INTEGER     NOT NULL CHECK (server_port BETWEEN 1 AND 65535),
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_player_connections_received_at
    ON player_connections (received_at DESC);

CREATE INDEX idx_player_connections_client_ip_received_at
    ON player_connections (client_ip, received_at DESC);

CREATE INDEX idx_player_connections_player_name_received_at
    ON player_connections (player_name, received_at DESC);
