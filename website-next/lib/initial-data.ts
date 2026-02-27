import {fetchScoreboard, type ScoreboardEntry} from "@/lib/scoreboard";
import {fetchServers} from "@/lib/servers";
import type {Q3ResolvedServer} from "@/lib/q3";

export async function getInitialServers(): Promise<Q3ResolvedServer[]> {
    try {
        return await fetchServers();
    } catch {
        return [];
    }
}

export async function getInitialScoreboard(): Promise<ScoreboardEntry[]> {
    try {
        return await fetchScoreboard();
    } catch {
        return [];
    }
}
