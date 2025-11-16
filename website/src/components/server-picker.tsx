"use client"
import {useEffect, useRef, useState} from "react"
import {useLocalStorage} from "@uidotdev/usehooks"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import {Badge} from "@/components/ui/badge"
import {Input} from "@/components/ui/input"
import {Search, Users, Globe, Activity, Zap, Lock} from "lucide-react"
import {Link} from "@tanstack/react-router"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog"
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

const wsProtocol = location.protocol === "https:" ? "wss:" : "ws:"

const SERVER_LIST = [
    {
        location: "EU",
        proxy: `${wsProtocol}//${env.VITE_PROXY_URL}`,
        host: "88.99.66.204",
        port: 27960,
    },
]

const GAME_TYPES: Record<number, string> = {
    0: "FFA",
    1: "Duel",
    2: "Single Player",
    3: "Team DM",
    4: "CTF",
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

const POLL_MS = 5000

export function ServerPicker() {
    const [servers, setServers] = useState<Server[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [name, setName] = useLocalStorage("name", "Q3JS Player")
    const inFlight = useRef(false)
    const cancelled = useRef(false)

    useEffect(() => {
        cancelled.current = false

        const tick = async () => {
            if (cancelled.current || inFlight.current) return
            inFlight.current = true
            try {
                const results = await Promise.allSettled(SERVER_LIST.map(q3GetInfo))
                const valid = results
                    .filter(r => r.status === "fulfilled" && r.value)
                    .map(r => (r as PromiseFulfilledResult<Server>).value!)
                if (!cancelled.current) setServers(valid)
            } finally {
                inFlight.current = false
            }
        }

        tick()
        const id = setInterval(tick, POLL_MS)
        const onVis = () => !document.hidden && tick()
        document.addEventListener("visibilitychange", onVis, {passive: true})

        return () => {
            cancelled.current = true
            clearInterval(id)
            document.removeEventListener("visibilitychange", onVis)
        }
    }, [])

    const filteredServers = servers.filter(
        (s) =>
            s.sv_hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.mapname.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const getPingColor = (ping?: number) =>
        !ping ? "text-muted-foreground" : ping < 50 ? "text-primary" : ping < 100 ? "text-accent" : "text-muted-foreground"

    const getPlayersFillPercentage = (p: number, m: number) => (p / m) * 100

    const getGameLimits = (s: Server) =>
        s.g_gametype === 4 && s.capturelimit > 0
            ? `${s.capturelimit} caps`
            : s.fraglimit > 0
                ? `${s.fraglimit} frags`
                : s.timelimit > 0
                    ? `${s.timelimit}min`
                    : "No limit"

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                    <CardTitle className="text-2xl text-foreground">Choose Your Battlefield</CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Select a server to start your match.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                        <Input
                            placeholder="Search..."
                            className="pl-10 border-border"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4">
                {filteredServers.map((server) => {
                    const sortedUsers = [...server.users].sort((a, b) => b.score - a.score)

                    return (
                        <Card key={server.id}
                              className="bg-card/50 border-border/50 hover:border-primary/50 transition-all">
                            <CardContent className="p-6">
                                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-lg font-bold text-foreground">
                                                        {server.sv_hostname}
                                                    </h3>
                                                    {server.g_needpass === 1 &&
                                                        <Lock className="h-4 w-4 text-muted-foreground"/>}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                                    <Badge variant="outline"
                                                           className="font-mono text-xs border-border/50 text-muted-foreground">
                                                        <Globe className="h-3 w-3 mr-1"/> {server.location}
                                                    </Badge>
                                                    <Badge variant="outline"
                                                           className="font-mono text-xs border-border/50 text-muted-foreground">
                                                        {server.mapname.toUpperCase()}
                                                    </Badge>
                                                    <Badge
                                                        className="font-mono text-xs bg-accent/20 text-accent border-accent/30">
                                                        {GAME_TYPES[server.g_gametype] || "Unknown"}
                                                    </Badge>
                                                    <Badge variant="outline"
                                                           className="font-mono text-xs border-border/50 text-muted-foreground">
                                                        {getGameLimits(server)}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        size="lg"
                                                        className="lg:w-auto w-full bg-primary text-primary-foreground font-bold"
                                                        disabled={server.players >= server.sv_maxclients}
                                                    >
                                                        {server.players >= server.sv_maxclients
                                                            ? "Server Full"
                                                            : <>
                                                                <Zap className="h-4 w-4 mr-2"/>Connect
                                                            </>}
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Choose a name</DialogTitle>
                                                        <DialogDescription>
                                                            Enter your player name to
                                                            join <strong>{server.sv_hostname}</strong>.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="mt-4">
                                                        <Input
                                                            placeholder="Enter your player name"
                                                            className="mb-4"
                                                            value={name}
                                                            onChange={(e) => setName(e.target.value)}
                                                        />
                                                        <Link to={"/game"} search={{
                                                            host: server.host,
                                                            port: server.port,
                                                        }}>
                                                            <Button size="lg"
                                                                    className="w-full bg-primary text-primary-foreground font-bold">
                                                                Join Server
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-4 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4 text-muted-foreground"/>
                                                <span className="text-foreground font-mono">
                                                    {server.players}/{server.sv_maxclients}
                                                </span>
                                                <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary rounded-full"
                                                        style={{
                                                            width: `${getPlayersFillPercentage(
                                                                server.players,
                                                                server.sv_maxclients
                                                            )}%`
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            {server.ping !== undefined && (
                                                <div className="flex items-center gap-2">
                                                    <Activity className={`h-4 w-4 ${getPingColor(server.ping)}`}/>
                                                    <span
                                                        className={`font-mono ${getPingColor(server.ping)}`}>{server.ping}ms</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Player list */}
                                        <div className="mt-4 border-t border-border/50 pt-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Users className="h-4 w-4"/>
                                                    <span className="font-semibold text-foreground">
                                                        Players ({sortedUsers.length})
                                                    </span>
                                                </div>
                                            </div>

                                            {sortedUsers.length === 0 ? (
                                                <p className="text-xs text-muted-foreground italic">
                                                    No players online.
                                                </p>
                                            ) : (
                                                <div
                                                    className="max-h-40 overflow-y-auto rounded-md border border-border/40 bg-background/40">
                                                    <div
                                                        className="grid grid-cols-[4rem_4rem_minmax(0,1fr)] px-3 py-2 text-[11px] font-mono text-muted-foreground border-b border-border/40">
                                                        <span>SCORE</span>
                                                        <span>PING</span>
                                                        <span>NAME</span>
                                                    </div>
                                                    {sortedUsers.map((u, idx) => (
                                                        <div
                                                            key={`${server.id}-player-${idx}-${u.name}`}
                                                            className="grid grid-cols-[4rem_4rem_minmax(0,1fr)] px-3 py-1.5 text-[11px] font-mono text-foreground odd:bg-background/40"
                                                        >
                                                            <span className="tabular-nums">{u.score}</span>
                                                            <span className="tabular-nums">{u.ping}</span>
                                                            <span className="truncate">{u.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>


                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {filteredServers.length === 0 && (
                <Card className="bg-card/50 border-border/50">
                    <CardContent className="py-12 text-center text-muted-foreground">
                        No servers found.
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
