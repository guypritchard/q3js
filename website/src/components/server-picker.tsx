import {Card, CardContent} from "@/components/ui/card"
import {type Q3ResolvedServer} from "@/lib/q3.ts";
import {ServerCard} from "@/components/server-card.tsx";
import {useSuspenseQuery} from "@tanstack/react-query";
import {fetchServers} from "@/lib/servers.ts";
import {useEffect, useMemo, useRef, useState} from "react";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";
import {stripQ3Colors} from "@/lib/utils.ts";
import {Link} from "@tanstack/react-router";
import {Search} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select.tsx";
import {trackEvent} from "@/lib/analytics.ts";

const POLL_MS = 5000

type SortKey = "players" | "ping" | "name";

export function ServerPicker() {
    const [name, setName] = useState("Q3JS Player");
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState<SortKey>("players");
    const hasTrackedSearchUsageRef = useRef(false);

    const serversResponse = useSuspenseQuery<Q3ResolvedServer[]>({
        queryFn: fetchServers,
        queryKey: ['servers'],
        staleTime: POLL_MS,
        refetchInterval: POLL_MS,
        retry: 2,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    })
    const servers = serversResponse.data ?? [];
    const playerName = name;

    useEffect(() => {
        const storedName = localStorage.getItem("name");
        const initialName = storedName ?? "Q3JS Player";
        setName(initialName);
        localStorage.setItem("name", initialName);
        const syncName = (event: StorageEvent) => {
            if (event.key === "name") {
                setName(event.newValue ?? "Q3JS Player");
            }
        };

        window.addEventListener("storage", syncName);
        return () => {
            window.removeEventListener("storage", syncName);
        };
    }, []);

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

        next.sort((a, b) => {
            if (sortBy === "ping") {
                const pingA = a.ping ?? Number.POSITIVE_INFINITY;
                const pingB = b.ping ?? Number.POSITIVE_INFINITY;
                if (pingA !== pingB) return pingA - pingB;
                return b.players - a.players;
            }
            if (sortBy === "name") {
                const nameA = stripQ3Colors(a.sv_hostname);
                const nameB = stripQ3Colors(b.sv_hostname);
                return nameA.localeCompare(nameB);
            }
            return b.players - a.players;
        });

        return next;
    }, [servers, searchTerm, sortBy]);

    const activeFilterCount = [
        searchTerm.trim().length > 0
    ].filter(Boolean).length;

    function clearFilters() {
        trackEvent("server_filters_cleared", {
            had_search_term: searchTerm.trim().length > 0,
            previous_sort: sortBy,
        });
        setSearchTerm("");
        setSortBy("players");
    }

    function handleNameChange(nextName: string) {
        setName(nextName);
        localStorage.setItem("name", nextName);
    }

    function handleSortChange(value: string) {
        if (value !== "players" && value !== "ping" && value !== "name") return;

        if (value !== sortBy) {
            trackEvent("server_sort_changed", {sort_by: value});
        }

        setSortBy(value);
    }

    function refreshServerList(source: "empty" | "filtered_empty") {
        trackEvent("server_list_refreshed", {source});
        serversResponse.refetch();
    }

    return (
        <section id="server-browser" className="container mx-auto px-4 pb-24 scroll-mt-24">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="space-y-2">
                    <h2 className="text-3xl font-bold">Server Browser</h2>
                    <p className="text-muted-foreground text-sm">
                        Pick a server and jump in immediately. Your player name is reused for every join.
                    </p>
                </div>

                <Card className="bg-card/60 border-border/60">
                    <CardContent className="p-4 space-y-4">
                        <div>
                            <label htmlFor="player-name" className="mb-2 block text-sm font-semibold">
                                Player name
                            </label>
                            <Input
                                id="player-name"
                                placeholder="Q3JS Player"
                                value={name}
                                onChange={(event) => handleNameChange(event.target.value)}
                            />
                        </div>

                        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                            <div className="relative">
                                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2"/>
                                <Input
                                    placeholder="Search server or map"
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                />
                            </div>

                            <div>
                                <Select
                                    value={sortBy}
                                    onValueChange={handleSortChange}
                                >
                                    <SelectTrigger aria-label="Sort servers">
                                        <SelectValue placeholder="Sort: most players"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="players">Sort: most players</SelectItem>
                                        <SelectItem value="ping">Sort: lowest ping</SelectItem>
                                        <SelectItem value="name">Sort: name A-Z</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{filteredServers.length}/{servers.length} servers</span>
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
                    {filteredServers.map((server) => {
                        return (
                            <ServerCard
                                key={server.id}
                                server={server}
                                playerName={playerName}
                            />
                        )
                    })}
                </div>

                {servers.length === 0 && (
                    <Card className="bg-card/50 border-border/50">
                        <CardContent className="py-10 text-center space-y-3">
                            <p className="text-muted-foreground">No servers are live right now.</p>
                            <div className="flex items-center justify-center gap-2">
                                <Button variant="outline" onClick={() => refreshServerList("empty")}>
                                    Refresh list
                                </Button>
                                <Button asChild>
                                    <Link to="/guide">Run your own server</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {servers.length > 0 && filteredServers.length === 0 && (
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
    )
}
