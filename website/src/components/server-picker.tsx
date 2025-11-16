import {useEffect, useState} from "react"
import {useLocalStorage} from "@uidotdev/usehooks"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import {Badge} from "@/components/ui/badge"
import {Input} from "@/components/ui/input"
import {Activity, Globe, Lock, Search, Users, Zap} from "lucide-react"
import {Link} from "@tanstack/react-router"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog"
import {ScrollArea} from "@/components/ui/scroll-area.tsx";
import {GAME_TYPES, q3GetInfo, q3GetServers, type Server, SERVER_LIST, wsProtocol} from "@/lib/q3.ts";
import {env} from "@/env.ts";
import {useInterval} from "usehooks-ts";


const POLL_MS = 5000

export function ServerPicker() {
    const [servers, setServers] = useState<Server[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [name, setName] = useLocalStorage("name", "Q3JS Player")

    async function refreshServers() {
        const staticServers = SERVER_LIST.map(s => q3GetInfo(s));
        const masterServersPromise = q3GetServers(`${wsProtocol}//${env.VITE_PROXY_URL}`);

        const serversFromMaster = await masterServersPromise;

        console.log(serversFromMaster);

        const masterServerInfoPromises = serversFromMaster.map(s =>
            q3GetInfo({
                location: "EU",
                proxy: `${wsProtocol}//${env.VITE_PROXY_URL}`,
                host: s.host,
                port: s.port,
            })
        );

        const results = await Promise.allSettled([
            ...staticServers,
            ...masterServerInfoPromises
        ]);

        const valid = results
            .filter(r => r.status === "fulfilled" && r.value)
            .map(r => (r as PromiseFulfilledResult<Server>).value!);

        setServers(valid);
    }


    useInterval(refreshServers, POLL_MS)

    useEffect(() => {
        refreshServers()
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
                                                <ScrollArea
                                                    className="h-40 overflow-y-auto rounded-md border border-border/40 bg-background/40">
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
                                                </ScrollArea>
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
