\echo 'Player playtime report'

WITH lifecycle_events AS (
    SELECT
        COALESCE(source_ip, '') AS source_ip_key,
        killer_name AS player_name,
        lower(event_type) AS event_type,
        received_at
    FROM events
    WHERE lower(event_type) IN ('join', 'leave')
),
join_events AS (
    SELECT
        source_ip_key,
        player_name,
        received_at AS joined_at,
        ROW_NUMBER() OVER (
            PARTITION BY source_ip_key, player_name
            ORDER BY received_at
        ) AS session_number
    FROM lifecycle_events
    WHERE event_type = 'join'
),
leave_events AS (
    SELECT
        source_ip_key,
        player_name,
        received_at AS left_at,
        ROW_NUMBER() OVER (
            PARTITION BY source_ip_key, player_name
            ORDER BY received_at
        ) AS session_number
    FROM lifecycle_events
    WHERE event_type = 'leave'
),
sessions AS (
    SELECT
        joins.player_name,
        joins.source_ip_key,
        joins.joined_at,
        COALESCE(leaves.left_at, NOW()) AS left_at,
        GREATEST(
            EXTRACT(EPOCH FROM (COALESCE(leaves.left_at, NOW()) - joins.joined_at)),
            0
        )::BIGINT AS session_seconds
    FROM join_events joins
    LEFT JOIN leave_events leaves
        ON leaves.source_ip_key = joins.source_ip_key
        AND leaves.player_name = joins.player_name
        AND leaves.session_number = joins.session_number
)
SELECT
    player_name,
    COUNT(*) AS sessions,
    SUM(session_seconds)::BIGINT AS total_playtime_seconds,
    SUM(session_seconds)::DOUBLE PRECISION * INTERVAL '1 second' AS total_playtime
FROM sessions
GROUP BY player_name
ORDER BY total_playtime_seconds DESC, player_name ASC;
