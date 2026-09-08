"use client";

import { createQ3BrowserHostedSession, type Q3Asset, type Q3BrowserHostedSession } from "@q3js/client";
import { ArrowClockwise, ArrowSquareOut, Copy, DesktopTower, Stop } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const STATIC_BASE_URL = (process.env.NEXT_PUBLIC_Q3JS_STATIC_URL?.trim() || "").replace(/\/+$/, "");
const MASTER_URL = process.env.NEXT_PUBLIC_Q3JS_MASTER_URL?.trim() || "http://localhost:8080";
const MAP_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const MAX_LOG_LINES = 500;
const TRANSIT_HUB_MAP = "q3js_hub";
const DEATHMATCH_ARENAS = [
  ["q3dm0", "Introduction"],
  ["q3dm1", "Arena Gate"],
  ["q3dm2", "House of Pain"],
  ["q3dm3", "Arena of Death"],
  ["q3dm4", "The Place of Many Deaths"],
  ["q3dm5", "The Forgotten Place"],
  ["q3dm6", "The Camping Grounds"],
  ["q3dm7", "Temple of Retribution"],
  ["q3dm8", "Brimstone Abbey"],
  ["q3dm9", "Hero's Keep"],
  ["q3dm10", "The Nameless Place"],
  ["q3dm11", "Deva Station"],
  ["q3dm12", "The Dredwerkz"],
  ["q3dm13", "Lost World"],
  ["q3dm14", "Grim Dungeons"],
  ["q3dm15", "Demon Keep"],
  ["q3dm16", "The Bouncy Map"],
  ["q3dm17", "The Longest Yard"],
  ["q3dm18", "Space Chamber"],
  ["q3dm19", "Apocalypse Void"],
] as const;
const TOURNAMENT_ARENAS = [
  ["q3tourney1", "Powerstation 0218"],
  ["q3tourney2", "The Proving Grounds"],
  ["q3tourney3", "Hell's Gate"],
  ["q3tourney4", "Vertical Vengeance"],
  ["q3tourney5", "Fatal Instinct"],
  ["q3tourney6", "The Very End of You"],
] as const;

type HostState = "idle" | "loading" | "starting" | "ready" | "error";
type LogLevel = "info" | "error" | "command";

interface LogLine {
  id: number;
  level: LogLevel;
  message: string;
}

function relayUrl(): string {
  const url = new URL(MASTER_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/$/, "")}/api/hosted-games/host`;
  return url.toString();
}

async function baseGameAssets(): Promise<readonly Q3Asset[]> {
  const response = await fetch(`${STATIC_BASE_URL}/baseq3/manifest.json`, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Unable to load the baseq3 manifest (HTTP ${response.status}).`);
  }
  const manifest = await response.json() as { files?: unknown };
  if (!Array.isArray(manifest.files)
      || !manifest.files.every((file) => typeof file === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]*\.pk3$/.test(file))) {
    throw new Error("The baseq3 manifest is invalid.");
  }
  return manifest.files.map((file) => ({
    url: `${STATIC_BASE_URL}/baseq3/${encodeURIComponent(file)}`,
    path: `/baseq3/${file}`,
  }));
}

function inviteUrl(session: Q3BrowserHostedSession, serverName: string, map: string): string {
  const gateway = new URL(session.gatewayUrl);
  const parameters = new URLSearchParams({
    id: `browser:${session.serverId}`,
    hosted: "1",
    gatewayUrl: session.gatewayUrl,
    host: "browser",
    proxyPort: gateway.port || (gateway.protocol === "wss:" ? "443" : "80"),
    secure: gateway.protocol === "wss:" ? "1" : "0",
    baseGame: "baseq3",
    comGameName: "Quake3Arena",
    serverName,
    serverMode: "Free for all",
    serverMap: map,
    official: "0",
    humanPlayers: "0",
    entryPoint: "host_invite",
  });
  return `${window.location.origin}/play?${parameters.toString()}`;
}

export function HostGame() {
  const hostedSession = useRef<Q3BrowserHostedSession | undefined>(undefined);
  const startupController = useRef<AbortController | undefined>(undefined);
  const logSequence = useRef(0);
  const consoleElement = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<HostState>("idle");
  const [serverName, setServerName] = useState("Browser Arena");
  const [map, setMap] = useState("q3dm17");
  const [bots, setBots] = useState(4);
  const [invite, setInvite] = useState<string>();
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState("Waiting to start");
  const [command, setCommand] = useState("");
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [copied, setCopied] = useState(false);

  const appendLog = (level: LogLevel, message: string): void => {
    const lines = message.split(/\r?\n/).filter((line) => line.length > 0);
    if (lines.length === 0) return;
    setLogs((current) => [
      ...current,
      ...lines.map((line) => ({ id: ++logSequence.current, level, message: line })),
    ].slice(-MAX_LOG_LINES));
  };

  useEffect(() => {
    if (consoleElement.current) {
      consoleElement.current.scrollTop = consoleElement.current.scrollHeight;
    }
  }, [logs]);

  const stop = (): void => {
    startupController.current?.abort();
    startupController.current = undefined;
    hostedSession.current?.close();
    hostedSession.current = undefined;
    setInvite(undefined);
    setCopied(false);
    setError(undefined);
    setState("idle");
    setStatus("Server stopped");
    appendLog("info", "Server stopped.");
  };

  useEffect(() => () => {
    startupController.current?.abort();
    hostedSession.current?.close();
  }, []);

  const start = async (): Promise<void> => {
    const normalizedName = serverName.replace(/[\x00-\x1f"\\;]/g, "").trim().slice(0, 64);
    const normalizedMap = map.trim();
    if (!normalizedName || !MAP_PATTERN.test(normalizedMap)) {
      setError("Enter a valid server name and map name.");
      return;
    }
    setError(undefined);
    setCopied(false);
    setLogs([]);
    appendLog("info", `Starting ${normalizedName} on ${normalizedMap}...`);
    setState("loading");
    setStatus("Loading your Quake III assets");
    startupController.current?.abort();
    const controller = new AbortController();
    startupController.current = controller;
    try {
      const assets = await baseGameAssets();
      if (controller.signal.aborted) return;
      setState("starting");
      setStatus("Starting the authoritative server in a Web Worker");
      const session = await createQ3BrowserHostedSession(relayUrl(), {
        assets,
        workerUrl: "/browser-host/host-worker.js",
        game: { map: normalizedMap },
        cvars: {
          sv_hostname: normalizedName,
          sv_maxclients: 16,
          g_gametype: 0,
          fraglimit: normalizedMap === TRANSIT_HUB_MAP ? 0 : 20,
          timelimit: normalizedMap === TRANSIT_HUB_MAP ? 0 : 15,
          bot_enable: normalizedMap === TRANSIT_HUB_MAP ? 0 : 1,
          bot_minplayers: normalizedMap === TRANSIT_HUB_MAP ? 0 : bots,
        },
        signal: controller.signal,
        onConsole: (level, message) => {
          appendLog(level, message);
          if (message.includes("Server Initialization Complete")) {
            setStatus("Listed and accepting players");
          } else if (message.includes("Server Initialization")) {
            setStatus("Loading map and game VM");
          }
        },
        onError: (cause) => {
          if (controller.signal.aborted) return;
          appendLog("error", cause.message);
          setError(cause.message);
          setState("error");
          setStatus("Hosting failed");
        },
      });
      if (controller.signal.aborted) {
        session.close();
        return;
      }
      hostedSession.current = session;
      setInvite(inviteUrl(session, normalizedName, normalizedMap));
      setState("ready");
      setStatus("Listed and accepting players");
    } catch (cause) {
      if (controller.signal.aborted) return;
      const message = cause instanceof Error ? cause.message : String(cause);
      appendLog("error", message);
      setError(message);
      setState("error");
      setStatus("Hosting failed");
    }
  };

  const runCommand = (value: string): void => {
    try {
      hostedSession.current?.command(value);
      appendLog("command", `] ${value}`);
      setError(undefined);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      appendLog("error", message);
      setError(message);
    }
  };

  const loadSelectedMap = (): void => {
    const session = hostedSession.current;
    if (!session) return;
    runCommand(`map ${map}`);
    setInvite(inviteUrl(session, serverName, map));
    setStatus(`Loading ${map}`);
  };

  const updateBots = (nextBots: number): void => {
    setBots(nextBots);
    if (state === "ready") runCommand(`set bot_minplayers ${nextBots}`);
  };

  const copyInvite = async (): Promise<void> => {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite);
      setCopied(true);
      setError(undefined);
    } catch {
      setError("The invite link could not be copied. Allow clipboard access and try again.");
    }
  };

  const busy = state === "loading" || state === "starting";
  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
      <section>
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.24em] text-primary">Temporary browser hosting</p>
        <h1 className="text-4xl font-black uppercase tracking-tight sm:text-6xl">Host a game from this tab.</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
          Start an arena without installing server software or opening ports. Share the invite link, then keep this page open while everyone plays.
        </p>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Need a game that stays online without this browser? <Link href="/guide" className="font-semibold text-foreground underline decoration-border underline-offset-4 hover:text-primary">Run a dedicated server instead.</Link>
        </p>
        <div className="mt-8 border border-border bg-card p-5 font-mono text-sm" aria-live="polite">
          <div className="flex items-center gap-3 text-foreground">
            <span className={`size-2 ${state === "ready" ? "bg-emerald-400" : state === "error" ? "bg-destructive" : busy ? "bg-primary motion-safe:animate-pulse" : "bg-muted-foreground"}`} />
            <span className="uppercase tracking-wider">{status}</span>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Keep this page open. Hosting is temporary: the server may end an inactive game or one that reaches its time limit. Closing this tab ends the game.
          </p>
        </div>
      </section>

      <section className="border border-border bg-card p-5 sm:p-6">
        <div className="mb-6 flex items-center gap-3">
          <DesktopTower className="size-6 text-primary" />
          <h2 className="font-mono text-lg font-bold uppercase tracking-wider">Arena setup</h2>
        </div>
        <div className="space-y-5">
          <label className="block font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Server name
            <input className="mt-2 h-11 w-full border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary" maxLength={64} value={serverName} onChange={(event) => setServerName(event.target.value)} disabled={busy || state === "ready"} />
          </label>
          <label className="block font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Level
            <select className="mt-2 h-11 w-full border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary" value={map} onChange={(event) => {
              const nextMap = event.target.value;
              setMap(nextMap);
              if (nextMap === TRANSIT_HUB_MAP) updateBots(0);
            }} disabled={busy}>
              <optgroup label="Q3JS experiences">
                <option value={TRANSIT_HUB_MAP}>Transit Hub ({TRANSIT_HUB_MAP})</option>
              </optgroup>
              <optgroup label="Deathmatch arenas">
                {DEATHMATCH_ARENAS.map(([value, label]) => <option key={value} value={value}>{label} ({value})</option>)}
              </optgroup>
              <optgroup label="Tournament arenas">
                {TOURNAMENT_ARENAS.map(([value, label]) => <option key={value} value={value}>{label} ({value})</option>)}
              </optgroup>
            </select>
          </label>
          <label className="block font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {map === TRANSIT_HUB_MAP ? "Bots disabled in Transit Hub" : `Target players: ${bots} (bots fill empty slots)`}
            <input className="mt-3 w-full accent-[var(--primary)]" type="range" min={0} max={8} value={bots} onChange={(event) => updateBots(Number(event.target.value))} disabled={busy || map === TRANSIT_HUB_MAP} />
          </label>
          {error ? <p role="alert" className="border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
          {state === "ready" && invite ? (
            <div className="space-y-3">
              <div className="border border-primary/50 bg-primary/5 p-3 text-sm">
                Your arena is live and listed. Copy the invite for friends, then enter in a second tab to play.
              </div>
              <Button className="w-full" onClick={() => void copyInvite()}>
                <Copy /> {copied ? "Invite link copied" : "Copy invite link"}
              </Button>
              <Button className="w-full" variant="outline" onClick={() => window.open(invite, "_blank")}>
                <ArrowSquareOut /> Enter arena in new tab
              </Button>
              <details className="border border-border bg-background/30 p-3">
                <summary className="cursor-pointer font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground">Map and server controls</summary>
                <div className="mt-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button variant="outline" onClick={loadSelectedMap}>Load selected level</Button>
                    <Button variant="outline" onClick={() => runCommand("map_restart 0")}>
                      <ArrowClockwise /> Restart map
                    </Button>
                  </div>
                  <form className="flex gap-2" onSubmit={(event) => {
                    event.preventDefault();
                    const nextCommand = command.trim();
                    if (!nextCommand) return;
                    runCommand(nextCommand);
                    setCommand("");
                  }}>
                    <label className="min-w-0 flex-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      Advanced command
                      <input className="mt-2 h-10 w-full border border-border bg-background px-3 text-sm normal-case text-foreground outline-none focus:border-primary" maxLength={1024} placeholder="status" value={command} onChange={(event) => setCommand(event.target.value)} />
                    </label>
                    <Button className="mt-6" type="submit">Run</Button>
                  </form>
                </div>
              </details>
              <Button className="w-full" variant="destructive" onClick={stop}>
                <Stop /> End hosted game
              </Button>
            </div>
          ) : busy ? (
            <Button className="w-full" variant="outline" onClick={stop}>
              <Stop /> Cancel startup
            </Button>
          ) : (
            <Button className="w-full" onClick={() => void start()}>
              <DesktopTower /> Start temporary arena
            </Button>
          )}
        </div>
      </section>
      </div>

      <details className="border border-border bg-card">
        <summary className="flex cursor-pointer items-center justify-between px-4 py-3 sm:px-5">
          <span className="flex items-center gap-3">
            <span className="font-mono text-primary" aria-hidden="true">&gt;_</span>
            <span className="font-mono text-sm font-bold uppercase tracking-wider">Server console</span>
          </span>
          <span className="font-mono text-xs text-muted-foreground">{logs.length} lines</span>
        </summary>
        <div ref={consoleElement} role="log" tabIndex={0} className="h-80 overflow-y-auto bg-black/70 p-4 font-mono text-[11px] leading-5 outline-none focus-visible:ring-1 focus-visible:ring-ring sm:p-5 sm:text-xs">
          {logs.length === 0 ? (
            <p className="text-muted-foreground">Server output will appear here after startup.</p>
          ) : logs.map((line) => (
            <div key={line.id} className={`whitespace-pre-wrap break-words ${line.level === "error" ? "text-destructive" : line.level === "command" ? "text-primary" : "text-foreground/80"}`}>
              {line.message}
            </div>
          ))}
        </div>
        <div className="border-t border-border px-4 py-2 text-right">
          <Button size="xs" variant="ghost" disabled={logs.length === 0} onClick={() => setLogs([])}>Clear console</Button>
        </div>
      </details>
    </div>
  );
}
