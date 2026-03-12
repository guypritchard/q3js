"use client";

import {Card, CardContent} from "@/components/ui/card";
import {type Q3ResolvedServer} from "@/lib/q3.ts";
import {ServerCard} from "@/components/server-card.tsx";
import {fetchServers} from "@/lib/servers.ts";
import {useEffect, useMemo, useRef, useState, useSyncExternalStore} from "react";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";
import {stripQ3Colors} from "@/lib/utils.ts";
import Link from "next/link";
import {Search} from "lucide-react";
import {trackEvent} from "@/lib/analytics.ts";
import {useLocalStorage} from "@/hooks/use-local-storage.ts";
import {createRandomPlayerName} from "@/lib/player-name-generator.ts";
import {usePollingQuery} from "@/hooks/use-polling-query.ts";
import ServerSkeleton from "@/components/server-skeleton.tsx";

const POLL_MS = 5000;
const subscribe = () => () => {};

function formatCount(count: number, singular: string, plural = `${singular}s`) {
    return `${count} ${count === 1 ? singular : plural}`;
}

export function ServerPicker(props: { initialServers: Q3ResolvedServer[] }) {
    const [name, setName] = useLocalStorage("name", "");
    const [searchTerm, setSearchTerm] = useState("");
    const isHydrated = useSyncExternalStore(subscribe, () => true, () => false);
    const hasTrackedSearchUsageRef = useRef(false);

    const serversResponse = usePollingQuery<Q3ResolvedServer[]>({
        queryFn: fetchServers,
        intervalMs: POLL_MS,
        initialData: props.initialServers,
        isPendingInitial: props.initialServers.length === 0,
    });

    const servers = serversResponse.data;
    const playerName = isHydrated ? name : "";

    useEffect(() => {
        if (hasTrackedSearchUsageRef.current) return;
        if (searchTerm.trim().length === 0) return;

        hasTrackedSearchUsageRef.current = true;
        trackEvent("server_search_used");
    }, [searchTerm]);

    const filteredServers = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        const next = servers.filter((server) => {
            const hostname = stripQ3Colors(server.sv_hostname).toLowerCase();
            const mapname = server.mapname.toLowerCase();

            const matchesSearch =
                normalizedSearch.length === 0 ||
                hostname.includes(normalizedSearch) ||
                mapname.includes(normalizedSearch);

            return matchesSearch;
        });

        return next;
    }, [servers, searchTerm]);

    const totalPlayerCount = useMemo(
        () => servers.reduce((sum, server) => sum + server.players, 0),
        [servers]
    );
    const filteredPlayerCount = useMemo(
        () => filteredServers.reduce((sum, server) => sum + server.players, 0),
        [filteredServers]
    );
    const activeFilterCount = [searchTerm.trim().length > 0].filter(Boolean).length;

    function clearFilters() {
        trackEvent("server_filters_cleared", {
            had_search_term: searchTerm.trim().length > 0,
        });
        setSearchTerm("");
    }

    function handleNameChange(nextName: string) {
        setName(nextName);
    }

    function resolvePlayerNameForJoin() {
        if (name.trim().length > 0) {
            return name;
        }

        const generatedName = createRandomPlayerName();
        setName(generatedName);
        return generatedName;
    }

    function refreshServerList(source: "empty" | "filtered_empty" | "error") {
        trackEvent("server_list_refreshed", {source});
        void serversResponse.refetch();
    }

    return (
        <section id="server-browser" className="container mx-auto px-4 pb-24 scroll-mt-24">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="space-y-2">
                    <h2 className="text-3xl font-bold">Server Browser</h2>
                    <p className="text-muted-foreground text-sm">
                        Pick a server and jump in immediately. Your player name is reused for every join.
                    </p>
                    {serversResponse.isError && servers.length > 0 && (
                        <p className="text-xs text-destructive">
                            Unable to refresh server list. Showing last known data.
                        </p>
                    )}
                </div>

                <Card className="bg-card/60 border-border/60">
                    <CardContent className="p-4 space-y-4">
                        <div className="grid gap-3">
                            <div className="relative">
                                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2"/>
                                <Input
                                    placeholder="Search server or map"
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                                <span>
                                    {activeFilterCount > 0
                                        ? `${filteredServers.length}/${servers.length} servers`
                                        : formatCount(servers.length, "server")}
                                </span>
                                <span>
                                    {activeFilterCount > 0
                                        ? `${filteredPlayerCount}/${totalPlayerCount} players online`
                                        : `${formatCount(totalPlayerCount, "player")} online`}
                                </span>
                                {activeFilterCount > 0 && (
                                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                                        Clear filters
                                    </Button>
                                )}
                            </div>
                        </div>

                    </CardContent>
                </Card>

                <div className="grid gap-4">
                    {serversResponse.isPending
                        ? ["server-skeleton-1", "server-skeleton-2"].map((id) => <ServerSkeleton key={id}/>)
                        : filteredServers.map((server) => (
                            <ServerCard
                                key={server.id}
                                server={server}
                                playerName={playerName}
                                resolvePlayerName={resolvePlayerNameForJoin}
                            />
                        ))}
                </div>

                {serversResponse.isError && servers.length === 0 && !serversResponse.isPending && (
                    <Card className="bg-destructive/10 border-destructive/50">
                        <CardContent className="py-10 text-center space-y-3">
                            <p className="text-destructive">Something went wrong loading the server list.</p>
                            <div className="flex items-center justify-center gap-2">
                                <Button variant="outline" onClick={() => refreshServerList("error")}>
                                    Retry
                                </Button>
                                <Button asChild>
                                    <Link href="/guide">Run your own server</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {!serversResponse.isPending && !serversResponse.isError && servers.length === 0 && (
                    <Card className="bg-card/50 border-border/50">
                        <CardContent className="py-10 text-center space-y-3">
                            <p className="text-muted-foreground">No servers are live right now.</p>
                            <div className="flex items-center justify-center gap-2">
                                <Button variant="outline" onClick={() => refreshServerList("empty")}>
                                    Refresh list
                                </Button>
                                <Button asChild>
                                    <Link href="/guide">Run your own server</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {!serversResponse.isPending && servers.length > 0 && filteredServers.length === 0 && (
                    <Card className="bg-card/50 border-border/50">
                        <CardContent className="py-10 text-center space-y-3">
                            <p className="text-muted-foreground">No servers match your current filters.</p>
                            <div className="flex items-center justify-center gap-2">
                                <Button variant="outline" onClick={clearFilters}>
                                    Clear filters
                                </Button>
                                <Button variant="outline" onClick={() => refreshServerList("filtered_empty")}>
                                    Refresh list
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </section>
    );
}
