import ScoreboardPage from "@/views/scoreboard-page";
import {getInitialScoreboard} from "@/lib/initial-data";
import {
    DEFAULT_SCOREBOARD_PAGE,
    DEFAULT_SCOREBOARD_PERIOD,
    parseScoreboardPage,
    parseScoreboardPeriod,
    parseScoreboardSearch,
    SCOREBOARD_PAGE_SIZE,
} from "@/lib/scoreboard";

type ScoreboardSearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function ScoreboardPageContent(props: {searchParams: ScoreboardSearchParams}) {
    const searchParams = await props.searchParams;
    const period = parseScoreboardPeriod(searchParams.period, DEFAULT_SCOREBOARD_PERIOD);
    const page = parseScoreboardPage(searchParams.page, DEFAULT_SCOREBOARD_PAGE);
    const search = parseScoreboardSearch(searchParams.search);
    const scoreboard = await getInitialScoreboard(period, {page, pageSize: SCOREBOARD_PAGE_SIZE, search});

    return <ScoreboardPage scoreboard={scoreboard} search={search}/>;
}
