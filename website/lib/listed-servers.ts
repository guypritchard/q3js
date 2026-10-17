import { servers } from "@/lib/api/generated/sdk.gen";
import { client } from "@/lib/api/client";
import { mapServers } from "@/lib/master-server";
import { mapArenaServers } from "@/lib/arena-servers";

export async function fetchListedServers(signal?: AbortSignal) {
  const arenaSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(3000)]) : AbortSignal.timeout(3000);
  const [master, arena] = await Promise.allSettled([
    servers({ client, signal }),
    fetch("/arenas", { signal: arenaSignal, cache: "no-store" }).then(response => response.ok ? response.json() : undefined),
  ]);
  if (signal?.aborted) throw new DOMException("Request aborted", "AbortError");
  const listed = master.status === "fulfilled" && master.value.data ? mapServers(master.value.data) : [];
  const arenas = arena.status === "fulfilled" && typeof window !== "undefined" ? mapArenaServers(arena.value, window.location.origin) : [];
  if (master.status === "rejected" && !arenas.length) throw master.reason;
  return [...listed.filter(server => server.official), ...arenas, ...listed.filter(server => !server.official)];
}
