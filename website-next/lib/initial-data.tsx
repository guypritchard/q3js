import {
    getPlayerScoreboard, getPlayerScoreboardDistribution,
    KillDistributionPointResponse,
    ScoreboardPageResponse,
    ScoreboardPeriod,
    ServerResponse
} from "@/lib/client";
import {getAllServers} from '@/lib/client/sdk.gen';
import {getRequestTimeZone} from "@/lib/request-time-zone";
import {DEFAULT_SCOREBOARD_PAGE, SCOREBOARD_PAGE_SIZE} from "@/lib/scoreboard";

export async function getInitialServers(): Promise<ServerResponse[]> {
    const {data} = await getAllServers({
        throwOnError: true,
    });
    return data;
}

type ScoreboardRequestOptions = {
    page?: number;
    pageSize?: number;
};

export async function getInitialScoreboard(
    period: ScoreboardPeriod = "DAILY",
    options: ScoreboardRequestOptions = {},
): Promise<ScoreboardPageResponse> {
    const {page = DEFAULT_SCOREBOARD_PAGE, pageSize = SCOREBOARD_PAGE_SIZE} = options;
    const timeZone = await getRequestTimeZone();
    const {data} = await getPlayerScoreboard({
        query: {
            period,
            timeZone,
            page,
            pageSize,
        },
        throwOnError: true
    })
    return data;
}

export async function getInitialScoreboards(
    periods: readonly ScoreboardPeriod[],
    options: ScoreboardRequestOptions = {},
): Promise<Record<ScoreboardPeriod, ScoreboardPageResponse>> {
    const {page = DEFAULT_SCOREBOARD_PAGE, pageSize = SCOREBOARD_PAGE_SIZE} = options;
    const timeZone = await getRequestTimeZone();
    const entries = await Promise.all(
        periods.map(async (period) => {
            const {data} = await getPlayerScoreboard({
                query: {
                    period,
                    timeZone,
                    page,
                    pageSize,
                },
                throwOnError: true,
            });

            return [period, data] as const;
        }),
    );

    return Object.fromEntries(entries) as Record<ScoreboardPeriod, ScoreboardPageResponse>;
}

export async function getInitialKillDistributions(
    periods: readonly ScoreboardPeriod[],
): Promise<Record<ScoreboardPeriod, KillDistributionPointResponse[]>> {
    const timeZone = await getRequestTimeZone();
    const entries = await Promise.all(
        periods.map(async (period) => {
            const {data} = await getPlayerScoreboardDistribution({
                query: {
                    period,
                    timeZone,
                },
                throwOnError: true,
            });

            return [period, data] as const;
        }),
    );

    return Object.fromEntries(entries) as Record<ScoreboardPeriod, KillDistributionPointResponse[]>;
}

export async function getInitialKillDistribution(
    period: ScoreboardPeriod = "DAILY"
): Promise<KillDistributionPointResponse[]> {
    const timeZone = await getRequestTimeZone();
    const {data} = await getPlayerScoreboardDistribution({
        query: {
            period,
            timeZone,
        },
        throwOnError: true
    })
    return data;
}
