import {env} from "@/env.ts";
import type {ScoreboardPeriod} from "@/lib/scoreboard.ts";

export interface PlayerFavoriteMap {
    mapName: string;
    kills: number;
}

export interface PlayerFavoriteWeapon {
    meansOfDeath: number;
    weaponName: string;
    kills: number;
}

export interface PlayerVersusStat {
    playerName: string;
    kills: number;
}

export interface PlayerWeaponBreakdown {
    meansOfDeath: number;
    weaponName: string;
    kills: number;
}

export interface PlayerStats {
    playerName: string;
    period: ScoreboardPeriod;
    rank: number | null;
    kills: number;
    deaths: number;
    killDeathRatio: number | null;
    favoriteMap: PlayerFavoriteMap | null;
    favoriteWeapon: PlayerFavoriteWeapon | null;
    weaponBreakdown: PlayerWeaponBreakdown[];
    topVictims: PlayerVersusStat[];
    topNemeses: PlayerVersusStat[];
}

export async function fetchPlayerStats(playerName: string, period: ScoreboardPeriod = "all-time") {
    const url = new URL(`/api/events/players/${encodeURIComponent(playerName)}`, env.NEXT_PUBLIC_MASTER_SERVER_URL);
    url.searchParams.set("period", period);

    const response = await fetch(url, {
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`Failed to load player stats (${response.status})`);
    }

    return response.json() as Promise<PlayerStats>;
}
