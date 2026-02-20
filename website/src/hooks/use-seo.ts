import {useEffect} from "react";

const SITE_NAME = "Q3JS";
const SITE_URL = "https://q3js.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-cover.jpg`;

interface SeoOptions {
    title: string;
    description: string;
    path: string;
    image?: string;
    noindex?: boolean;
}

function upsertMeta(attr: "name" | "property", key: string, content: string) {
    let meta = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;

    if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attr, key);
        document.head.append(meta);
    }

    meta.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
    let link = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;

    if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", rel);
        document.head.append(link);
    }

    link.setAttribute("href", href);
}

export function useSeo({title, description, path, image, noindex}: SeoOptions) {
    useEffect(() => {
        const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
        const canonicalUrl = new URL(path, SITE_URL).toString();
        const ogImage = image ?? DEFAULT_OG_IMAGE;
        const robots = noindex ? "noindex,follow,max-image-preview:large" : "index,follow,max-image-preview:large";

        document.title = fullTitle;

        upsertMeta("name", "description", description);
        upsertMeta("name", "robots", robots);

        upsertMeta("property", "og:type", "website");
        upsertMeta("property", "og:site_name", SITE_NAME);
        upsertMeta("property", "og:title", fullTitle);
        upsertMeta("property", "og:description", description);
        upsertMeta("property", "og:url", canonicalUrl);
        upsertMeta("property", "og:image", ogImage);

        upsertMeta("name", "twitter:card", "summary_large_image");
        upsertMeta("name", "twitter:title", fullTitle);
        upsertMeta("name", "twitter:description", description);
        upsertMeta("name", "twitter:image", ogImage);

        upsertLink("canonical", canonicalUrl);
    }, [description, image, noindex, path, title]);
}
