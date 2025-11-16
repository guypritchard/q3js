import {Card, CardContent} from "@/components/ui/card"
import {type Q3ServerTarget} from "@/lib/q3.ts";
import {ServerCard} from "@/components/server-card.tsx";
import {useSuspenseQuery} from "@tanstack/react-query";
import {env} from "@/env.ts";

const POLL_MS = 5000

export function ServerPicker() {
    const serversResponse = useSuspenseQuery<Q3ServerTarget[]>({
        queryFn: async () => {
            return fetch(`${env.VITE_MASTER_SERVER_URL}/api/servers`).then(res => res.json())
        },
        queryKey: ['servers'],
        staleTime: POLL_MS,
    })
    const servers = serversResponse.data;

    return (
        <section className="container mx-auto px-4 pb-24">
            <div className="max-w-5xl mx-auto space-y-6">
                <h2 className="text-3xl font-bold">Select a Server ({serversResponse.data.length})</h2>

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
