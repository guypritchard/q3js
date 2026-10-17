"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ArenaStatus } from "@/lib/arena-servers";

export function AdminArenas({ token, onUnauthorized }: { token: string; onUnauthorized: () => void }) {
  const [arenas, setArenas] = useState<ArenaStatus[]>([]);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState<string>();
  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/arenas", { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(5000)]) : AbortSignal.timeout(5000), cache: "no-store" });
    if (!response.ok) throw new Error("WASM arena runner is unavailable.");
    const body = await response.json();
    if (!Array.isArray(body.arenas)) throw new Error("Invalid arena status.");
    if (!signal?.aborted) {
      setArenas(body.arenas.slice(0, 4));
      setError(current => current === "WASM arena runner is unavailable." ? undefined : current);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => { void load(controller.signal).catch(() => { if (!controller.signal.aborted) setError("WASM arena runner is unavailable."); }); };
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [load]);

  const act = async (arena: ArenaStatus, action: "start" | "stop" | "restart") => {
    if (busy) return;
    if (action !== "start" && !window.confirm(`${action === "stop" ? "Stop" : "Restart"} ${arena.name}? Connected players will be disconnected.`)) return;
    setBusy(arena.id);
    setError(undefined);
    setNotice(undefined);
    try {
      const response = await fetch(`/arenas/${encodeURIComponent(arena.id)}/${action}`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(15000),
      });
      if ([401, 403].includes(response.status)) { onUnauthorized(); return; }
      if (!response.ok) throw new Error("Arena action failed. Check runner health and administrator verification.");
      await load();
      setNotice(`${arena.name}: ${action === "stop" ? "stopped" : "startup requested"}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Arena action failed."); }
    finally { setBusy(undefined); }
  };

  return <section className="mt-6 border border-border/60 bg-card/35 p-5" aria-labelledby="wasm-arenas-title">
    <h2 id="wasm-arenas-title" className="font-mono text-xl font-bold uppercase">WASM arenas</h2>
    <p className="mt-2 text-sm text-muted-foreground">Named servers share one router. Starting an arena does not restart the master or Transit Hub.</p>
    {error && <p role="alert" className="mt-3 text-sm text-primary">{error}</p>}
    {notice && <p role="status" className="mt-3 text-sm">{notice}</p>}
    <ul className="mt-4 grid gap-3">
      {arenas.map(arena => <li key={arena.id} className="flex flex-col gap-3 border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="font-semibold">{arena.name}</h3>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{arena.state} · {arena.status?.map ?? "No live map"} · {arena.connections} connection(s)</p>
          <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{arena.gatewayPath}</p></div>
        <div className="flex flex-wrap gap-2" aria-busy={busy === arena.id}>
          <Button size="sm" variant="outline" disabled={!!busy || ["ready", "starting"].includes(arena.state)} onClick={() => void act(arena, "start")}>Start<span className="sr-only"> {arena.name}</span></Button>
          <Button size="sm" variant="outline" disabled={!!busy || arena.state === "stopped"} onClick={() => void act(arena, "restart")}>Restart<span className="sr-only"> {arena.name}</span></Button>
          <Button size="sm" variant="destructive" disabled={!!busy || arena.state === "stopped"} onClick={() => void act(arena, "stop")}>Stop<span className="sr-only"> {arena.name}</span></Button>
        </div>
      </li>)}
    </ul>
    {!arenas.length && <p className="mt-4 text-sm text-muted-foreground">No configured arenas are available.</p>}
  </section>;
}
