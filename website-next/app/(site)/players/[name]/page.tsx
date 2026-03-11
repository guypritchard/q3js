import type {Metadata} from "next";
import PlayerProfilePage from "@/views/PlayerProfilePage";
import {buildPageMetadata} from "@/lib/seo";
import {fetchPlayerStats} from "@/lib/player-stats.ts";
import {stripQ3Colors} from "@/lib/utils.ts";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type PlayerProfileRouteProps = {
    params: Promise<{ name: string }>;
};

function decodePlayerName(value: string) {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

export async function generateMetadata(props: PlayerProfileRouteProps): Promise<Metadata> {
    const params = await props.params;
    const playerName = decodePlayerName(params.name);
    const plainName = stripQ3Colors(playerName);

    return buildPageMetadata({
        title: `${plainName} Profile`,
        description: `Q3JS player profile for ${plainName}, with current rank, kills, deaths, rivals, and favorite map.`,
        path: `/players/${encodeURIComponent(playerName)}`,
        keywords: [
            `${plainName} Q3JS`,
            `${plainName} Quake 3`,
            "Q3JS player profile",
            "Quake III player stats",
        ],
    });
}

export default async function PlayerProfileRoute(props: PlayerProfileRouteProps) {
    const params = await props.params;
    const playerName = decodePlayerName(params.name);
    const stats = await fetchPlayerStats(playerName);

    return <PlayerProfilePage playerName={playerName} period="all-time" stats={stats}/>;
}
