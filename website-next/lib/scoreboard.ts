import {ScoreboardEntryResponse, ScoreboardPeriod} from "@/lib/client";
import {stripQ3Colors} from "@/lib/utils";

export const SCOREBOARD_PERIODS = Object.values(ScoreboardPeriod) as ScoreboardPeriod[];
export const DEFAULT_SCOREBOARD_PERIOD: ScoreboardPeriod = "DAILY";
export const DEFAULT_SCOREBOARD_PAGE = 1;
export const SCOREBOARD_PAGE_SIZE = 25;
export const SCOREBOARD_PREVIEW_PAGE_SIZE = 5;

export const SCOREBOARD_PERIOD_LABELS: Record<ScoreboardPeriod, string> = {
    DAILY: "Last 24 Hours",
    WEEKLY: "Weekly",
    MONTHLY: "Monthly",
    ALL_TIME: "All Time",
};

function firstQueryValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

export function parseScoreboardPeriod(
    value: string | string[] | undefined,
    fallback: ScoreboardPeriod = DEFAULT_SCOREBOARD_PERIOD,
) {
    const candidate = firstQueryValue(value);

    if (candidate && SCOREBOARD_PERIODS.includes(candidate as ScoreboardPeriod)) {
        return candidate as ScoreboardPeriod;
    }

    return fallback;
}

export function parseScoreboardPage(
    value: string | string[] | undefined,
    fallback: number = DEFAULT_SCOREBOARD_PAGE,
) {
    const candidate = firstQueryValue(value);

    if (!candidate) {
        return fallback;
    }

    const parsed = Number.parseInt(candidate, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function buildScoreboardHref(period: ScoreboardPeriod, page: number = DEFAULT_SCOREBOARD_PAGE) {
    const params = new URLSearchParams({period});

    if (page > DEFAULT_SCOREBOARD_PAGE) {
        params.set("page", String(page));
    }

    return `/scoreboard?${params.toString()}`;
}

export function sortScoreboardEntries(entries: ScoreboardEntryResponse[]) {
    return [...entries].sort((a, b) => {
        if (b.kills !== a.kills) return b.kills - a.kills;
        return stripQ3Colors(a.playerName).localeCompare(stripQ3Colors(b.playerName));
    });
}
