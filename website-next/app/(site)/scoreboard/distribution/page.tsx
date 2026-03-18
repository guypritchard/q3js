import type {Metadata} from "next";
import {Suspense} from "react";
import {Card, CardContent} from "@/components/ui/card";
import {buildPageMetadata} from "@/lib/seo";
import {ScoreboardDistributionPageContent} from "@/components/scoreboard-distribution-page-content";

export const metadata: Metadata = buildPageMetadata({
    title: "Activity",
    description: "Reported Q3JS activity by hour or day across scoreboard periods.",
    path: "/scoreboard/distribution",
    keywords: [
        "Q3JS activity",
        "Quake 3 activity chart",
        "Q3JS kill chart",
        "Quake III stats chart",
    ],
});

function ScoreboardDistributionPageSkeleton() {
    return (
        <main className="container mx-auto px-4 py-12 md:py-16">
            <section className="mx-auto max-w-5xl space-y-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">Activity</h1>
                    <p className="text-sm text-muted-foreground md:text-base">
                        Break down reported scoreboard activity by hour or day and compare momentum across each window.
                    </p>
                </div>

                <Card className="border-border/60 bg-card/60">
                    <CardContent className="space-y-4 p-4">
                        <div className="h-10 w-full animate-pulse bg-muted"/>
                        <div className="h-80 w-full animate-pulse bg-muted"/>
                    </CardContent>
                </Card>
            </section>
        </main>
    );
}

type ScoreboardDistributionSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function ScoreboardDistributionRoute(props: {
    searchParams: ScoreboardDistributionSearchParams;
}) {
    return (
        <Suspense fallback={<ScoreboardDistributionPageSkeleton/>}>
            <ScoreboardDistributionPageContent searchParams={props.searchParams}/>
        </Suspense>
    );
}
