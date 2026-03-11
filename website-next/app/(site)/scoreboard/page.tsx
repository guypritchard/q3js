import type {Metadata} from "next";
import {Suspense} from "react";
import {ScoreboardPageContent} from "@/components/scoreboard-page-content";
import {Card, CardContent} from "@/components/ui/card";
import {buildPageMetadata} from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
    title: "Global Scoreboard",
    description: "Live Q3JS scoreboard with daily, weekly, monthly, and all-time kill leaders.",
    path: "/scoreboard",
    keywords: [
        "Q3JS scoreboard",
        "Quake 3 leaderboard",
        "frag leaderboard",
        "Q3JS stats",
        "Quake III player stats",
    ],
});

function ScoreboardPageSkeleton() {
    return (
        <main className="container mx-auto px-4 py-12 md:py-16">
            <section className="mx-auto max-w-5xl space-y-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">Global Scoreboard</h1>
                    <p className="text-sm text-muted-foreground md:text-base">
                        Switch between daily, weekly, monthly, and all-time kills across reported servers.
                    </p>
                </div>

                <Card className="border-border/60 bg-card/60">
                    <CardContent className="p-0">
                        <div className="divide-y divide-border/50">
                            {Array.from({length: 8}).map((_, idx) => (
                                <div key={idx} className="grid grid-cols-[92px_1fr_110px] items-center gap-3 px-4 py-3">
                                    <div className="h-5 w-10 animate-pulse bg-muted"/>
                                    <div className="h-5 w-2/5 animate-pulse bg-muted"/>
                                    <div className="ml-auto h-5 w-14 animate-pulse bg-muted"/>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </section>
        </main>
    );
}

export default function ScoreboardRoute() {
    return (
        <Suspense fallback={<ScoreboardPageSkeleton/>}>
            <ScoreboardPageContent/>
        </Suspense>
    );
}
