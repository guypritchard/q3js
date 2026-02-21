import type {Q3ResolvedServer} from "@/lib/q3.ts";

export const RECENT_SERVERS_KEY = "recentServers";
const MAX_RECENT_SERVERS = 3;

export type RecentServer = {
    id: string;
    name: string;
    host: string;
    proxyPort: number;
    mapname?: string;
    location?: string;
    updatedAt: number;
}

function isRecentServer(value: unknown): value is RecentServer {
    if (!value || typeof value !== "object") {
        return false;
    }

    const item = value as Partial<RecentServer>;
    return (
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        typeof item.host === "string" &&
        typeof item.proxyPort === "number" &&
        typeof item.updatedAt === "number"
    );
}

export function getRecentServers() {
    try {
        const raw = localStorage.getItem(RECENT_SERVERS_KEY);
        if (!raw) {
            return [] as RecentServer[];
        }

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [] as RecentServer[];
        }

        return parsed.filter(isRecentServer).slice(0, MAX_RECENT_SERVERS);
    } catch {
        return [] as RecentServer[];
    }
}

export function storeRecentServer(server: Q3ResolvedServer) {
    const nextServer: RecentServer = {
        id: server.id,
        name: server.sv_hostname,
        host: server.host,
        proxyPort: server.proxyPort,
        mapname: server.mapname,
        location: server.location,
        updatedAt: Date.now()
    };

    const previous = getRecentServers();
    const next = [nextServer, ...previous.filter((item) => item.id !== nextServer.id)].slice(0, MAX_RECENT_SERVERS);

    localStorage.setItem(RECENT_SERVERS_KEY, JSON.stringify(next));
    return next;
}

