CREATE TABLE player_addresses
(
    ip_address       TEXT PRIMARY KEY,
    source_ip        TEXT,
    last_userinfo    JSONB       NOT NULL DEFAULT '{}'::JSONB,
    last_server_host TEXT,
    last_server_port INTEGER CHECK (last_server_port BETWEEN 1 AND 65535),
    connection_count BIGINT      NOT NULL DEFAULT 0 CHECK (connection_count >= 0),
    first_seen_at    TIMESTAMPTZ,
    last_seen_at     TIMESTAMPTZ,
    banned_at        TIMESTAMPTZ
);

CREATE TABLE player_address_names
(
    ip_address       TEXT        NOT NULL REFERENCES player_addresses (ip_address) ON DELETE CASCADE,
    player_name      TEXT        NOT NULL,
    connection_count BIGINT      NOT NULL DEFAULT 1 CHECK (connection_count > 0),
    first_seen_at    TIMESTAMPTZ NOT NULL,
    last_seen_at     TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (ip_address, player_name)
);

INSERT INTO player_addresses (
    ip_address,
    source_ip,
    last_userinfo,
    last_server_host,
    last_server_port,
    connection_count,
    first_seen_at,
    last_seen_at
)
WITH normalized_connections AS (
    SELECT *,
           CASE
               WHEN HOST(client_ip::INET) LIKE '::ffff:%'
                   THEN SUBSTRING(HOST(client_ip::INET) FROM 8)
               ELSE HOST(client_ip::INET)
           END AS ip_address
    FROM player_connections
)
SELECT latest.ip_address,
       latest.source_ip,
       latest.userinfo,
       latest.server_host,
       latest.server_port,
       totals.connection_count,
       totals.first_seen_at,
       totals.last_seen_at
FROM (
    SELECT DISTINCT ON (ip_address)
           ip_address,
           source_ip,
           userinfo,
           server_host,
           server_port
    FROM normalized_connections
    ORDER BY ip_address, received_at DESC, id DESC
) latest
JOIN (
    SELECT ip_address,
           COUNT(*) AS connection_count,
           MIN(received_at) AS first_seen_at,
           MAX(received_at) AS last_seen_at
    FROM normalized_connections
    GROUP BY ip_address
) totals ON totals.ip_address = latest.ip_address;

INSERT INTO player_address_names (
    ip_address,
    player_name,
    connection_count,
    first_seen_at,
    last_seen_at
)
SELECT CASE
           WHEN HOST(client_ip::INET) LIKE '::ffff:%'
               THEN SUBSTRING(HOST(client_ip::INET) FROM 8)
           ELSE HOST(client_ip::INET)
       END,
       player_name,
       COUNT(*),
       MIN(received_at),
       MAX(received_at)
FROM player_connections
GROUP BY 1, player_name;

INSERT INTO player_addresses (ip_address, banned_at)
SELECT CASE
           WHEN HOST(ip_address::INET) LIKE '::ffff:%'
               THEN SUBSTRING(HOST(ip_address::INET) FROM 8)
           ELSE HOST(ip_address::INET)
       END,
       MAX(banned_at)
FROM banned_ips
GROUP BY 1
ON CONFLICT (ip_address) DO UPDATE
SET banned_at = EXCLUDED.banned_at;

INSERT INTO player_address_names (ip_address, player_name, first_seen_at, last_seen_at)
SELECT CASE
           WHEN HOST(ip_address::INET) LIKE '::ffff:%'
               THEN SUBSTRING(HOST(ip_address::INET) FROM 8)
           ELSE HOST(ip_address::INET)
       END,
       player_name,
       MIN(banned_at),
       MAX(banned_at)
FROM banned_ips
WHERE player_name IS NOT NULL
  AND BTRIM(player_name) <> ''
GROUP BY 1, player_name
ON CONFLICT (ip_address, player_name) DO NOTHING;

CREATE INDEX idx_player_addresses_last_seen_at
    ON player_addresses (last_seen_at DESC NULLS LAST);

CREATE INDEX idx_player_addresses_banned_at
    ON player_addresses (banned_at DESC)
    WHERE banned_at IS NOT NULL;

CREATE INDEX idx_player_address_names_player_name
    ON player_address_names (LOWER(player_name));

DROP TABLE player_connections;
DROP TABLE banned_ips;
