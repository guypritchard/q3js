"use client";

import Link from "next/link";
import {Badge} from "@/components/ui/badge.tsx";
import {SiGithub} from "react-icons/si";
import {useQuery} from "@tanstack/react-query";
import {getAllServersOptions} from "@/lib/client/@tanstack/react-query.gen.ts";

const HEADER_STATUS_STYLES = {
    offline: {
        badgeClassName: "border-destructive/40 text-destructive",
        dotClassName: "bg-destructive",
    },
    online: {
        badgeClassName: "border-primary/30 text-primary",
        dotClassName: "bg-primary animate-pulse",
    },
    pending: {
        badgeClassName: "border-primary/30 text-primary",
        dotClassName: "bg-primary animate-pulse",
    },
} as const;

function getHeaderStatus(isOffline: boolean, isPending: boolean) {
    if (isOffline) return "offline";
    if (isPending) return "pending";
    return "online";
}

export function Header() {

    const serversResponse = useQuery({
        ...getAllServersOptions()
    })

    const servers = serversResponse.data;

    const serverCount = servers?.length ?? 0;
    const isOffline = serversResponse.isError;
    const status = getHeaderStatus(isOffline, serversResponse.isPending);
    const statusLabel = {
        offline: "Master offline",
        pending: "Checking...",
        online: `${serverCount} servers live`,
    }[status];
    const statusStyles = HEADER_STATUS_STYLES[status];

    return <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
                <div>
                    <p className="text-xl font-bold tracking-tight text-foreground">Q3JS</p>
                    <p className="text-xs text-muted-foreground font-mono">v0.0.1</p>
                </div>
            </Link>

            <div className="flex gap-2 items-center">
                <Badge
                    variant="outline"
                    className={`h-6 flex gap-1.5 ${statusStyles.badgeClassName}`}
                >
                    <span className={`h-2 w-2 rounded-full ${statusStyles.dotClassName}`}/>
                    {statusLabel}
                </Badge>
                <Badge
                    asChild
                    variant="outline"
                    className="h-6 border-muted-foreground/30 text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
                >
                    <Link href="/guide">
                        <span className="sm:hidden">Guide</span>
                        <span className="hidden sm:inline">Run your server</span>
                    </Link>
                </Badge>
                <Badge
                    asChild
                    variant="outline"
                    className="h-6 border-muted-foreground/30 text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
                >
                    <Link href="/scoreboard">
                        <span className="sm:hidden">Scores</span>
                        <span className="hidden sm:inline">Global Scoreboard</span>
                    </Link>
                </Badge>
                <Badge
                    asChild
                    variant="outline"
                    className="h-6 gap-1.5 border-muted-foreground/30 text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
                >
                    <a
                        href="https://github.com/lklacar/q3js"
                        target="_blank"
                        rel="noreferrer"
                        aria-label="View Q3JS on GitHub"
                    >
                        <SiGithub className="w-3.5 h-3.5"/>
                        <span className="hidden md:inline">GitHub</span>
                    </a>
                </Badge>
                <Badge
                    asChild
                    variant="outline"
                    className="h-6 border-muted-foreground/30 text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
                >
                    <a href={"https://discord.gg/mKvM9su443"}>
                        Join Discord
                    </a>
                </Badge>
            </div>

        </div>
    </header>;
}
