import {AppShell} from "@/components/app-shell";
import {getInitialServers} from "@/lib/initial-data";
import React from "react";

export const revalidate = 30;

export default async function SiteLayout({
                                             children,
                                         }: Readonly<{
    children: React.ReactNode;
}>) {
    const initialServers = await getInitialServers();

    return <AppShell initialServers={initialServers}>{children}</AppShell>;
}
