import type {MetadataRoute} from "next";

const SITE_URL = "https://q3js.com";

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: `${SITE_URL}/`,
            changeFrequency: "daily",
            priority: 1,
        },
        {
            url: `${SITE_URL}/guide`,
            changeFrequency: "weekly",
            priority: 0.8,
        },
        {
            url: `${SITE_URL}/scoreboard`,
            changeFrequency: "always",
            priority: 0.9,
        },
    ];
}
