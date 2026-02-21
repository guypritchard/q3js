import type {Q3ResolvedServer} from "@/lib/q3.ts";
import {Button} from "@/components/ui/button.tsx";
import {Zap} from "lucide-react";
import {env} from "@/env.ts";
import {storeRecentServer} from "@/lib/recent-servers.ts";
import {trackEvent} from "@/lib/analytics.ts";

export function JoinServerButton(props: {
    server: Q3ResolvedServer;
    playerName: string;
    resolvePlayerName?: () => string;
    onJoin?: (server: Q3ResolvedServer) => void;
}) {
    const baseUrl = env.VITE_GAME_URL ? env.VITE_GAME_URL : "";
    const normalizedName = props.playerName;
    const gameUrl = `${baseUrl}/game?host=${props.server.host}&proxyPort=${props.server.proxyPort}&name=${encodeURIComponent(normalizedName)}`;
    const isFull = props.server.players >= props.server.sv_maxclients;

    if (isFull) {
        return (
            <Button
                size="lg"
                className="lg:w-auto w-full bg-primary text-primary-foreground font-bold"
                disabled
            >
                Server Full
            </Button>
        );
    }

    return (
        <Button
            asChild
            size="lg"
            className="lg:w-auto w-full bg-primary text-primary-foreground font-bold"
        >
            <a
                href={gameUrl}
                onClick={(event) => {
                    const resolvedName = props.resolvePlayerName?.() ?? props.playerName;
                    event.currentTarget.href = `${baseUrl}/game?host=${props.server.host}&proxyPort=${props.server.proxyPort}&name=${encodeURIComponent(resolvedName)}`;
                    trackEvent("join_server_click", {
                        server_region: props.server.location ?? "Unknown",
                        map_name: props.server.mapname.toLowerCase(),
                        game_type: props.server.g_gametype,
                        player_count: props.server.players,
                        max_players: props.server.sv_maxclients,
                        password_protected: props.server.g_needpass === 1,
                    });
                    storeRecentServer(props.server);
                    props.onJoin?.(props.server);
                }}
                aria-label={`Join ${props.server.sv_hostname} as ${normalizedName.trim() || "generated player name"}`}
            >
                {isFull
                    ? "Server Full"
                    : <>
                        <Zap className="h-4 w-4 mr-2"/>Join now
                    </>}
            </a>
        </Button>
    );
}
