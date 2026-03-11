import {ScoreboardClient} from "@/components/scoreboard-client";
import type {ScoreboardEntry} from "@/lib/scoreboard";
import {JsonLd} from "@/components/seo/json-ld";
import {absoluteUrl, siteConfig} from "@/lib/seo";

const scoreboardStructuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Global Scoreboard",
    description: "Live Q3JS scoreboard with daily, weekly, monthly, and all-time kill leaders.",
    url: absoluteUrl("/scoreboard"),
    isPartOf: {
        "@type": "WebSite",
        name: siteConfig.name,
        url: siteConfig.url,
    },
    inLanguage: "en-US",
};

export default function ScoreboardPage(props: { initialScoreboard: ScoreboardEntry[] }) {
    return (
        <main className="container mx-auto px-4 py-12 md:py-16">
            <JsonLd data={scoreboardStructuredData}/>
            <section className="mx-auto max-w-5xl space-y-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">Global Scoreboard</h1>
                    <p className="text-sm text-muted-foreground md:text-base">
                        Switch between daily, weekly, monthly, and all-time kills across reported servers.
                    </p>
                </div>

                <ScoreboardClient initialScoreboard={props.initialScoreboard}/>
            </section>
        </main>
    );
}
