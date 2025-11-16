"use client"

import {useState} from "react"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import {Badge} from "@/components/ui/badge"
import {Input} from "@/components/ui/input"
import {Search, Users, Globe, Activity, Zap, Lock} from "lucide-react"
import {Link} from "@tanstack/react-router";

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
    location?: string // Optional field we might add
    players: number // Current players - would come from separate query
    ping?: number // Would be calculated on client
}

const GAME_TYPES: Record<number, string> = {
    0: "FFA",
    1: "Duel",
    2: "Single Player",
    3: "Team DM",
    4: "CTF",
}

const MOCK_SERVERS: Server[] = [
    {
        id: "1",
        sv_hostname: "Q3DM17 24/7 EU",
        mapname: "q3dm17",
        g_gametype: 0,
        fraglimit: 20,
        timelimit: 0,
        sv_maxclients: 16,
        g_needpass: 0,
        capturelimit: 8,
        version: "ioq3 1.36_ga0f9b5ae linux-x86_64 Nov 10 2025",
        location: "Nuremberg, DE",
        players: 12,
        ping: 42,
    },
]

export function ServerPicker() {
    const [searchQuery, setSearchQuery] = useState("")

    const filteredServers = MOCK_SERVERS.filter(
        (server) =>
            server.sv_hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
            server.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            server.mapname.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    const getPingColor = (ping: number | undefined) => {
        if (!ping) return "text-muted-foreground"
        if (ping < 50) return "text-primary"
        if (ping < 100) return "text-accent"
        return "text-muted-foreground"
    }

    const getPlayersFillPercentage = (players: number, maxPlayers: number) => {
        return (players / maxPlayers) * 100
    }

    const getGameLimits = (server: Server) => {
        if (server.g_gametype === 4 && server.capturelimit > 0) {
            // CTF mode shows capture limit
            return `${server.capturelimit} caps`
        } else if (server.fraglimit > 0) {
            // Show frag limit
            return `${server.fraglimit} frags`
        } else if (server.timelimit > 0) {
            // Show time limit
            return `${server.timelimit}min`
        }
        return "No limit"
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Search and Filters */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                    <CardTitle className="text-2xl text-foreground">Choose Your Battlefield</CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Select a server to start your match. Lower ping means better performance.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                        <Input
                            placeholder="Search servers by name, location, or map..."
                            className="pl-10 border-border"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Server List */}
            <div className="grid gap-4">
                {filteredServers.map((server) => (
                    <Card
                        key={server.id}
                        className={`bg-card/50 backdrop-blur-sm border-border/50 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10`}
                    >
                        <CardContent className="p-6">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                {/* Server Info */}
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-lg font-bold text-foreground">{server.sv_hostname}</h3>
                                                {server.g_needpass === 1 &&
                                                    <Lock className="h-4 w-4 text-muted-foreground"/>}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                                {server.location && (
                                                    <Badge variant="outline"
                                                           className="font-mono text-xs border-border/50 text-muted-foreground">
                                                        <Globe className="h-3 w-3 mr-1"/>
                                                        {server.location}
                                                    </Badge>
                                                )}
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

                                    {/* Stats */}
                                    <div className="flex flex-wrap items-center gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-muted-foreground"/>
                                            <span className="text-foreground font-mono">
                        {server.players}/{server.sv_maxclients}
                      </span>
                                            <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary transition-all rounded-full"
                                                    style={{width: `${getPlayersFillPercentage(server.players, server.sv_maxclients)}%`}}
                                                />
                                            </div>
                                        </div>
                                        {server.ping !== undefined && (
                                            <div className="flex items-center gap-2">
                                                <Activity className={`h-4 w-4 ${getPingColor(server.ping)}`}/>
                                                <span
                                                    className={`font-mono font-medium ${getPingColor(server.ping)}`}>{server.ping}ms</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Connect Button */}
                                <Link to={"/game"}>
                                    <Button
                                        size="lg"
                                        className="lg:w-auto w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                                        disabled={server.players >= server.sv_maxclients}
                                    >
                                        {server.players >= server.sv_maxclients ? (
                                            "Server Full"
                                        ) : (
                                            <>
                                                <Zap className="h-4 w-4 mr-2"/>
                                                Connect
                                            </>
                                        )}
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredServers.length === 0 && (
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground">No servers found matching your search.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
