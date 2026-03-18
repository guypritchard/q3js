"use client";

import Link from "next/link";
import {useTransition} from "react";
import {useRouter} from "next/navigation";
import {Button} from "@/components/ui/button.tsx";
import {Card, CardContent} from "@/components/ui/card.tsx";
import {KillDistributionChart} from "@/components/kill-distribution-chart.tsx";
import {ScoreboardPeriodToggle} from "@/components/scoreboard-period-toggle.tsx";
import {
    buildScoreboardDistributionHref,
    buildScoreboardHref,
    SCOREBOARD_PERIOD_LABELS,
} from "@/lib/scoreboard.ts";
import {KillDistributionPointResponse, ScoreboardPeriod} from "@/lib/client";
import {ScoreboardToolbar} from "@/components/scoreboard-toolbar.tsx";

export function ScoreboardDistributionClient(props: {
    data: KillDistributionPointResponse[];
    period: ScoreboardPeriod;
}) {
    const router = useRouter();
    const [isNavigating, startNavigationTransition] = useTransition();
    const [isRefreshing, startRefreshTransition] = useTransition();
    const isBusy = isNavigating || isRefreshing;
    const periodLabel = SCOREBOARD_PERIOD_LABELS[props.period];

    function selectPeriod(nextPeriod: ScoreboardPeriod) {
        if (nextPeriod === props.period) {
            return;
        }

        startNavigationTransition(() => {
            router.push(buildScoreboardDistributionHref(nextPeriod), {scroll: false});
        });
    }

    function refreshDistribution() {
        startRefreshTransition(() => {
            router.refresh();
        });
    }

    return (
        <Card className="border-border/60 bg-card/60">
            <CardContent className="p-0">
                <ScoreboardToolbar
                    description={
                        <>
                            <p className="text-sm text-muted-foreground">
                                Explore how reported match activity moves across the {periodLabel.toLowerCase()} window.
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Switch periods to compare hourly or daily spikes across the global scoreboard feed.
                            </p>
                        </>
                    }
                    actions={
                        <>
                            <Button asChild variant="outline" size="sm">
                                <Link href={buildScoreboardHref(props.period)}>
                                    Back to Scoreboard
                                </Link>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={refreshDistribution}
                                disabled={isBusy}
                            >
                                {isRefreshing ? "Refreshing..." : "Refresh"}
                            </Button>
                        </>
                    }
                    periodControls={<ScoreboardPeriodToggle period={props.period} onChange={selectPeriod}/>}
                />

                <KillDistributionChart
                    bucketUnit={props.period === "DAILY" ? "hour" : "day"}
                    data={props.data}
                    isError={false}
                    isPending={false}
                    periodLabel={periodLabel}
                />
            </CardContent>
        </Card>
    );
}
