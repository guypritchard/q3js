"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  ArrowClockwise,
  DiceFive,
  LockKey,
  Microphone,
  SealCheck,
  Users,
} from "@phosphor-icons/react";
import { Q3ColoredText } from "@/components/q3-colored-text";
import { QueryBoundary } from "@/components/query-boundary";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlayerName } from "@/hooks/use-player-name";
import { createAnalyticsId, trackAnalyticsEvent } from "@/lib/analytics";
import { humanPlayerCount, joinServerHref } from "@/lib/join-server";
import type { ListedServer } from "@/lib/master-server";
import { masterServerQueryOptions } from "@/lib/master-server-query";
import { playerNameOrRandom } from "@/lib/player-name";
import {
  storedVoiceDeviceId,
  storedVoiceEnabled,
  storeVoicePreferences,
} from "@/lib/voice-preferences";

type JoinEntryPoint = "quick_play" | "server_card";

const DEFAULT_VOICE_DEVICE = "default";

function isOpen(server: ListedServer): boolean {
  return server.capacity === 0 || server.players < server.capacity;
}

function occupancy(server: ListedServer): number {
  return server.capacity > 0 ? Math.min(100, (server.players / server.capacity) * 100) : 0;
}

function countLabel(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function pingColor(ping: number): string {
  if (ping <= 0) return "text-muted-foreground";
  if (ping < 50) return "text-green-500";
  if (ping < 100) return "text-yellow-500";
  return "text-primary";
}

function Metadata({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <span className="inline-flex min-h-6 items-center gap-1.5 border border-border/60 px-2 font-mono text-xs text-muted-foreground">
      {children}
    </span>
  );
}

function PlayerNameDialog({
  onOpenChange,
  open,
  server,
  entryPoint,
}: Readonly<{
  onOpenChange: (open: boolean) => void;
  open: boolean;
  server?: ListedServer;
  entryPoint?: JoinEntryPoint;
}>) {
  const { playerName, randomizePlayerName, setPlayerName } = usePlayerName();
  const [voiceEnabled, setVoiceEnabled] = useState(
    () => typeof window !== "undefined" && storedVoiceEnabled(),
  );
  const [voiceDeviceId, setVoiceDeviceId] = useState(
    () => typeof window !== "undefined" ? storedVoiceDeviceId() ?? "" : "",
  );
  const [voiceDevices, setVoiceDevices] = useState<MediaDeviceInfo[]>([]);
  const [voiceSetupState, setVoiceSetupState] = useState<"idle" | "configuring" | "ready" | "error">(
    () => typeof window !== "undefined" && storedVoiceEnabled() && storedVoiceDeviceId() ? "ready" : "idle",
  );
  const [voiceSetupError, setVoiceSetupError] = useState<string>();

  const prepareVoice = useCallback(async (preferredDeviceId?: string) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceSetupState("error");
      setVoiceSetupError("This browser does not support microphone access.");
      return;
    }

    setVoiceSetupState("configuring");
    setVoiceSetupError(undefined);
    let stream: MediaStream | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: preferredDeviceId ? { deviceId: { exact: preferredDeviceId } } : true,
        video: false,
      });
      const activeDeviceId = stream.getAudioTracks()[0]?.getSettings().deviceId;
      const devices = (await navigator.mediaDevices.enumerateDevices())
        .filter((device) => device.kind === "audioinput");
      const selectedDeviceId = devices.some((device) => device.deviceId === preferredDeviceId)
        ? preferredDeviceId
        : activeDeviceId || devices[0]?.deviceId || "";
      setVoiceDevices(devices);
      setVoiceDeviceId(selectedDeviceId ?? "");
      setVoiceSetupState("ready");
    } catch (setupError) {
      setVoiceSetupState("error");
      setVoiceSetupError(
        setupError instanceof DOMException && setupError.name === "NotAllowedError"
          ? "Microphone permission was denied. Allow access or join without voice."
          : "The selected microphone could not be opened.",
      );
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (navigator.mediaDevices?.enumerateDevices) {
      void navigator.mediaDevices.enumerateDevices().then((devices) => {
        setVoiceDevices(devices.filter((device) => device.kind === "audioinput"));
      }).catch(() => undefined);
    }
  }, [open]);

  const join = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!server || !entryPoint) return;

    const name = playerNameOrRandom(playerName);
    const handoffId = createAnalyticsId();
    setPlayerName(name);
    storeVoicePreferences(voiceEnabled, voiceEnabled ? voiceDeviceId : undefined);
    trackAnalyticsEvent("server_join_submitted", {
      join_handoff_id: handoffId,
      server_id: server.id,
      server_mode: server.mode,
      server_map: server.map,
      server_official: server.official,
      human_players_visible: humanPlayerCount(server),
      join_entry_point: entryPoint,
      voice_enabled: voiceEnabled,
    });
    window.location.assign(joinServerHref(server, name, entryPoint, handoffId, voiceEnabled));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] min-w-0 overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ready to play?</DialogTitle>
          <DialogDescription>
            You are joining <span className="break-words font-semibold text-foreground">{server?.name}</span>
            {server ? ` on ${server.map.toUpperCase()}` : ""}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={join} className="min-w-0">
          <p className="mb-5 border-l-2 border-primary bg-primary/5 px-3 py-2 text-xs leading-5 text-muted-foreground">
            The first launch may take a moment while game data downloads. In game, use WASD and mouse; press Esc for the menu.
          </p>
          <label htmlFor="join-player-name" className="block font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
            Player name
          </label>
          <div className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
            <input
              id="join-player-name"
              autoFocus
              required
              maxLength={32}
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
              placeholder="Enter your player name"
              className="h-10 min-w-0 flex-1 border border-border bg-input px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
            />
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              onClick={randomizePlayerName}
              aria-label="Generate a random player name"
            >
              <DiceFive />
            </Button>
          </div>

          <div className="mt-5 min-w-0 border border-border bg-background/35 p-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={voiceEnabled}
                onChange={(event) => {
                  const enabled = event.target.checked;
                  setVoiceEnabled(enabled);
                  setVoiceSetupError(undefined);
                  if (enabled) {
                    setVoiceSetupState(voiceDeviceId ? "ready" : "idle");
                  } else {
                    setVoiceSetupState("idle");
                  }
                }}
                className="mt-0.5 size-4 accent-primary"
              />
              <span className="min-w-0 overflow-hidden">
                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
                  <Microphone className="size-4 shrink-0" aria-hidden="true" />
                  Join server voice chat
                </span>
                <span className="mt-1 block text-xs leading-4 text-muted-foreground">
                  Voice is push-to-talk. Your microphone stays muted unless you hold K.
                </span>
              </span>
            </label>

            {voiceEnabled && (
              <div className="mt-3 min-w-0 border-t border-border/60 pt-3">
                <label htmlFor="join-voice-device" className="block font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
                  Microphone
                </label>
                <div className="mt-2 grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Select
                    value={voiceDeviceId || DEFAULT_VOICE_DEVICE}
                    onValueChange={(value) => {
                      const selectedDeviceId = value === DEFAULT_VOICE_DEVICE ? "" : value;
                      setVoiceDeviceId(selectedDeviceId);
                      void prepareVoice(selectedDeviceId || undefined);
                    }}
                  >
                    <SelectTrigger id="join-voice-device" className="w-full min-w-0">
                      <SelectValue placeholder="Default microphone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DEFAULT_VOICE_DEVICE}>Default microphone</SelectItem>
                      {voiceDevices.filter((device) => device.deviceId).map((device, index) => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label || `Microphone ${index + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full whitespace-nowrap sm:w-auto"
                    disabled={voiceSetupState === "configuring"}
                    onClick={() => void prepareVoice(voiceDeviceId || undefined)}
                  >
                    {voiceSetupState === "configuring" ? "Opening mic…" : "Test access"}
                  </Button>
                </div>
                {voiceSetupState === "ready" && (
                  <p className="mt-2 text-xs text-green-500">Microphone ready. Hold K in game to transmit.</p>
                )}
                {voiceSetupState === "idle" && (
                  <p className="mt-2 text-xs text-muted-foreground">Select a microphone, then test access.</p>
                )}
                {voiceSetupError && (
                  <p role="alert" className="mt-2 text-xs leading-4 text-primary">{voiceSetupError}</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="mt-5">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={!server || voiceSetupState === "configuring" || (voiceEnabled && voiceSetupState === "error")}
            >
              Enter arena
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ServerCard({ onJoin, server }: Readonly<{
  onJoin: (server: ListedServer) => void;
  server: ListedServer;
}>) {
  const humanPlayers = server.users.filter((player) => !player.bot);
  const botPlayers = server.users.filter((player) => player.bot);
  const botCount = botPlayers.length;
  const visiblePlayers = [...humanPlayers, ...botPlayers].slice(0, 5);
  const full = !isOpen(server);
  const unavailable = full || server.passwordProtected;

  return (
    <article className={`arena-card border ${server.official ? "border-primary/60 bg-card/80" : "border-border/60 bg-card/50"}`}>
      <div className="p-4 sm:p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-start gap-2">
              <h3 className="min-w-0 flex-[1_1_12rem] break-words font-mono text-xl font-bold leading-tight tracking-[0.025em] sm:text-2xl">
                <Q3ColoredText text={server.coloredName} />
              </h3>
              {server.official && (
                <span className="inline-flex shrink-0 items-center gap-1 border border-primary/50 bg-primary/10 px-2 py-1 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-primary">
                  <SealCheck className="size-4" weight="fill" aria-hidden="true" />
                  Official
                </span>
              )}
              {!server.official && (
                <span className="inline-flex shrink-0 items-center border border-border/70 bg-secondary/60 px-2 py-1 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Community
                </span>
              )}
              {server.passwordProtected && <LockKey className="size-4 text-muted-foreground" aria-label="Password required" />}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {server.mode} on <span className="font-mono text-foreground">{server.map.toUpperCase()}</span>
              {server.location !== "Unknown" ? ` · ${server.location}` : ""}
            </p>
          </div>
          {!unavailable ? (
            <Button size="lg" className="w-full sm:w-auto sm:self-start" onClick={() => onJoin(server)}>
              Join arena
            </Button>
          ) : (
            <Button size="lg" className="w-full sm:w-auto sm:self-start" disabled>
              {server.passwordProtected ? "Password required" : "Server full"}
            </Button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Metadata>{server.limits}</Metadata>
          {server.hosted && <Metadata>Temporary browser host</Metadata>}
          {server.passwordProtected && <Metadata><LockKey aria-hidden="true" /> Locked</Metadata>}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
            <span className="font-mono font-bold">{countLabel(humanPlayers.length, "human player")}</span>
            <span className="text-muted-foreground">{countLabel(botCount, "bot")}</span>
            <div className="h-1.5 w-24 overflow-hidden bg-secondary" aria-hidden="true">
              <div className="h-full bg-primary" style={{ width: `${occupancy(server)}%` }} />
            </div>
            <span className="text-muted-foreground">{server.players}/{server.capacity || "—"} slots</span>
          </div>
          <span className={`font-mono ${pingColor(server.ping)}`}>
            {server.ping > 0 ? `${server.ping} ms` : "Ping pending"}
          </span>
        </div>

        <div className="mt-5 border-t border-border/50 pt-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="size-4" />
            <span className="font-semibold text-foreground">Who is playing</span>
          </div>
          <div className="border border-border/40 bg-background/40">
            <div className="grid grid-cols-[4rem_4rem_minmax(0,1fr)] border-b border-border/40 px-3 py-2 font-mono text-[11px] text-muted-foreground">
              <span>Score</span>
              <span>Ping</span>
              <span>Name</span>
            </div>
            {visiblePlayers.length ? (
              visiblePlayers.map((player, index) => (
                <div
                  key={`${player.name}-${index}`}
                  className="grid grid-cols-[4rem_4rem_minmax(0,1fr)] px-3 py-1.5 font-mono text-[11px] text-foreground odd:bg-background/40"
                >
                  <span className="tabular-nums">{player.score}</span>
                  <span className="tabular-nums">{player.bot ? "BOT" : player.ping}</span>
                  {player.bot ? (
                    <Q3ColoredText text={player.name} className="block min-w-0 truncate text-muted-foreground" />
                  ) : (
                    <Link href={`/players/${encodeURIComponent(player.name)}`} className="min-w-0 truncate transition-opacity hover:opacity-80">
                      <Q3ColoredText text={player.name} className="block truncate" />
                    </Link>
                  )}
                </div>
              ))
            ) : (
              <p className="px-3 py-4 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                No one is playing yet
              </p>
            )}
            {server.users.length > visiblePlayers.length && (
              <p className="border-t border-border/40 px-3 py-2 text-xs text-muted-foreground">
                {server.users.length - visiblePlayers.length} more players in this arena.
              </p>
            )}
          </div>
          <details className="mt-3 text-xs text-muted-foreground">
            <summary className="w-fit cursor-pointer font-mono uppercase tracking-[0.08em] hover:text-foreground">Connection details</summary>
            <p className="mt-2 break-all font-mono">
              {server.host}:{server.targetPort > 0 ? server.targetPort : server.proxyPort} · Protocol {server.protocol} · {server.version}
            </p>
          </details>
        </div>
      </div>

    </article>
  );
}

function BrowserHeading({ serverCount, playerCount, pending = false }: Readonly<{
  serverCount?: number;
  playerCount?: number;
  pending?: boolean;
}>) {
  return (
    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end sm:gap-4">
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.16em] text-primary">Live arenas</p>
        <h2 id="servers-heading" className="font-mono text-2xl font-bold uppercase tracking-[0.035em] md:text-3xl">Choose where to play</h2>
        <p className="mt-2 text-base text-muted-foreground">Quick play picks an unlocked arena with people and a good connection.</p>
      </div>
      {serverCount !== undefined && (
        <p className="flex shrink-0 flex-wrap gap-x-3 font-mono text-xs leading-5 text-muted-foreground sm:block sm:text-right">
          <span>{countLabel(serverCount, "server")}</span><br className="hidden sm:block" />
          <span>{countLabel(playerCount ?? 0, "human")} online</span>
        </p>
      )}
      {pending && (
        <div className="w-20 shrink-0 space-y-2" aria-hidden="true">
          <Skeleton className="ml-auto h-2 w-14" />
          <Skeleton className="ml-auto h-2 w-20 bg-muted/70" />
        </div>
      )}
    </div>
  );
}

function ServerBrowserQuery() {
  const [selection, setSelection] = useState<{
    server: ListedServer;
    entryPoint: JoinEntryPoint;
  }>();
  const { data: servers, error, isFetching, refetch } = useSuspenseQuery(masterServerQueryOptions());
  // Keep the first meaningful order within each official/community group for
  // this visit. Live player counts would otherwise reshuffle cards every poll.
  const [serverOrder] = useState<ReadonlyMap<string, number>>(
    () => new Map(servers.map((server, index) => [server.id, index])),
  );

  const orderedServers = useMemo(() => {
    return [...servers].sort((left, right) => {
      if (left.official !== right.official) return left.official ? -1 : 1;

      const leftOrder = serverOrder.get(left.id);
      const rightOrder = serverOrder.get(right.id);

      if (leftOrder !== undefined && rightOrder !== undefined) return leftOrder - rightOrder;
      if (leftOrder !== undefined) return -1;
      if (rightOrder !== undefined) return 1;
      return left.id.localeCompare(right.id);
    });
  }, [serverOrder, servers]);

  const playerCount = servers.reduce((total, server) => total + humanPlayerCount(server), 0);
  const quickPlayServer = useMemo(() => [...orderedServers]
    .filter((server) => isOpen(server) && !server.passwordProtected)
    .sort((left, right) => {
      const playerDifference = humanPlayerCount(right) - humanPlayerCount(left);
      if (playerDifference !== 0) return playerDifference;
      const leftPing = left.ping > 0 ? left.ping : Number.MAX_SAFE_INTEGER;
      const rightPing = right.ping > 0 ? right.ping : Number.MAX_SAFE_INTEGER;
      return leftPing - rightPing;
    })[0], [orderedServers]);

  return (
    <section id="servers" aria-labelledby="servers-heading" className="scroll-mt-20">
      <BrowserHeading serverCount={servers.length} playerCount={playerCount} />

      <div className="mt-5 border border-border/60 bg-card/60 p-3 sm:mt-6 sm:p-4">
        <div className="flex gap-2 sm:gap-3">
          {quickPlayServer && (
            <Button
              size="lg"
              className="h-10 flex-1 px-4 sm:flex-none"
              onClick={() => setSelection({ server: quickPlayServer, entryPoint: "quick_play" })}
              aria-label={`Quick play on ${quickPlayServer.name}`}
            >
              Quick play
            </Button>
          )}
          <Button
            variant="outline"
            size="icon-lg"
            className="size-10 shrink-0 bg-transparent"
            disabled={isFetching}
            onClick={() => void refetch()}
            aria-label="Refresh server list"
          >
            <ArrowClockwise className={isFetching ? "animate-spin" : undefined} />
          </Button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="fixed bottom-4 left-4 right-4 z-50 border border-primary/60 bg-background px-4 py-3 text-sm text-primary shadow-lg sm:left-auto sm:max-w-md"
        >
          Refresh failed: {error.message}. Showing cached results.
        </p>
      )}

      {orderedServers.length ? (
        <div className="mt-5 grid gap-4">
          {orderedServers.map((server) => (
            <ServerCard
              key={server.id}
              onJoin={(selected) => setSelection({ server: selected, entryPoint: "server_card" })}
              server={server}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 border border-border/60 bg-card/50 px-4 py-8 text-center sm:px-6 sm:py-12">
          <p className="text-base font-semibold">
            No servers are live right now.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Refresh the list or start a temporary arena.
          </p>
          <Link href="/host" className="mt-4 inline-flex h-10 items-center bg-primary px-4 font-mono text-xs font-bold uppercase text-primary-foreground hover:bg-primary/85">
            Host an arena
          </Link>
        </div>
      )}

      <PlayerNameDialog
        open={selection !== undefined}
        server={selection?.server}
        entryPoint={selection?.entryPoint}
        onOpenChange={(open) => {
          if (!open) setSelection(undefined);
        }}
      />
    </section>
  );
}

function ServerBrowserPending() {
  return (
    <section id="servers" aria-labelledby="servers-heading" aria-busy="true">
      <BrowserHeading pending />

      <div className="mt-5 border border-border/60 bg-card/60 p-3 sm:mt-6 sm:p-4" aria-hidden="true">
        <div className="flex gap-2 sm:gap-3">
          <Button size="lg" className="h-10 flex-1 px-4 sm:flex-none" disabled>Quick play</Button>
          <Button variant="outline" size="icon-lg" className="size-10 bg-transparent" disabled>
            <ArrowClockwise className="animate-spin" />
          </Button>
        </div>
      </div>

      <article className="arena-card mt-5 border border-border/60 bg-card/50" aria-hidden="true">
        <div className="p-4 sm:p-5 md:p-6">
          <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-5 w-44 max-w-[70%]" />
              <Skeleton className="mt-2 h-2 w-28 bg-muted/70" />
            </div>
            <Button size="lg" className="w-full sm:w-auto" disabled>Join arena</Button>
          </div>

          <div className="mt-4 flex gap-2">
            <Skeleton className="h-6 w-16 bg-muted/70" />
            <Skeleton className="h-6 w-24 bg-muted/70" />
            <Skeleton className="h-6 w-28 bg-muted/70" />
          </div>

          <div className="mt-5 flex items-center gap-3">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-1.5 w-24 bg-muted/70" />
            <span className="text-sm text-muted-foreground">players</span>
            <Skeleton className="ml-3 h-3 w-10" />
          </div>

          <div className="mt-5 border-t border-border/50 pt-4">
            <div className="grid grid-cols-[minmax(0,1fr)_5rem_5rem] px-3 pb-2 font-mono text-xs uppercase text-muted-foreground">
              <span>Players</span>
              <span className="text-right">Score</span>
              <span className="text-right">Ping</span>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_5rem_5rem] items-center bg-background/25 px-3 py-2.5">
              <Skeleton className="h-3 w-32 max-w-[75%]" />
              <Skeleton className="ml-auto h-3 w-5" />
              <Skeleton className="ml-auto h-3 w-8" />
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}

function ServerBrowserError({ error, reset }: Readonly<{ error: Error; reset: () => void }>) {
  return (
    <section id="servers" aria-labelledby="servers-heading">
      <BrowserHeading />
      <div className="mt-6 border border-border/60 bg-card/50 px-6 py-12 text-center">
        <p role="alert" className="text-base font-semibold">Master server unavailable.</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-5 text-muted-foreground">{error.message}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={reset}>
          <ArrowClockwise /> Try again
        </Button>
      </div>
    </section>
  );
}

export function ServerBrowser() {
  return (
    <QueryBoundary
      pendingFallback={<ServerBrowserPending />}
      errorFallback={(props) => <ServerBrowserError {...props} />}
    >
      <ServerBrowserQuery />
    </QueryBoundary>
  );
}
