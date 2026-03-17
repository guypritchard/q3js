import ScoreboardPage from "@/views/scoreboard-page";
import {getInitialKillDistribution, getInitialScoreboard} from "@/lib/initial-data";
import {
    DEFAULT_SCOREBOARD_PAGE,
    DEFAULT_SCOREBOARD_PERIOD,
    parseScoreboardPage,
    parseScoreboardPeriod,
    SCOREBOARD_PAGE_SIZE,
} from "@/lib/scoreboard";

type ScoreboardSearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function ScoreboardPageContent(props: {searchParams: ScoreboardSearchParams}) {
    const searchParams = await props.searchParams;
    const period = parseScoreboardPeriod(searchParams.period, DEFAULT_SCOREBOARD_PERIOD);
    const page = parseScoreboardPage(searchParams.page, DEFAULT_SCOREBOARD_PAGE);
    const [killDistribution, scoreboard] = await Promise.all([
        getInitialKillDistribution(period),
        getInitialScoreboard(period, {page, pageSize: SCOREBOARD_PAGE_SIZE}),
    ]);

    return <ScoreboardPage killDistribution={killDistribution} scoreboard={scoreboard}/>;
}
