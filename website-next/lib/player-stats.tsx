import {getPlayerStats, PlayerStatsResponse, ScoreboardPeriod} from "@/lib/client";
import {getRequestTimeZone} from "@/lib/request-time-zone";

export async function fetchPlayerStats(playerName: string, period: ScoreboardPeriod = "ALL_TIME") {
    const timeZone = await getRequestTimeZone();
    const {data} = await getPlayerStats({
        path: {
            playerName,
        },
        query: {
            period,
            timeZone,
        },
        throwOnError: true,
    });

    return data as PlayerStatsResponse;
}
