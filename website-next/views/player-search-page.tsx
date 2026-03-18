import Link from "next/link";
import {Badge} from "@/components/ui/badge.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {JsonLd} from "@/components/seo/json-ld";
import {PlayerSearchForm} from "@/components/player-search-form";
import {Q3ColoredText} from "@/components/q3-colored-text.tsx";
import {absoluteUrl, siteConfig} from "@/lib/seo";
import {PlayerResponse} from "@/lib/client";
import {stripQ3Colors} from "@/lib/utils.ts";

const playerSearchStructuredData = {
    "@context": "https://schema.org",
    "@type": "SearchResultsPage",
    name: "Player Search",
    description: "Search Q3JS player profiles by name, including names that use Quake color codes.",
    url: absoluteUrl("/players"),
    isPartOf: {
        "@type": "WebSite",
        name: siteConfig.name,
        url: siteConfig.url,
    },
    inLanguage: "en-US",
};

function formatResultLabel(count: number) {
    return `${count} ${count === 1 ? "player" : "players"} found`;
}

export default function PlayerSearchPage(props: {
    query: string;
    players: PlayerResponse[];
}) {
    const hasQuery = props.query.length > 0;

    return (
        <main className="container mx-auto px-4 py-12 md:py-16">
            <JsonLd data={playerSearchStructuredData}/>
            <section className="mx-auto max-w-5xl space-y-6">
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-primary/30 text-primary">
                            Player Search
                        </Badge>
                        {hasQuery && (
                            <Badge variant="outline" className="border-border/60 text-muted-foreground">
                                {formatResultLabel(props.players.length)}
                            </Badge>
                        )}
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-4xl font-bold tracking-tight">Find a Frag Profile</h1>
                        <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
                            Search for any reported player name and jump straight to their stats page. Color codes are
                            ignored, so typing plain text still finds styled Quake handles.
                        </p>
                    </div>
                </div>

                <Card className="border-border/60 bg-card/60">
                    <CardContent className="p-4">
                        <PlayerSearchForm initialQuery={props.query} autoFocus buttonLabel="Search players"/>
                    </CardContent>
                </Card>

                {!hasQuery && (
                    <Card className="border-border/60 bg-card/60">
                        <CardContent className="space-y-3 py-10 text-center">
                            <p className="text-lg font-semibold">Start with a player name.</p>
                            <p className="text-sm text-muted-foreground">
                                Try a full handle or just part of it, like <span className="font-mono">ranger</span> or{" "}
                                <span className="font-mono">visor</span>.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {hasQuery && props.players.length === 0 && (
                    <Card className="border-border/60 bg-card/60">
                        <CardContent className="space-y-3 py-10 text-center">
                            <p className="text-lg font-semibold">No players matched &ldquo;{props.query}&rdquo;.</p>
                            <p className="text-sm text-muted-foreground">
                                Try a shorter fragment or remove any special formatting from the name.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {props.players.length > 0 && (
                    <div className="grid gap-4">
                        {props.players.map((player) => {
                            const plainName = stripQ3Colors(player.playerName);
                            const showPlainName = plainName !== player.playerName;
                            const playerHref = `/players/${encodeURIComponent(player.playerName)}`;

                            return (
                                <Card key={player.playerName} className="border-border/60 bg-card/60">
                                    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0 space-y-1">
                                            <CardTitle className="truncate text-2xl">
                                                <Q3ColoredText text={player.playerName}/>
                                            </CardTitle>
                                            {showPlainName && (
                                                <p className="truncate text-sm text-muted-foreground">{plainName}</p>
                                            )}
                                        </div>
                                        <Button asChild variant="outline">
                                            <Link href={playerHref}>Open profile</Link>
                                        </Button>
                                    </CardHeader>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </section>
        </main>
    );
}
