import {JsonLd} from "@/components/seo/json-ld";
import {absoluteUrl, siteConfig} from "@/lib/seo";
import {KillDistributionPointResponse, ScoreboardPeriod} from "@/lib/client";
import {ScoreboardDistributionClient} from "@/components/scoreboard-distribution-client";

const distributionStructuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Activity",
    description: "Reported Q3JS activity over time across scoreboard periods.",
    url: absoluteUrl("/scoreboard/distribution"),
    isPartOf: {
        "@type": "WebSite",
        name: siteConfig.name,
        url: siteConfig.url,
    },
    inLanguage: "en-US",
};

export default function ScoreboardDistributionPage(props: {
    data: KillDistributionPointResponse[];
    period: ScoreboardPeriod;
}) {
    return (
        <main className="container mx-auto px-4 py-12 md:py-16">
            <JsonLd data={distributionStructuredData}/>
            <section className="mx-auto max-w-5xl space-y-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">Activity</h1>
                    <p className="text-sm text-muted-foreground md:text-base">
                        Break down reported scoreboard activity by hour or day and compare momentum across each window.
                    </p>
                </div>

                <ScoreboardDistributionClient data={props.data} period={props.period}/>
            </section>
        </main>
    );
}
