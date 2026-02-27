import {ScoreboardClient} from "@/components/scoreboard-client";
import type {ScoreboardEntry} from "@/lib/scoreboard";

export default function ScoreboardPage(props: { initialScoreboard: ScoreboardEntry[] }) {
    return (
        <main className="container mx-auto px-4 py-12 md:py-16">
            <section className="mx-auto max-w-5xl space-y-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">Global Scoreboard</h1>
                    <p className="text-sm text-muted-foreground md:text-base">
                        All-time kills across reported servers, grouped by player name.
                    </p>
                </div>

                <ScoreboardClient initialScoreboard={props.initialScoreboard}/>
            </section>
        </main>
    );
}
