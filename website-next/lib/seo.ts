import type {Metadata} from "next";

export const siteConfig = {
    name: "Q3JS",
    url: "https://q3js.com",
    defaultTitle: "Play Quake III Arena in Your Browser",
    description:
        "Play Quake III Arena instantly with no install. Q3JS brings the classic arena shooter to the web with WebAssembly and online servers.",
    ogImage: "/og-cover.jpg",
    locale: "en_US",
    keywords: [
        "Quake 3",
        "Quake III Arena",
        "browser game",
        "webassembly game",
        "FPS",
        "arena shooter",
        "Q3JS",
        "multiplayer browser game",
        "ioquake3",
        "retro FPS",
    ],
};

export const siteOgImage = {
    url: siteConfig.ogImage,
    width: 1200,
    height: 630,
    alt: "Q3JS - Play Quake III Arena in your browser",
} as const;

export function absoluteUrl(path: string) {
    if (path === "/") {
        return siteConfig.url;
    }

    return `${siteConfig.url}${path}`;
}

export function buildPageMetadata(input: {
    title: string;
    description: string;
    path: string;
    keywords?: string[];
    robots?: Metadata["robots"];
}): Metadata {
    const canonicalUrl = absoluteUrl(input.path);
    const pageTitle = `${input.title} | ${siteConfig.name}`;
    const keywords = input.keywords ?? siteConfig.keywords;

    return {
        title: input.title,
        description: input.description,
        keywords,
        alternates: {
            canonical: input.path,
        },
        openGraph: {
            title: pageTitle,
            description: input.description,
            url: canonicalUrl,
            siteName: siteConfig.name,
            locale: siteConfig.locale,
            type: "website",
            images: [siteOgImage],
        },
        twitter: {
            card: "summary_large_image",
            title: pageTitle,
            description: input.description,
            images: [siteConfig.ogImage],
        },
        robots: input.robots,
    };
}
