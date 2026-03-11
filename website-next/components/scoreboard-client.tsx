"use client";

import {Card, CardContent} from "@/components/ui/card.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {
    DEFAULT_SCOREBOARD_PERIOD,
    fetchScoreboard,
    SCOREBOARD_PERIOD_LABELS,
    type ScoreboardEntry,
    type ScoreboardPeriod,
} from "@/lib/scoreboard.ts";
import {stripQ3Colors} from "@/lib/utils.ts";
import {useMemo, useState} from "react";
import {Q3ColoredText} from "@/components/q3-colored-text.tsx";
import {trackEvent} from "@/lib/analytics.ts";
import {usePollingQuery} from "@/hooks/use-polling-query.ts";
import {ScoreboardPeriodToggle} from "@/components/scoreboard-period-toggle.tsx";

function rankBadge(rank: number) {
    if (rank === 1) return <Badge className="min-w-10 justify-center bg-primary text-primary-foreground">#1</Badge>;
    if (rank === 2) return <Badge variant="secondary" className="min-w-10 justify-center">#2</Badge>;
    if (rank === 3) return <Badge variant="outline" className="min-w-10 justify-center">#3</Badge>;
    return <span className="inline-block min-w-10 text-center text-muted-foreground">#{rank}</span>;
}

function formatKills(kills: number) {
    return new Intl.NumberFormat().format(kills);
}

export function ScoreboardClient(props: { initialScoreboard: ScoreboardEntry[] }) {
    const [period, setPeriod] = useState<ScoreboardPeriod>(DEFAULT_SCOREBOARD_PERIOD);
    const scoreboardQuery = usePollingQuery<ScoreboardEntry[]>({
        queryFn: () => fetchScoreboard(period),
        intervalMs: 30000,
        initialData: period === DEFAULT_SCOREBOARD_PERIOD ? props.initialScoreboard : [],
        isPendingInitial: period !== DEFAULT_SCOREBOARD_PERIOD,
        queryKey: period,
    });

    const scoreboard = useMemo(() => {
        const rows = scoreboardQuery.data ?? [];
        return [...rows].sort((a, b) => {
            if (b.kills !== a.kills) return b.kills - a.kills;
            return stripQ3Colors(a.playerName).localeCompare(stripQ3Colors(b.playerName));
        });
    }, [scoreboardQuery.data]);

    function refreshScoreboard(source: "refresh_button" | "error_retry") {
        trackEvent("scoreboard_refresh_click", {source, period});
        void scoreboardQuery.refetch();
    }

    function selectPeriod(nextPeriod: ScoreboardPeriod) {
        if (nextPeriod === period) return;

        trackEvent("scoreboard_period_change", {source: "scoreboard_page", period: nextPeriod});
        setPeriod(nextPeriod);
    }

    const periodLabel = SCOREBOARD_PERIOD_LABELS[period];

    return (
        <Card className="border-border/60 bg-card/60">
            <CardContent className="p-0">
                <div className="flex flex-col gap-3 border-b border-border/60 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">
                                {scoreboardQuery.isPending
                                    ? `Loading ${periodLabel.toLowerCase()} players...`
                                    : `${scoreboard.length} players ranked`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Showing {periodLabel.toLowerCase()} kills across reported servers.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <ScoreboardPeriodToggle period={period} onChange={selectPeriod}/>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refreshScoreboard("refresh_button")}
                                disabled={scoreboardQuery.isFetching}
                            >
                                {scoreboardQuery.isFetching ? "Refreshing..." : "Refresh"}
                            </Button>
                        </div>
                    </div>
                </div>

                {scoreboardQuery.isError && (
                    <div className="p-6 text-center space-y-3">
                        <p className="text-sm text-destructive">Failed to load the {periodLabel.toLowerCase()} scoreboard.</p>
                        <Button variant="outline" onClick={() => refreshScoreboard("error_retry")}>
                            Retry
                        </Button>
                    </div>
                )}

                {!scoreboardQuery.isError && scoreboardQuery.isPending && (
                    <div className="divide-y divide-border/50">
                        {Array.from({length: 8}).map((_, idx) => (
                            <div key={idx} className="grid grid-cols-[92px_1fr_110px] items-center gap-3 px-4 py-3">
                                <div className="h-5 w-10 animate-pulse bg-muted"/>
                                <div className="h-5 w-2/5 animate-pulse bg-muted"/>
                                <div className="ml-auto h-5 w-14 animate-pulse bg-muted"/>
                            </div>
                        ))}
                    </div>
                )}

                {!scoreboardQuery.isError && !scoreboardQuery.isPending && scoreboard.length === 0 && (
                    <div className="p-10 text-center">
                        <p className="text-sm text-muted-foreground">No {periodLabel.toLowerCase()} kill events have been recorded yet.</p>
                    </div>
                )}

                {!scoreboardQuery.isError && scoreboard.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[500px] text-sm">
                            <thead>
                            <tr className="border-b border-border/60 text-muted-foreground">
                                <th className="px-4 py-3 text-left font-semibold">Rank</th>
                                <th className="px-4 py-3 text-left font-semibold">Player</th>
                                <th className="px-4 py-3 text-right font-semibold">Kills</th>
                            </tr>
                            </thead>
                            <tbody>
                            {scoreboard.map((entry, index) => {
                                const rank = index + 1;

                                return (
                                    <tr key={`${entry.playerName}-${rank}`} className="border-b border-border/40 last:border-b-0">
                                        <td className="px-4 py-3">{rankBadge(rank)}</td>
                                        <td className="px-4 py-3 font-semibold">
                                            <Q3ColoredText text={entry.playerName}/>
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums">
                                            {formatKills(entry.kills)}
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
