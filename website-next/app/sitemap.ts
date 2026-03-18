import type {MetadataRoute} from "next";
import {absoluteUrl} from "@/lib/seo";
import {getAllPlayers} from "@/lib/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getStaticEntries(lastModified: Date): MetadataRoute.Sitemap {
    return [
        {
            url: absoluteUrl("/"),
            changeFrequency: "daily",
            priority: 1,
            lastModified,
        },
        {
            url: absoluteUrl("/guide"),
            changeFrequency: "weekly",
            priority: 0.8,
            lastModified,
        },
        {
            url: absoluteUrl("/scoreboard"),
            changeFrequency: "hourly",
            priority: 0.9,
            lastModified,
        },
        {
            url: absoluteUrl("/scoreboard/distribution"),
            changeFrequency: "hourly",
            priority: 0.8,
            lastModified,
        },
        {
            url: absoluteUrl("/players"),
            changeFrequency: "daily",
            priority: 0.8,
            lastModified,
        },
    ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const lastModified = new Date();
    const staticEntries = getStaticEntries(lastModified);

    try {
        const {data: players} = await getAllPlayers({
            throwOnError: true,
        });

        const playerEntries: MetadataRoute.Sitemap = players.map((player) => ({
            url: absoluteUrl(`/players/${encodeURIComponent(player.playerName)}`),
            changeFrequency: "daily",
            priority: 0.7,
            lastModified,
        }));

        return [...staticEntries, ...playerEntries];
    } catch {
        return staticEntries;
    }
}
