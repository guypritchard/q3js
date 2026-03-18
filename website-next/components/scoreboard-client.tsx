"use client";

import {Card, CardContent} from "@/components/ui/card.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import Link from "next/link";
import {
    buildScoreboardDistributionHref,
    buildScoreboardHref,
    DEFAULT_SCOREBOARD_PAGE,
    SCOREBOARD_PERIOD_LABELS,
} from "@/lib/scoreboard.ts";
import {FormEvent, useTransition} from "react";
import {Q3ColoredText} from "@/components/q3-colored-text.tsx";
import {ScoreboardPeriodToggle} from "@/components/scoreboard-period-toggle.tsx";
import {ScoreboardPageResponse, ScoreboardPeriod} from "@/lib/client";
import {useRouter} from "next/navigation";
import {formatCompactLastOnline} from "@/lib/last-online";
import {Input} from "@/components/ui/input.tsx";
import {ScoreboardToolbar} from "@/components/scoreboard-toolbar.tsx";

function rankBadge(rank: number) {
    if (rank === 1) return <Badge className="min-w-10 justify-center bg-primary text-primary-foreground">#1</Badge>;
    if (rank === 2) return <Badge variant="secondary" className="min-w-10 justify-center">#2</Badge>;
    if (rank === 3) return <Badge variant="outline" className="min-w-10 justify-center">#3</Badge>;
    return <span className="inline-block min-w-10 text-center text-muted-foreground">#{rank}</span>;
}

function formatKills(kills: number) {
    return new Intl.NumberFormat().format(kills);
}

export function ScoreboardClient(props: {
    search: string;
    scoreboard: ScoreboardPageResponse;
}) {
    const period = props.scoreboard.period;
    const [isNavigating, startNavigationTransition] = useTransition();
    const [isRefreshing, startRefreshTransition] = useTransition();
    const router = useRouter();
    const isBusy = isNavigating || isRefreshing;
    const scoreboard = props.scoreboard.entries;
    const hasSearch = props.search.trim().length > 0;
    const startRank = scoreboard.length === 0 ? 0 : ((props.scoreboard.page - 1) * props.scoreboard.pageSize) + 1;
    const endRank = scoreboard.length === 0 ? 0 : startRank + scoreboard.length - 1;

    function refreshScoreboard() {
        startRefreshTransition(() => {
            router.refresh();
        });
    }

    function selectPeriod(nextPeriod: ScoreboardPeriod) {
        if (nextPeriod === period) return;
        startNavigationTransition(() => {
            router.push(buildScoreboardHref(nextPeriod, DEFAULT_SCOREBOARD_PAGE, props.search), {scroll: false});
        });
    }

    function goToPage(nextPage: number) {
        if (nextPage === props.scoreboard.page || nextPage < 1 || nextPage > props.scoreboard.totalPages) {
            return;
        }

        startNavigationTransition(() => {
            router.push(buildScoreboardHref(period, nextPage, props.search), {scroll: false});
        });
    }

    function submitSearch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const nextSearch = formData.get("search")?.toString() ?? "";
        startNavigationTransition(() => {
            router.push(buildScoreboardHref(period, DEFAULT_SCOREBOARD_PAGE, nextSearch), {scroll: false});
        });
    }

    function clearSearch() {
        if (!hasSearch) {
            return;
        }

        startNavigationTransition(() => {
            router.push(buildScoreboardHref(period, DEFAULT_SCOREBOARD_PAGE), {scroll: false});
        });
    }

    const periodLabel = SCOREBOARD_PERIOD_LABELS[period];

    return (
        <Card className="border-border/60 bg-card/60">
            <CardContent className="p-0">
                <ScoreboardToolbar
                    description={
                        <>
                            <p className="text-sm text-muted-foreground">
                                {hasSearch
                                    ? (props.scoreboard.totalEntries === 0
                                        ? `No players matched "${props.search}"`
                                        : `Showing ${startRank}-${endRank} of ${props.scoreboard.totalEntries} matching players`)
                                    : (props.scoreboard.totalEntries === 0
                                        ? "0 players ranked"
                                        : `Showing ${startRank}-${endRank} of ${props.scoreboard.totalEntries} players ranked`)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {hasSearch
                                    ? `${formatKills(props.scoreboard.totalKills)} ${periodLabel.toLowerCase()} frags from matched players.`
                                    : `${formatKills(props.scoreboard.totalKills)} total ${periodLabel.toLowerCase()} frags across reported servers.`}
                            </p>
                        </>
                    }
                    actions={
                        <>
                            <Button asChild variant="outline" size="sm">
                                <Link href={buildScoreboardDistributionHref(period)}>
                                    Activity
                                </Link>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={refreshScoreboard}
                                disabled={isBusy}
                            >
                                {isRefreshing ? "Refreshing..." : "Refresh"}
                            </Button>
                        </>
                    }
                    periodControls={<ScoreboardPeriodToggle period={period} onChange={selectPeriod}/>}
                    search={
                        <form className="flex w-full flex-col gap-2 sm:flex-row" onSubmit={submitSearch}>
                            <Input
                                type="search"
                                key={props.search}
                                name="search"
                                defaultValue={props.search}
                                placeholder="Search players on the scoreboard"
                                className="min-w-0 flex-1"
                            />
                            <div className="flex items-center gap-2">
                                <Button type="submit" variant="outline" size="sm" disabled={isBusy}>
                                    Search
                                </Button>
                                {hasSearch && (
                                    <Button type="button" variant="ghost" size="sm" onClick={clearSearch} disabled={isBusy}>
                                        Clear
                                    </Button>
                                )}
                            </div>
                        </form>
                    }
                />

                {scoreboard.length === 0 && (
                    <div className="p-10 text-center">
                        <p className="text-sm text-muted-foreground">
                            {hasSearch
                                ? "Try a shorter player fragment or clear the search."
                                : `No ${periodLabel.toLowerCase()} frag events have been recorded yet.`}
                        </p>
                        </div>
                )}

                {scoreboard.length > 0 && (
                    <div>
                        <div className="overflow-x-auto">
                        <table className="w-full min-w-[500px] text-sm">
                            <thead>
                            <tr className="border-b border-border/60 text-muted-foreground">
                                <th className="px-4 py-3 text-left font-semibold">Rank</th>
                                <th className="px-4 py-3 text-left font-semibold">Player</th>
                                <th className="px-4 py-3 text-right font-semibold">Frags</th>
                            </tr>
                            </thead>
                            <tbody>
                            {scoreboard.map((entry, index) => {
                                const rank = startRank + index;

                                return (
                                    <tr key={`${entry.playerName}-${rank}`}
                                        className="border-b border-border/40 last:border-b-0">
                                        <td className="px-4 py-3">{rankBadge(rank)}</td>
                                        <td className="px-4 py-3">
                                            <div className="min-w-0">
                                                <Link
                                                    href={`/players/${encodeURIComponent(entry.playerName)}`}
                                                    className="inline-flex max-w-full truncate font-semibold hover:text-primary transition-colors"
                                                >
                                                    <Q3ColoredText text={entry.playerName}/>
                                                </Link>
                                                <p className="text-xs text-muted-foreground">
                                                    Last online {formatCompactLastOnline(entry.lastOnline)}
                                                </p>
                                            </div>
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

                        {props.scoreboard.totalPages > 1 && (
                            <div
                                className="flex flex-col gap-3 border-t border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs text-muted-foreground">
                                    {`Page ${props.scoreboard.page} of ${props.scoreboard.totalPages}`}
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => goToPage(props.scoreboard.page - 1)}
                                        disabled={!props.scoreboard.hasPreviousPage || isBusy}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => goToPage(props.scoreboard.page + 1)}
                                        disabled={!props.scoreboard.hasNextPage || isBusy}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
