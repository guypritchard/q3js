import ScoreboardPage from "@/views/ScoreboardPage";
import {getInitialScoreboard} from "@/lib/initial-data";

export async function ScoreboardPageContent() {
    const initialScoreboard = await getInitialScoreboard();
    return <ScoreboardPage initialScoreboard={initialScoreboard}/>;
}
