import {
    getGlobalScoreboard, getKillDistribution,
    KillDistributionPointResponse,
    ScoreboardEntryResponse,
    ScoreboardPeriod,
    ServerResponse
} from "@/lib/client";
import {getAllServers} from '@/lib/client/sdk.gen';
import {getRequestTimeZone} from "@/lib/request-time-zone";

export async function getInitialServers(): Promise<ServerResponse[]> {
    const {data} = await getAllServers({
        throwOnError: true,
    });
    return data;
}

export async function getInitialScoreboard(period: ScoreboardPeriod = "DAILY"): Promise<ScoreboardEntryResponse[]> {
    const timeZone = await getRequestTimeZone();
    const {data} = await getGlobalScoreboard({
        query: {
            period,
            timeZone,
        },
        throwOnError: true
    })
    return data;
}

export async function getInitialScoreboards(
    periods: readonly ScoreboardPeriod[],
): Promise<Record<ScoreboardPeriod, ScoreboardEntryResponse[]>> {
    const timeZone = await getRequestTimeZone();
    const entries = await Promise.all(
        periods.map(async (period) => {
            const {data} = await getGlobalScoreboard({
                query: {
                    period,
                    timeZone,
                },
                throwOnError: true,
            });

            return [period, data] as const;
        }),
    );

    return Object.fromEntries(entries) as Record<ScoreboardPeriod, ScoreboardEntryResponse[]>;
}

export async function getInitialKillDistributions(
    periods: readonly ScoreboardPeriod[],
): Promise<Record<ScoreboardPeriod, KillDistributionPointResponse[]>> {
    const timeZone = await getRequestTimeZone();
    const entries = await Promise.all(
        periods.map(async (period) => {
            const {data} = await getKillDistribution({
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
    const {data} = await getKillDistribution({
        query: {
            period,
            timeZone,
        },
        throwOnError: true
    })
    return data;
}
