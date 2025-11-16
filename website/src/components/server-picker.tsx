"use client"
import {useEffect, useState} from "react"
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

interface Server {
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
}

const GAME_TYPES: Record<number, string> = {
    0: "FFA",
    1: "Duel",
    2: "Single Player",
    3: "Team DM",
    4: "CTF",
}

async function q3GetInfo(): Promise<Server | null> {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket("wss://server.q3js.com:443");
        ws.binaryType = "arraybuffer";

        const timeout = setTimeout(() => {
            try {
                ws.close();
            } catch {
            }
            reject(new Error("getinfo timeout"));
        }, 5000);

        const enc = new TextEncoder();
        const concat = (a: Uint8Array, b: Uint8Array) => {
            const out = new Uint8Array(a.length + b.length);
            out.set(a, 0);
            out.set(b, a.length);
            return out;
        };

        let start = 0;

        ws.addEventListener("open", () => {
            const prefix = new Uint8Array([0xff, 0xff, 0xff, 0xff]);
            const cmd = enc.encode("getinfo xxx\n");
            const msg = concat(prefix, cmd);
            start = performance.now();
            ws.send(msg);
        });

        ws.addEventListener("message", async (ev: MessageEvent) => {
            clearTimeout(timeout);
            const ping = Math.round(performance.now() - start);
            try {
                ws.close();
            } catch {
            }

            const ab =
                ev.data instanceof ArrayBuffer
                    ? ev.data
                    : ev.data instanceof Blob
                        ? await ev.data.arrayBuffer()
                        : enc.encode(String(ev.data)).buffer;

            const text = new TextDecoder().decode(ab);
            const tag = "infoResponse\n";
            const i = text.indexOf(tag);
            if (i === -1) return resolve(null);

            const parts = text.slice(i + tag.length).trim().split("\\");
            const kv: Record<string, string> = {};
            for (let j = 1; j < parts.length; j += 2) kv[parts[j]] = parts[j + 1] ?? "";

            const sv: Server = {
                id: "server.q3js.com",
                sv_hostname: kv.sv_hostname || "Unnamed Server",
                mapname: kv.mapname || "unknown",
                g_gametype: Number(kv.g_gametype || 0),
                fraglimit: Number(kv.fraglimit || 0),
                timelimit: Number(kv.timelimit || 0),
                sv_maxclients: Number(kv.sv_maxclients || 0),
                g_needpass: Number(kv.g_needpass || 0),
                capturelimit: Number(kv.capturelimit || 0),
                version: kv.version || "",
                players: Number(kv.clients || 0),
                location: "server.q3js.com",
                ping,
            };

            resolve(sv);
        });

        ws.addEventListener("error", (e) => {
            clearTimeout(timeout);
            try {
                ws.close();
            } catch {
            }
            reject(e);
        });
    });
}


export function ServerPicker() {
    const [servers, setServers] = useState<Server[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [name, setName] = useLocalStorage("name", "Q3JS Player")

    useEffect(() => {
        q3GetInfo()
            .then((srv) => srv && setServers([srv]))
            .catch((err) => console.error("getinfo failed", err))
    }, [])

    const filteredServers = servers.filter(
        (server) =>
            server.sv_hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
            server.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            server.mapname.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    const getPingColor = (ping?: number) =>
        !ping ? "text-muted-foreground" : ping < 50 ? "text-primary" : ping < 100 ? "text-accent" : "text-muted-foreground"

    const getPlayersFillPercentage = (players: number, max: number) => (players / max) * 100

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
                {filteredServers.map((server) => (
                    <Card key={server.id}
                          className="bg-card/50 border-border/50 hover:border-primary/50 transition-all">
                        <CardContent className="p-6">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-lg font-bold text-foreground">{server.sv_hostname}</h3>
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
                                                    style={{width: `${getPlayersFillPercentage(server.players, server.sv_maxclients)}%`}}
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
                                </div>

                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button
                                            size="lg"
                                            className="lg:w-auto w-full bg-primary text-primary-foreground font-bold"
                                            disabled={server.players >= server.sv_maxclients}
                                        >
                                            {server.players >= server.sv_maxclients ? "Server Full" : <><Zap
                                                className="h-4 w-4 mr-2"/>Connect</>}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Choose a name</DialogTitle>
                                            <DialogDescription>
                                                Enter your player name to join <strong>{server.sv_hostname}</strong>.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="mt-4">
                                            <Input
                                                placeholder="Enter your player name"
                                                className="mb-4"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                            />
                                            <Link to={"/game"}>
                                                <Button size="lg"
                                                        className="w-full bg-primary text-primary-foreground font-bold">
                                                    Join Server
                                                </Button>
                                            </Link>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredServers.length === 0 && (
                <Card className="bg-card/50 border-border/50">
                    <CardContent className="py-12 text-center text-muted-foreground">No servers found.</CardContent>
                </Card>
            )}
        </div>
    )
}
