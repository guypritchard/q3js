import {env} from "@/env.ts";
import type {Q3ResolvedServer} from "@/lib/q3.ts";

export async function fetchServers() {
    const response = await fetch(`${env.VITE_MASTER_SERVER_URL}/api/servers`);

    if (!response.ok) {
        throw new Error(`Failed to load servers (${response.status})`);
    }

    return response.json() as Promise<Q3ResolvedServer[]>;
}

