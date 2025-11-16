import {GAME_TYPES, q3GetInfo, type Q3ResolvedServer, type Q3ServerTarget} from "@/lib/q3.ts";
import {Card, CardContent} from "@/components/ui/card.tsx";
import {Activity, Globe, Lock, Users} from "lucide-react";
import {Badge} from "@/components/ui/badge.tsx";
import {getGameLimits, getPercentage, getPingColor} from "@/lib/utils.ts";
import {JoinServerButton} from "@/components/join-server-button.tsx";
import {PlayerList} from "@/components/player-list.tsx";
import {useEffect, useState} from "react";
import {useInterval} from "usehooks-ts";

export function ServerCard(props: {
    server: Q3ServerTarget,
}) {

    const [loading, setLoading] = useState(false);
    const [info, setInfo] = useState<Q3ResolvedServer | undefined>();
    const [error, setError] = useState<string | null>(null);

    async function refresh() {
        setLoading(true);
        try {
            const res = await q3GetInfo(props.server)
            if (res) {
                setInfo(res);
            }
        } catch (e) {
            setError("Failed to fetch server info");
        } finally {
            setLoading(false);
        }
    }

    useInterval(refresh, 5000);

    useEffect(() => {
        refresh();
    }, []);

    if (!loading && !info && !error) {
        return <Card
            className="bg-card/50 border-border/50 hover:border-primary/50 transition-all animate-pulse">
            <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                        <div className="h-6 bg-secondary/50 rounded w-1/2 mb-4"/>
                        <div className="h-4 bg-secondary/50 rounded w-1/4 mb-2"/>
                        <div className="h-4 bg-secondary/50 rounded w-1/3 mb-2"/>
                        <div className="h-4 bg-secondary/50 rounded w-1/5 mb-2"/>
                    </div>
                </div>
            </CardContent>
        </Card>;
    }

    if (error || !info) {
        return <Card
            className="bg-card/50 border-border/50 hover:border-destructive/50 transition-all">
            <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                        <div className="h-6 bg-secondary/50 rounded w-1/2 mb-4"/>
                        <div className="text-destructive">Error: {error || "Unknown error"}</div>
                    </div>
                </div>
            </CardContent>
        </Card>;
    }

    const sortedUsers = [...info.users].sort((a, b) => b.score - a.score)


    return <Card
        className="bg-card/50 border-border/50 hover:border-primary/50 transition-all">
        <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-bold text-foreground">
                                    {info.sv_hostname}
                                </h3>
                                {info.g_needpass === 1 &&
                                    <Lock className="h-4 w-4 text-muted-foreground"/>}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                <Badge variant="outline"
                                       className="font-mono text-xs border-border/50 text-muted-foreground">
                                    <Globe className="h-3 w-3 mr-1"/> {info.location}
                                </Badge>
                                <Badge variant="outline"
                                       className="font-mono text-xs border-border/50 text-muted-foreground">
                                    {info.mapname.toUpperCase()}
                                </Badge>
                                <Badge
                                    className="font-mono text-xs bg-accent/20 text-accent border-accent/30">
                                    {GAME_TYPES[info.g_gametype] || "Unknown"}
                                </Badge>
                                <Badge variant="outline"
                                       className="font-mono text-xs border-border/50 text-muted-foreground">
                                    {getGameLimits(info)}
                                </Badge>
                            </div>
                        </div>

                        <JoinServerButton server={info}/>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground"/>
                            <span className="text-foreground font-mono">
                                                    {info.players}/{info.sv_maxclients}
                                                </span>
                            <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary rounded-full"
                                    style={{
                                        width: `${getPercentage(
                                            info.players,
                                            info.sv_maxclients
                                        )}%`
                                    }}
                                />
                            </div>
                        </div>
                        {info.ping !== undefined && (
                            <div className="flex items-center gap-2">
                                <Activity className={`h-4 w-4 ${getPingColor(info.ping)}`}/>
                                <span
                                    className={`font-mono ${getPingColor(info.ping)}`}>{info.ping}ms</span>
                            </div>
                        )}
                    </div>

                    <PlayerList users={sortedUsers}/>
                </div>


            </div>
        </CardContent>
    </Card>;
}