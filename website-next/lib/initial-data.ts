import {
    DEFAULT_SCOREBOARD_PERIOD,
    fetchKillDistribution,
    fetchScoreboard,
    type KillDistributionPoint,
    type ScoreboardEntry,
    type ScoreboardPeriod,
} from "@/lib/scoreboard";
import {fetchServers} from "@/lib/servers";
import type {Q3ResolvedServer} from "@/lib/q3";

export async function getInitialServers(): Promise<Q3ResolvedServer[]> {
    try {
        return await fetchServers();
    } catch {
        return [];
    }
}

export async function getInitialScoreboard(period: ScoreboardPeriod = DEFAULT_SCOREBOARD_PERIOD): Promise<ScoreboardEntry[]> {
    try {
        return await fetchScoreboard(period);
    } catch {
        return [];
    }
}

export async function getInitialKillDistribution(
    period: ScoreboardPeriod = DEFAULT_SCOREBOARD_PERIOD
): Promise<KillDistributionPoint[]> {
    try {
        return await fetchKillDistribution(period);
    } catch {
        return [];
    }
}
