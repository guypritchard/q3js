import {env} from "@/env.ts";

export interface ScoreboardEntry {
    playerName: string;
    kills: number;
}

export async function fetchScoreboard() {
    const response = await fetch(`${env.VITE_MASTER_SERVER_URL}/api/events/scoreboard`);

    if (!response.ok) {
        throw new Error(`Failed to load scoreboard (${response.status})`);
    }

    return response.json() as Promise<ScoreboardEntry[]>;
}
