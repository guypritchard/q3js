import {useEffect, useState} from "react"
import {Card, CardContent} from "@/components/ui/card"
import {useInterval} from "usehooks-ts";
import {type Q3ServerTarget} from "@/lib/q3.ts";
import SERVER_LIST from "@/servers.ts";
import {ServerCard} from "@/components/server-card.tsx";
import ServerSkeleton from "@/components/server-skeleton.tsx";


const POLL_MS = 5000

export function ServerPicker() {
    const [servers, setServers] = useState<Q3ServerTarget[]>([])
    const [loading, setLoading] = useState(false)

    async function refreshServers() {
        try {
            setLoading(true);
            // const serversFromMaster = (await getServers()).map(s => ({
            //     proxy: `${getWsProtocol()}//${import.meta.env.VITE_PROXY_URL}`,
            //     host: s.host,
            //     port: s.port
            // }));

            const serversToFetch = [
                ...SERVER_LIST,
                // ...serversFromMaster
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

    if (loading && servers.length === 0) {
        return (
            <section className="container mx-auto px-4 pb-24">
                <div className="max-w-5xl mx-auto space-y-6">
                    <h2 className="text-3xl font-bold">Select a Server</h2>

                    <div className="grid gap-4">
                        {[...Array(1)].map((_, i) => (
                            <ServerSkeleton key={i}/>
                        ))}
                    </div>
                </div>
            </section>
        )
    }

    return (
        <section className="container mx-auto px-4 pb-24">
            <div className="max-w-5xl mx-auto space-y-6">
                <h2 className="text-3xl font-bold">Select a Server</h2>

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
