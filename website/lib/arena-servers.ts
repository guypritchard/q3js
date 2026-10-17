import type { ListedServer } from "./master-server.ts";

export interface ArenaStatus {
  id: string;
  name: string;
  state: string;
  connections: number;
  gatewayPath: string;
  maps: string[];
  maxClients: number;
  status?: { map: string; users: { name: string; score: number; ping: number }[]; info: Record<string, unknown> };
}

export function mapArenaServers(value: unknown, origin: string): ListedServer[] {
  if (!value || typeof value !== "object" || !Array.isArray((value as { arenas?: unknown }).arenas)) return [];
  const base = new URL(origin);
  if (!["http:", "https:"].includes(base.protocol)) return [];
  const arenas = (value as { arenas: unknown[] }).arenas.slice(0, 4);
  const result: ListedServer[] = [];
  const seen = new Set<string>();
  for (const item of arenas) {
    if (!item || typeof item !== "object") continue;
    const arena = item as Partial<ArenaStatus>;
    if (typeof arena.id !== "string" || !/^[a-z0-9][a-z0-9_-]{0,31}$/.test(arena.id) || seen.has(arena.id)) continue;
    if (arena.state !== "ready" || arena.gatewayPath !== `/arenas/${arena.id}/ws` || typeof arena.name !== "string" || arena.name.length > 64) continue;
    if (!arena.status || typeof arena.status.map !== "string" || !/^[A-Za-z0-9_/-]{1,64}$/.test(arena.status.map)) continue;
    if (!Array.isArray(arena.status.users) || !arena.status.info || typeof arena.status.info !== "object") continue;
    const users = arena.status.users.slice(0, 32).filter(user => user && typeof user.name === "string" && Number.isFinite(user.ping) && Number.isFinite(user.score))
      .map(user => ({ name: user.name.slice(0, 64), ping: user.ping, score: user.score, bot: user.ping === 0 }));
    const numeric = (key: string, fallback = 0) => typeof arena.status!.info[key] === "number" && Number.isFinite(arena.status!.info[key]) ? Math.max(0, Math.min(100000, arena.status!.info[key] as number)) : fallback;
    const gateway = new URL(arena.gatewayPath, base);
    gateway.protocol = base.protocol === "https:" ? "wss:" : "ws:";
    const limits = [numeric("fraglimit") ? `${numeric("fraglimit")} frags` : "", numeric("timelimit") ? `${numeric("timelimit")} minutes` : ""].filter(Boolean).join(" / ");
    seen.add(arena.id);
    result.push({ id: `arena:${arena.id}`, gatewayUrl: gateway.href, hosted: false, host: base.hostname,
      proxyPort: Number(base.port || (base.protocol === "https:" ? 443 : 80)), targetPort: 27960,
      secure: base.protocol === "https:", official: true, baseGame: "baseq3", fsGame: "q3js", comGameName: "Quake3Arena",
      name: arena.name, coloredName: arena.name, map: arena.status.map, mode: "Free for all", limits: limits || "No limit",
      location: "WASM arena", players: users.length, capacity: Math.min(32, Math.max(1, numeric("sv_maxclients", 12))),
      ping: 0, passwordProtected: numeric("g_needpass") === 1, version: String(arena.status.info.version ?? "WASM").slice(0, 128),
      protocol: numeric("com_protocol", 71) || 71, users });
  }
  return result;
}
