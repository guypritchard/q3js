import "./globals.css";
import type {Metadata, Viewport} from "next";
import {AnalyticsTracker} from "@/components/analytics-tracker";
import {Suspense} from "react";
import {siteConfig, siteOgImage} from "@/lib/seo";

export const metadata: Metadata = {
    metadataBase: new URL(siteConfig.url),
    title: {
        default: siteConfig.defaultTitle,
        template: `%s | ${siteConfig.name}`,
    },
    description: siteConfig.description,
    applicationName: siteConfig.name,
    keywords: siteConfig.keywords,
    category: "Gaming",
    creator: siteConfig.name,
    publisher: siteConfig.name,
    formatDetection: {
        telephone: false,
        address: false,
        email: false,
    },
    manifest: "/manifest.json",
    icons: {
        icon: "/favicon.ico",
        apple: "/apple-touch-icon.png",
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
    openGraph: {
        type: "website",
        locale: siteConfig.locale,
        url: siteConfig.url,
        siteName: siteConfig.name,
        title: `${siteConfig.defaultTitle} | ${siteConfig.name}`,
        description: siteConfig.description,
        images: [siteOgImage],
    },
    twitter: {
        card: "summary_large_image",
        title: `${siteConfig.defaultTitle} | ${siteConfig.name}`,
        description: siteConfig.description,
        images: [siteConfig.ogImage],
    },
};

export const viewport: Viewport = {
    themeColor: "#101010",
    colorScheme: "dark",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en-US">
        <body className="antialiased">
        <Suspense fallback={null}>
            <AnalyticsTracker/>
        </Suspense>
        <div className="font-mono">{children}</div>
        </body>
        </html>
    );
}
