import type {MetadataRoute} from "next";
import {absoluteUrl} from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date();

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
    ];
}
