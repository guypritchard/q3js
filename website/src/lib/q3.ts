export type User = {
    score: number
    ping: number
    name: string
}

export interface Q3ResolvedServer {
    id: string
    sv_hostname: string
    mapname: string
    g_gametype: number
    fraglimit: number
    timelimit: number
    sv_maxclients: number
    g_needpass: number
    capturelimit: number
    version: string
    location?: string
    players: number
    ping?: number
    host: string
    port: number
    challenge?: string
    sv_maxPing?: number
    sv_minPing?: number
    com_gamename?: string
    com_protocol?: number
    dmflags?: number
    sv_privateClients?: number
    sv_minRate?: number
    sv_maxRate?: number
    sv_dlRate?: number
    sv_floodProtect?: number
    sv_allowDownload?: number
    bot_minplayers?: number
    gamename?: string
    g_maxGameClients?: number
    users: User[]
    proxyPort: number
}

export type Q3ServerTarget = {
    host: string
    proxyPort: number
    targetPort: number
}

export const GAME_TYPES: Record<number, string> = {
    0: "FFA",
    1: "Duel",
    2: "Single Player",
    3: "Team DM",
    4: "CTF",
}


export async function q3GetInfo(server: Q3ServerTarget): Promise<Q3ResolvedServer | null> {
    const protocol = location.protocol === "https:" ? "https:" : "http:"
    const infoUrl = `${protocol}//${server.host}:${server.proxyPort}/info`
    const res = await fetch(infoUrl)

    if (!res.ok) {
        throw new Error(`Failed to fetch server info: ${res.status}`)
    }

    const payload = await res.json() as Partial<Q3ResolvedServer> | null
    if (!payload || typeof payload !== "object") {
        return null
    }

    const users = Array.isArray(payload.users) ? payload.users : []

    return {
        ...payload,
        id: typeof payload.id === "string" ? payload.id : `${server.host}:${server.targetPort}`,
        host: server.host,
        proxyPort: server.proxyPort,
        port: typeof payload.port === "number" ? payload.port : server.targetPort,
        players: typeof payload.players === "number" ? payload.players : users.length,
        users
    } as Q3ResolvedServer
}
