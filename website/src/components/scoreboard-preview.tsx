import {Card, CardContent} from "@/components/ui/card.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Link} from "@tanstack/react-router";
import {useQuery} from "@tanstack/react-query";
import {fetchScoreboard, type ScoreboardEntry} from "@/lib/scoreboard.ts";
import {useMemo} from "react";
import {stripQ3Colors} from "@/lib/utils.ts";
import {Q3ColoredText} from "@/components/q3-colored-text.tsx";

function formatKills(kills: number) {
    return new Intl.NumberFormat().format(kills);
}

export function ScoreboardPreview() {
    const scoreboardQuery = useQuery<ScoreboardEntry[]>({
        queryKey: ["scoreboard", "preview"],
        queryFn: fetchScoreboard,
        refetchInterval: 30000,
        staleTime: 20000,
        retry: 1,
    });

    const topFraggers = useMemo(() => {
        const rows = scoreboardQuery.data ?? [];
        return [...rows]
            .sort((a, b) => {
                if (b.kills !== a.kills) return b.kills - a.kills;
                return stripQ3Colors(a.playerName).localeCompare(stripQ3Colors(b.playerName));
            })
            .slice(0, 5);
    }, [scoreboardQuery.data]);

    return (
        <section className="container mx-auto px-4 pb-8">
            <div className="mx-auto max-w-5xl">
                <Card className="border-border/60 bg-card/60">
                    <CardContent className="p-4 md:p-6">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-2xl font-bold">Top Fraggers</h2>
                                <p className="text-xs text-muted-foreground md:text-sm">
                                    Global all-time kill leaders.
                                </p>
                            </div>
                            <Button variant="outline" asChild>
                                <Link to="/scoreboard">View full scoreboard</Link>
                            </Button>
                        </div>

                        <div className="mt-4 border-t border-border/50">
                            {scoreboardQuery.isPending && (
                                <div className="divide-y divide-border/40">
                                    {Array.from({length: 5}).map((_, idx) => (
                                        <div key={idx} className="grid grid-cols-[56px_1fr_100px] items-center gap-3 px-2 py-3">
                                            <div className="h-4 w-8 animate-pulse bg-muted"/>
                                            <div className="h-4 w-2/5 animate-pulse bg-muted"/>
                                            <div className="ml-auto h-4 w-12 animate-pulse bg-muted"/>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {scoreboardQuery.isError && (
                                <div className="px-2 py-6 text-sm text-muted-foreground">
                                    Scoreboard is temporarily unavailable.
                                </div>
                            )}

                            {!scoreboardQuery.isPending && !scoreboardQuery.isError && topFraggers.length === 0 && (
                                <div className="px-2 py-6 text-sm text-muted-foreground">
                                    No kill events recorded yet.
                                </div>
                            )}

                            {!scoreboardQuery.isPending && !scoreboardQuery.isError && topFraggers.length > 0 && (
                                <div className="divide-y divide-border/40">
                                    {topFraggers.map((entry, index) => (
                                        <div
                                            key={`${entry.playerName}-${index}`}
                                            className="grid grid-cols-[56px_1fr_100px] items-center gap-3 px-2 py-3 text-sm"
                                        >
                                            <span className="text-muted-foreground">#{index + 1}</span>
                                            <span className="font-semibold truncate">
                                                <Q3ColoredText text={entry.playerName}/>
                                            </span>
                                            <span className="text-right tabular-nums">
                                                {formatKills(entry.kills)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </section>
    );
}
