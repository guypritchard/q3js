"use client";

import {useEffect, useState} from "react";
import {Card} from "@/components/ui/card";
import {Progress} from "@/components/ui/progress";
import {makeRafUpdater, type Prog} from "@/lib/fs.ts";
import {useFullscreenOnF11} from "@/hooks/use-fullscreen.ts";
import startGame from "@/game";
import {useSearchParams} from "next/navigation";
import {toInt} from "@/lib/utils.ts";

const STAGE_LABELS: Record<Prog["stage"], string> = {
    initializing: "Initializing",
    downloading: "Downloading assets",
    launching: "Launching",
    ready: "Ready",
};

const STAGE_TIPS: Record<Prog["stage"], string> = {
    initializing: "Tip: Press F11 to toggle fullscreen.",
    downloading: "Tip: Assets are cached after first load.",
    launching: "Tip: If sound is muted, click the page once.",
    ready: "Tip: If sound is muted, click the page once.",
};

export default function GamePage() {
    useFullscreenOnF11();

    const [prog, setProg] = useState<Prog>({
        received: 0,
        total: 0,
        pct: 0,
        current: "",
        stage: "initializing"
    });
    const [rafUpdate] = useState(() => makeRafUpdater(setProg));

    const searchParams = useSearchParams();
    const host = searchParams?.get("host") ?? "";
    const proxyPort = toInt(searchParams?.get("proxyPort") ?? undefined, 0);
    const name = searchParams?.get("name") ?? "Player";
    const fsGame = searchParams?.get("fs_game") ?? "baseq3";

    useEffect(() => {
        if (!host || !proxyPort) {
            return;
        }
        startGame({
            name,
            host,
            proxyPort,
            rafUpdate,
            fsGame
        })
    }, [host, name, proxyPort, rafUpdate]);

    const stageLabel = STAGE_LABELS[prog.stage];
    const tip = STAGE_TIPS[prog.stage];
    const currentLabel = prog.current
        ? {
            downloading: `Downloading: ${prog.current}`,
            initializing: prog.current,
            launching: prog.current,
            ready: prog.current,
        }[prog.stage]
        : "Preparing downloads";

    return (
        <main className="relative w-full h-full min-h-screen">
            <h1 className="sr-only">Play Quake III Arena in your browser</h1>
            <canvas id="canvas" className="w-full h-full"/>
            {prog.stage !== "ready" && (
                <Card
                    className="absolute bottom-4 left-4 right-4 p-4 bg-background/80 backdrop-blur border border-border">
                    <div className="text-sm font-semibold mb-1">
                        {stageLabel}
                    </div>
                    <div className="text-xs text-muted-foreground mb-2 font-mono">
                        {currentLabel}
                    </div>
                    <Progress value={prog.pct} className="h-2 bg-secondary"/>
                    <div className="text-xs text-muted-foreground mt-2 font-mono">
                        {prog.total
                            ? `${(prog.received / (1024 * 1024)).toFixed(1)} MB / ${(prog.total / (1024 * 1024)).toFixed(1)} MB`
                            : `${prog.pct}%`}
                    </div>
                    {prog.etaSeconds !== undefined && prog.stage === "downloading" && (
                        <div className="text-xs text-muted-foreground mt-1 font-mono">
                            ETA: {prog.etaSeconds}s
                        </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-2">
                        {tip}
                    </div>
                </Card>
            )}
        </main>
    );
}
