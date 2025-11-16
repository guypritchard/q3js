import {useEffect, useState} from "react"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Input} from "@/components/ui/input"
import {Search} from "lucide-react"
import {useInterval} from "usehooks-ts";
import {getServers, type Q3ServerTarget} from "@/lib/q3.ts";
import SERVER_LIST from "@/servers.ts";
import {ServerCard} from "@/components/server-card.tsx";
import {getWsProtocol} from "@/lib/utils.ts";


const POLL_MS = 5000

export function ServerPicker() {
    const [servers, setServers] = useState<Q3ServerTarget[]>([])
    const [searchQuery, setSearchQuery] = useState("")

    async function refreshServers() {
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

    }

    useInterval(refreshServers, POLL_MS);

    useEffect(() => {
        refreshServers()
    }, []);


    const filteredServers = servers;


    return (
        <section className="container mx-auto px-4 pb-24">
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
                    {filteredServers.map((server, i) => {

                        return (
                            <ServerCard
                                key={i}
                                server={server}
                            />
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
        </section>
    )
}
