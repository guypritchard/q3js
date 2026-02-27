import "./globals.css";
import type {Metadata} from "next";
import Providers from "./providers";
import {AnalyticsTracker} from "@/components/analytics-tracker";
import {Suspense} from "react";

export const metadata: Metadata = {
    title: "Q3JS",
    description: "Play Quake III Arena in your browser",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <body className="antialiased">
        <Providers>
            <Suspense fallback={null}>
                <AnalyticsTracker/>
            </Suspense>
            <div className="font-mono">{children}</div>
        </Providers>
        </body>
        </html>
    );
}
