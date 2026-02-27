import {ServerPicker} from "@/components/server-picker"
import {Hero} from "@/components/hero.tsx";
import {ScoreboardPreview} from "@/components/scoreboard-preview.tsx";
import {Suspense} from "react";
import {getInitialScoreboard, getInitialServers} from "@/lib/initial-data";
import ServerPickerSkeleton from "@/components/server-picker-skeleton";
import {Card, CardContent} from "@/components/ui/card";

async function HomeScoreboardSection() {
    const initialScoreboard = await getInitialScoreboard();
    return <ScoreboardPreview initialScoreboard={initialScoreboard}/>;
}

async function HomeServerSection() {
    const initialServers = await getInitialServers();
    return <ServerPicker initialServers={initialServers}/>;
}

function ScoreboardPreviewSkeleton() {
    return (
        <section className="container mx-auto px-4 pb-8">
            <div className="mx-auto max-w-5xl">
                <Card className="border-border/60 bg-card/60">
                    <CardContent className="p-4 md:p-6">
                        <div className="divide-y divide-border/40">
                            {Array.from({length: 5}).map((_, idx) => (
                                <div key={idx} className="grid grid-cols-[56px_1fr_100px] items-center gap-3 px-2 py-3">
                                    <div className="h-4 w-8 animate-pulse bg-muted"/>
                                    <div className="h-4 w-2/5 animate-pulse bg-muted"/>
                                    <div className="ml-auto h-4 w-12 animate-pulse bg-muted"/>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </section>
    );
}

export default function HomePage() {
    return (
        <main>
            <Hero/>
            <Suspense fallback={<ScoreboardPreviewSkeleton/>}>
                <HomeScoreboardSection/>
            </Suspense>
            <Suspense fallback={<ServerPickerSkeleton/>}>
                <HomeServerSection/>
            </Suspense>
        </main>
    )
}
