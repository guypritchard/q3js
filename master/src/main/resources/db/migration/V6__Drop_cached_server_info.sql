ALTER TABLE servers
    DROP COLUMN IF EXISTS gamename,
    DROP COLUMN IF EXISTS com_gamename,
    DROP COLUMN IF EXISTS com_protocol,
    DROP COLUMN IF EXISTS version,
    DROP COLUMN IF EXISTS sv_hostname,
    DROP COLUMN IF EXISTS mapname,
    DROP COLUMN IF EXISTS g_gametype,
    DROP COLUMN IF EXISTS fraglimit,
    DROP COLUMN IF EXISTS timelimit,
    DROP COLUMN IF EXISTS sv_maxclients,
    DROP COLUMN IF EXISTS g_needpass,
    DROP COLUMN IF EXISTS capturelimit,
    DROP COLUMN IF EXISTS players,
    DROP COLUMN IF EXISTS ping,
    DROP COLUMN IF EXISTS port,
    DROP COLUMN IF EXISTS challenge,
    DROP COLUMN IF EXISTS sv_maxping,
    DROP COLUMN IF EXISTS sv_minping,
    DROP COLUMN IF EXISTS dmflags,
    DROP COLUMN IF EXISTS sv_privateclients,
    DROP COLUMN IF EXISTS sv_minrate,
    DROP COLUMN IF EXISTS sv_maxrate,
    DROP COLUMN IF EXISTS sv_dlrate,
    DROP COLUMN IF EXISTS sv_floodprotect,
    DROP COLUMN IF EXISTS sv_allowdownload,
    DROP COLUMN IF EXISTS bot_minplayers,
    DROP COLUMN IF EXISTS g_maxgameclients,
    DROP COLUMN IF EXISTS users,
    DROP COLUMN IF EXISTS info,
    DROP COLUMN IF EXISTS info_refreshed_at;

DROP INDEX IF EXISTS idx_servers_info_refreshed_at;
DROP INDEX IF EXISTS idx_servers_info_gin;
DROP INDEX IF EXISTS idx_servers_users_gin;
DROP INDEX IF EXISTS idx_servers_players;
DROP INDEX IF EXISTS idx_servers_mapname;

DROP INDEX IF EXISTS idx_servers_display_order;

CREATE INDEX IF NOT EXISTS idx_servers_display_order
    ON servers (display_order ASC, created_at ASC);
