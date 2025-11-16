import {useEffect, useState} from "react"
import {Card, CardContent} from "@/components/ui/card"
import {useInterval} from "usehooks-ts";
import {getServers, type Q3ServerTarget} from "@/lib/q3.ts";
import SERVER_LIST from "@/servers.ts";
import {ServerCard} from "@/components/server-card.tsx";
import {getWsProtocol} from "@/lib/utils.ts";


const POLL_MS = 5000

export function ServerPicker() {
    const [servers, setServers] = useState<Q3ServerTarget[]>([])
    const [loading, setLoading] = useState(false)

    async function refreshServers() {
        try {
            setLoading(true);
            const serversFromMaster = (await getServers()).map(s => ({
                proxy: `${getWsProtocol()}//${import.meta.env.VITE_PROXY_URL}`,
                host: s.host,
                port: s.port
            }));
            console.log(serversFromMaster);
            const serversToFetch = [
                ...SERVER_LIST,
                ...serversFromMaster
            ]
            setServers(serversToFetch);
        } catch (e) {
            console.error("Failed to fetch servers", e);
        } finally {
            setLoading(false);
        }
    }

    useInterval(refreshServers, POLL_MS);

    useEffect(() => {
        refreshServers()
    }, []);

    if (loading) {
        return (
            <section className="container mx-auto px-4 pb-24">
                <div className="max-w-5xl mx-auto space-y-6">
                    <div className="grid gap-4">
                        {[...Array(5)].map((_, i) => (
                            <Card
                                key={i}
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
                            </Card>
                        ))}
                    </div>
                </div>
            </section>
        )
    }

    return (
        <section className="container mx-auto px-4 pb-24">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="grid gap-4">
                    {servers.map((server, i) => {

                        return (
                            <ServerCard
                                key={i}
                                server={server}
                            />
                        )
                    })}
                </div>

                {servers.length === 0 && (
                    <Card className="bg-card/50 border-border/50">
                        <CardContent className="py-12 text-center text-muted-foreground">
                            No servers found.
                        </CardContent>
                    </Card>
                )}
            </div>
        </section>
    )
}
