import {env} from "@/env.ts";

export type User = {
    score: number
    ping: number
    name: string
}

export interface Server {
    // existing fields
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

    // connection / identity (if you want them on the type)
    host: string
    port: number

    // extra getstatus rule fields from your sample
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

    // parsed players
    users: User[]
}

export const wsProtocol = location.protocol === "https:" ? "wss:" : "ws:"

export const SERVER_LIST = [
    {
        location: "EU",
        proxy: `${wsProtocol}//${env.VITE_PROXY_URL}`,
        host: "88.99.66.204",
        port: 27960,
    },
]

export const GAME_TYPES: Record<number, string> = {
    0: "FFA",
    1: "Duel",
    2: "Single Player",
    3: "Team DM",
    4: "CTF",
}

export async function q3GetServers(proxy: string): Promise<Array<{ host: string; port: number }>> {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(`${proxy}?host=master.q3js.com&port=27950`)
        ws.binaryType = "arraybuffer"

        const enc = new TextEncoder()
        const dec = new TextDecoder()

        const concat = (a: Uint8Array, b: Uint8Array) => {
            const out = new Uint8Array(a.length + b.length)
            out.set(a, 0)
            out.set(b, a.length)
            return out
        }

        let buffer = new Uint8Array(0)

        const timeout = setTimeout(() => {
            try {
                ws.close()
            } catch {
            }
            try {
                const text = dec.decode(buffer)
                resolve(parseMasterServers(text))
            } catch (e) {
                reject(e)
            }
        }, 5000)

        ws.addEventListener("open", () => {
            const prefix = new Uint8Array([0xff, 0xff, 0xff, 0xff])
            const cmd = enc.encode("getservers xxx\n") // matches your getstatus style
            ws.send(concat(prefix, cmd))
        })

        ws.addEventListener("message", async (ev: MessageEvent) => {
            clearTimeout(timeout)

            const chunk =
                ev.data instanceof ArrayBuffer
                    ? new Uint8Array(ev.data)
                    : ev.data instanceof Blob
                        ? new Uint8Array(await ev.data.arrayBuffer())
                        : enc.encode(String(ev.data))

            buffer = concat(buffer, chunk)

            // master response is tiny; just parse immediately
            try {
                const text = dec.decode(buffer)
                const servers = parseMasterServers(text)
                try {
                    ws.close()
                } catch {
                }
                resolve(servers)
            } catch (e) {
                try {
                    ws.close()
                } catch {
                }
                reject(e)
            }
        })

        ws.addEventListener("error", e => {
            clearTimeout(timeout)
            try {
                ws.close()
            } catch {
            }
            reject(e)
        })
    })
}

function parseMasterServers(text: string): Array<{ host: string; port: number }> {
    // text like: "����servers\n10.0.0.2:27960\n10.0.0.3:27960\n"
    const TAG = "servers\n"
    const idx = text.indexOf(TAG)
    if (idx === -1) return []

    const after = text.slice(idx + TAG.length)
    const lines = after.split("\n").map(l => l.trim()).filter(Boolean)

    const out: Array<{ host: string; port: number }> = []

    for (const line of lines) {
        const [host, portStr] = line.split(":")
        if (!host || !portStr) continue
        const port = parseInt(portStr, 10)
        if (!Number.isFinite(port)) continue
        out.push({host, port})
    }

    return out
}


export async function q3GetInfo(server: {
    location?: string
    proxy?: string
    host: string
    port: number
}): Promise<Server | null> {

    return new Promise((resolve, reject) => {
        const ws = new WebSocket(`${server.proxy}?host=${server.host}&port=${server.port}`)
        ws.binaryType = "arraybuffer"

        const timeout = setTimeout(() => {
            try {
                ws.close()
            } catch {
            }
            debugger
            reject(new Error("getstatus timeout"))
        }, 5000)

        const enc = new TextEncoder()
        const dec = new TextDecoder()

        const concat = (a: Uint8Array, b: Uint8Array) => {
            const out = new Uint8Array(a.length + b.length)
            out.set(a, 0)
            out.set(b, a.length)
            return out
        }

        let start = 0

        ws.addEventListener("open", () => {
            const prefix = new Uint8Array([0xff, 0xff, 0xff, 0xff])
            const cmd = enc.encode("getstatus xxx\n")
            start = performance.now()
            ws.send(concat(prefix, cmd))
        })

        ws.addEventListener("message", async (ev: MessageEvent) => {
            clearTimeout(timeout)
            const ping = Math.round(performance.now() - start)
            try {
                ws.close()
            } catch {
            }

            const ab = ev.data instanceof ArrayBuffer
                ? ev.data
                : ev.data instanceof Blob
                    ? await ev.data.arrayBuffer()
                    : enc.encode(String(ev.data)).buffer

            const text = dec.decode(ab)

            const TAG = "statusResponse\n"
            const idx = text.indexOf(TAG)
            if (idx === -1) return resolve(null)

            const after = text.slice(idx + TAG.length)
            const lines = after.split("\n")

            if (!lines.length) return resolve(null)

            const rulesLine = lines[0].trim()
            const parts = rulesLine.split("\\")
            const kv: Record<string, string> = {}

            for (let i = 1; i + 1 < parts.length; i += 2) {
                kv[parts[i].toLowerCase()] = parts[i + 1] ?? ""
            }

            const toInt = (s?: string, d = 0) => {
                const n = parseInt(s ?? "", 10)
                return Number.isFinite(n) ? n : d
            }

            const stripColors = (s: string) => s.replace(/\^\d/g, "")

            const playerLines = lines.slice(1).filter(l => l.trim().length > 0)
            const users: User[] = []

            for (const line of playerLines) {
                const m = line.match(/^\s*(-?\d+)\s+(\d+)\s+"(.*)"\s*$/)
                if (!m) continue
                users.push({
                    score: parseInt(m[1], 10),
                    ping: parseInt(m[2], 10),
                    name: stripColors(m[3])
                })
            }

            const sv: Server = {
                id: `${server.host}:${server.port}`,
                sv_hostname: stripColors(kv["sv_hostname"] ?? kv["hostname"] ?? "Unnamed Server"),
                mapname: kv["mapname"] ?? "unknown",
                g_gametype: toInt(kv["g_gametype"] ?? kv["gametype"] ?? "0"),
                fraglimit: toInt(kv["fraglimit"]),
                timelimit: toInt(kv["timelimit"]),
                sv_maxclients: toInt(kv["sv_maxclients"]),
                g_needpass: toInt(kv["g_needpass"]),
                capturelimit: toInt(kv["capturelimit"]),
                version: kv["version"] ?? kv["com_gamename"] ?? kv["gamename"] ?? "",
                location: server.location,
                players: users.length,
                ping,

                host: server.host,
                port: server.port,

                challenge: kv["challenge"],
                sv_maxPing: toInt(kv["sv_maxping"]),
                sv_minPing: toInt(kv["sv_minping"]),
                com_gamename: kv["com_gamename"],
                com_protocol: toInt(kv["com_protocol"]),
                dmflags: toInt(kv["dmflags"]),
                sv_privateClients: toInt(kv["sv_privateclients"]),
                sv_minRate: toInt(kv["sv_minrate"]),
                sv_maxRate: toInt(kv["sv_maxrate"]),
                sv_dlRate: toInt(kv["sv_dlrate"]),
                sv_floodProtect: toInt(kv["sv_floodprotect"]),
                sv_allowDownload: toInt(kv["sv_allowdownload"]),
                bot_minplayers: toInt(kv["bot_minplayers"]),
                gamename: kv["gamename"],
                g_maxGameClients: toInt(kv["g_maxgameclients"]),

                users
            }

            resolve(sv)
        })

        ws.addEventListener("error", e => {
            clearTimeout(timeout)
            try {
                ws.close()
            } catch {
            }
            reject(e)
        })
    })
}