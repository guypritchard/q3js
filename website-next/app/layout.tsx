import "./globals.css";
import type {Metadata} from "next";
import {AnalyticsTracker} from "@/components/analytics-tracker";
import {Suspense} from "react";

export const metadata: Metadata = {
    metadataBase: new URL("https://q3js.com"),
    title: {
        default: "Q3JS",
        template: "%s",
    },
    description: "Play Quake III Arena in your browser",
    openGraph: {
        images: ["/og-cover.jpg"],
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <body className="antialiased">
        <Suspense fallback={null}>
            <AnalyticsTracker/>
        </Suspense>
        <div className="font-mono">{children}</div>
        </body>
        </html>
    );
}
