import {getInitialKillDistribution} from "@/lib/initial-data";
import {
    DEFAULT_SCOREBOARD_PERIOD,
    parseScoreboardPeriod,
} from "@/lib/scoreboard";
import ScoreboardDistributionPage from "@/views/scoreboard-distribution-page";

type ScoreboardDistributionSearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function ScoreboardDistributionPageContent(props: {
    searchParams: ScoreboardDistributionSearchParams;
}) {
    const searchParams = await props.searchParams;
    const period = parseScoreboardPeriod(searchParams.period, DEFAULT_SCOREBOARD_PERIOD);
    const distribution = await getInitialKillDistribution(period);

    return <ScoreboardDistributionPage data={distribution} period={period}/>;
}
