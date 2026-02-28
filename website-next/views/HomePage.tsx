import {ServerPicker} from "@/components/server-picker"
import {Hero} from "@/components/hero.tsx";
import {ScoreboardPreview} from "@/components/scoreboard-preview.tsx";
import {Suspense} from "react";
import {getInitialScoreboard, getInitialServers} from "@/lib/initial-data";
import ServerPickerSkeleton from "@/components/server-picker-skeleton";
import {Card, CardContent} from "@/components/ui/card";
import {JsonLd} from "@/components/seo/json-ld";
import {absoluteUrl, siteConfig} from "@/lib/seo";

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

const homeStructuredData = [
    {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: siteConfig.name,
        url: siteConfig.url,
        description: siteConfig.description,
        inLanguage: "en-US",
        potentialAction: {
            "@type": "ViewAction",
            name: "Browse live Quake III Arena servers",
            target: absoluteUrl("/#server-browser"),
        },
    },
    {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: siteConfig.name,
        applicationCategory: "GameApplication",
        operatingSystem: "Web Browser",
        description: siteConfig.description,
        url: siteConfig.url,
        image: absoluteUrl(siteConfig.ogImage),
        genre: "First-person shooter",
        offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
        },
    },
];

export default function HomePage() {
    return (
        <main>
            <JsonLd data={homeStructuredData}/>
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
