import {env} from "@/env.ts";

export const SCOREBOARD_PERIODS = ["daily", "weekly", "monthly", "all-time"] as const;
export type ScoreboardPeriod = (typeof SCOREBOARD_PERIODS)[number];
export const DEFAULT_SCOREBOARD_PERIOD: ScoreboardPeriod = "all-time";

export const SCOREBOARD_PERIOD_LABELS: Record<ScoreboardPeriod, string> = {
    daily: "Last 24 Hours",
    weekly: "Weekly",
    monthly: "Monthly",
    "all-time": "All Time",
};

export interface ScoreboardEntry {
    playerName: string;
    kills: number;
}

export interface KillDistributionPoint {
    bucketStart: string;
    kills: number;
}

export async function fetchScoreboard(period: ScoreboardPeriod = DEFAULT_SCOREBOARD_PERIOD) {
    const url = new URL("/api/events/scoreboard", env.NEXT_PUBLIC_MASTER_SERVER_URL);
    url.searchParams.set("period", period);

    const response = await fetch(url, {
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`Failed to load scoreboard (${response.status})`);
    }

    return response.json() as Promise<ScoreboardEntry[]>;
}

export async function fetchKillDistribution(period: ScoreboardPeriod = DEFAULT_SCOREBOARD_PERIOD) {
    const url = new URL("/api/events/distribution", env.NEXT_PUBLIC_MASTER_SERVER_URL);
    url.searchParams.set("period", period);

    const response = await fetch(url, {
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`Failed to load kill distribution (${response.status})`);
    }

    return response.json() as Promise<KillDistributionPoint[]>;
}
