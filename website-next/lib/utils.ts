import {type ClassValue, clsx} from 'clsx'
import {twMerge} from 'tailwind-merge'
import {ServerResponse} from "@/lib/client";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

const PING_COLOR_BY_RANGE = {
    high: "text-muted-foreground",
    low: "text-primary",
    medium: "text-accent",
    unknown: "text-muted-foreground",
} as const;

function getPingRange(ping: number | undefined) {
    if (!ping) return "unknown";
    if (ping < 50) return "low";
    if (ping < 100) return "medium";
    return "high";
}

export function getPingColor(ping: number | undefined) {
    return PING_COLOR_BY_RANGE[getPingRange(ping)]
}

function getGameLimitType(server: ServerResponse) {
    const s = server.info;
    if (s.g_gametype === 4 && (s.capturelimit ?? 0) > 0) return "capture";
    if (s.fraglimit > 0) return "frag";
    if (s.timelimit > 0) return "time";
    return "none";
}

export function getGameLimits(server: ServerResponse) {
    const s = server.info;

    return {
        capture: `${s.capturelimit} caps`,
        frag: `${s.fraglimit} frags`,
        time: `${s.timelimit}min`,
        none: "No limit",
    }[getGameLimitType(server)];
}

export function getPercentage(p: number, m: number) {
    return (p / m) * 100;
}


export function stripQ3Colors(s: string) {
    const Q3_COLOR_CODE_REGEX = /\^\d/g
    return s.replace(Q3_COLOR_CODE_REGEX, "");
}

export function toInt(s?: string, d = 0): number {
    const n = parseInt(s ?? "", 10)
    return Number.isFinite(n) ? n : d
}

export function getWsProtocol() {
    return location.protocol === "https:" ? "wss:" : "ws:";
}
