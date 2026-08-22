"use client";

import type { Q3Asset, Q3Client, Q3ClientOptions, Q3ClientProgress } from "@q3js/client";
import { ArrowClockwise, ArrowLeft, Play, X } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameCanvas } from "@/components/game-canvas";
import { MobileControls } from "@/components/mobile-controls";
import { Button } from "@/components/ui/button";
import { VoiceChat } from "@/components/voice-chat";
import { useMobileGame } from "@/hooks/use-mobile-game";
import { usePlayerName } from "@/hooks/use-player-name";
import {
  classifyPlayError,
  createAnalyticsId,
  trackAnalyticsEvent,
  type AnalyticsParameters,
} from "@/lib/analytics";
import { getRequesterCountry, servers as listServers } from "@/lib/api/generated/sdk.gen";
import { client } from "@/lib/api/client";
import { humanPlayerCount, joinServerHref } from "@/lib/join-server";
import { mapServers, type ListedServer } from "@/lib/master-server";
import { playerNameOrRandom } from "@/lib/player-name";

const PK3_FILE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*\.pk3$/;
const STATIC_BASE_URL = (process.env.NEXT_PUBLIC_Q3JS_STATIC_URL?.trim() || "").replace(/\/+$/, "");
const CONNECTION_POLL_MS = 1_000;
const CONNECTION_TIMEOUT_MS = 30_000;
const DISCONNECT_GRACE_POLLS = 3;
const HEARTBEAT_INTERVAL_MS = 60_000;
const PORTAL_REFRESH_MS = 5_000;
const PORTAL_SLOT_COUNT = 16;
const ASSET_PERCENT_MILESTONES = [25, 50, 75, 100] as const;

function stockMapIndex(map: string): number {
  const deathmatch = /^q3dm(\d|1\d)$/.exec(map.toLowerCase());
  if (deathmatch) return Number.parseInt(deathmatch[1], 10);
  const tournament = /^q3tourney([1-6])$/.exec(map.toLowerCase());
  return tournament ? 19 + Number.parseInt(tournament[1], 10) : -1;
}

function portalMatchScore(server: ListedServer): number {
  const players = humanPlayerCount(server);
  const targetPlayers = Math.min(6, Math.max(2, Math.round((server.capacity || 8) * 0.4)));
  const latency = server.ping > 0 ? server.ping : 1_000;
  return latency + Math.abs(players - targetPlayers) * 12;
}

function staticUrl(path: string): string {
  return `${STATIC_BASE_URL}/${path}`;
}

async function assetsForDirectory(gameDirectory: string): Promise<readonly Q3Asset[]> {
  const encodedDirectory = encodeURIComponent(gameDirectory);
  const response = await fetch(staticUrl(`${encodedDirectory}/manifest.json`), { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Unable to load the ${gameDirectory} asset manifest (HTTP ${response.status}).`);
  }

  const manifest: unknown = await response.json();
  const files = typeof manifest === "object" && manifest !== null && "files" in manifest
    ? (manifest as { files?: unknown }).files
    : undefined;
  if (!Array.isArray(files) || !files.every((file) => typeof file === "string" && PK3_FILE_PATTERN.test(file))) {
    throw new Error(`The ${gameDirectory} asset manifest is invalid.`);
  }
  if (files.length === 0) {
    throw new Error(`No ${gameDirectory} PK3 files are available on the static server.`);
  }

  return [...new Set(files)].map((filename) => ({
    url: staticUrl(`${encodedDirectory}/${encodeURIComponent(filename)}`),
    path: `/${gameDirectory}/${filename}`,
  }));
}

async function assetsForGame(baseGame: string, fsGame: string | undefined): Promise<readonly Q3Asset[]> {
  const directories = [baseGame];
  if (fsGame && fsGame.toLowerCase() !== "q3js" && fsGame !== baseGame) {
    directories.push(fsGame);
  }
  return (await Promise.all(directories.map(assetsForDirectory))).flat();
}

interface Session {
  playerName: string;
  countryCode?: string;
  websocketUrl: string;
  subprotocol?: string | null;
  address: string;
  baseGame: string;
  fsGame?: string;
  comGameName: string;
  assets: readonly Q3Asset[];
}

async function requesterCountryCode(): Promise<string | undefined> {
  try {
    const { data: country } = await getRequesterCountry({
      client,
      signal: AbortSignal.timeout(2_000),
    });
    const countryCode = country.countryCode?.trim().toUpperCase();
    return countryCode && /^[A-Z]{2}$/.test(countryCode) ? countryCode : undefined;
  } catch {
    return undefined;
  }
}

export interface SelectedServer {
  id: string;
  hosted: boolean;
  gatewayUrl?: string;
  host: string;
  proxyPort: number;
  secure: boolean;
  baseGame: string;
  fsGame?: string;
  comGameName: string;
  name: string;
  mode: string;
  map: string;
  official: boolean;
  humanPlayers: number;
  protocol: number;
  ping: number;
  entryPoint?: string;
  handoffId?: string;
}

interface PlayClientProps {
  selectedServer?: SelectedServer;
  initialPlayerName?: string;
  voiceEnabled?: boolean;
}

interface PlayTelemetrySession {
  id: string;
  startedAt: number;
  readyAt?: number;
  connectedAt?: number;
  heartbeatCount: number;
  disconnectedPolls: number;
  ended: boolean;
  phases: Set<Q3ClientProgress["phase"]>;
  assetMilestones: Set<number>;
  assetCount?: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 MB";
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function progressLabel(progress: Q3ClientProgress | undefined): string {
  if (!progress) {
    return "Preparing client";
  }
  switch (progress.phase) {
    case "loading-engine":
      return "Loading game engine";
    case "preparing-filesystem":
      return "Opening local game storage";
    case "loading-assets":
      return progress.currentAsset ? `Loading ${progress.currentAsset}` : "Loading game data";
    case "starting":
      return "Starting Quake III";
    case "ready":
      return "Client ready";
  }
}

export function PlayClient({ selectedServer, initialPlayerName, voiceEnabled = false }: PlayClientProps) {
  const { playerName, setPlayerName } = usePlayerName(initialPlayerName);
  const [session, setSession] = useState<Session>();
  const [progress, setProgress] = useState<Q3ClientProgress>();
  const [error, setError] = useState<string>();
  const [exited, setExited] = useState(false);
  const [gameClient, setGameClient] = useState<Q3Client>();
  const [autoStartSuppressed, setAutoStartSuppressed] = useState(false);
  const gameShellRef = useRef<HTMLElement>(null);
  const autoStartRef = useRef(false);
  const telemetryRef = useRef<PlayTelemetrySession | undefined>(undefined);
  const progressRef = useRef<Q3ClientProgress | undefined>(undefined);
  const clientRef = useRef<Q3Client | undefined>(undefined);
  const clientExitedRef = useRef(false);
  const connectionPollRef = useRef<number | undefined>(undefined);
  const heartbeatRef = useRef<number | undefined>(undefined);
  const portalAssignmentsRef = useRef<readonly (ListedServer | undefined)[]>([]);
  const {
    isTouchDevice,
    isLandscape,
    hasSeenLandscape,
    isViewportReady,
    canRequestFullscreen,
    requestLandscapeFullscreen,
  } = useMobileGame(gameShellRef);

  const serverAnalyticsContext = useMemo<AnalyticsParameters>(() => ({
    server_id: selectedServer?.id ?? "default",
    server_mode: selectedServer?.mode ?? "unknown",
    server_map: selectedServer?.map ?? "unknown",
    server_official: selectedServer?.official,
    human_players_at_join: selectedServer?.humanPlayers,
    join_entry_point: selectedServer?.entryPoint ?? (selectedServer ? "direct_link" : "local_default"),
    join_handoff_id: selectedServer?.handoffId,
    base_game: selectedServer?.baseGame ?? "baseq3",
    fs_game: selectedServer?.fsGame ?? (selectedServer ? undefined : "q3js"),
  }), [selectedServer]);

  const trackPlayEvent = useCallback((
    eventName: string,
    telemetry: PlayTelemetrySession,
    parameters: AnalyticsParameters = {},
    options: Readonly<{ beacon?: boolean }> = {},
  ) => {
    trackAnalyticsEvent(eventName, {
      ...serverAnalyticsContext,
      play_session_id: telemetry.id,
      ...parameters,
    }, options);
  }, [serverAnalyticsContext]);

  const clearTelemetryTimers = useCallback(() => {
    if (connectionPollRef.current !== undefined) {
      window.clearInterval(connectionPollRef.current);
      connectionPollRef.current = undefined;
    }
    if (heartbeatRef.current !== undefined) {
      window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = undefined;
    }
  }, []);

  const finishPlaySession = useCallback((
    reason: string,
    options: Readonly<{ beacon?: boolean; errorCode?: string }> = {},
  ) => {
    const telemetry = telemetryRef.current;
    if (!telemetry || telemetry.ended) return;

    telemetry.ended = true;
    const endedAt = Date.now();
    const durationMs = Math.max(0, endedAt - telemetry.startedAt);
    const readyDurationMs = telemetry.readyAt
      ? Math.max(0, endedAt - telemetry.readyAt)
      : undefined;
    const connectedDurationMs = telemetry.connectedAt
      ? Math.max(0, endedAt - telemetry.connectedAt)
      : undefined;
    const terminalParameters = {
      end_reason: reason,
      error_code: options.errorCode,
      duration_ms: durationMs,
      ready_duration_ms: readyDurationMs,
      connected_duration_ms: connectedDurationMs,
      reached_ready: Boolean(telemetry.readyAt),
      reached_connected: Boolean(telemetry.connectedAt),
      heartbeat_count: telemetry.heartbeatCount,
    } satisfies AnalyticsParameters;

    if (telemetry.connectedAt) {
      trackPlayEvent("game_disconnected", telemetry, terminalParameters, options);
    }
    trackPlayEvent("game_session_ended", telemetry, terminalParameters, options);
    clearTelemetryTimers();
    clientRef.current = undefined;
    telemetryRef.current = undefined;
  }, [clearTelemetryTimers, trackPlayEvent]);

  const handleProgress = useCallback((nextProgress: Q3ClientProgress) => {
    const previousProgress = progressRef.current;
    progressRef.current = nextProgress;
    setProgress(nextProgress);

    const telemetry = telemetryRef.current;
    if (!telemetry || telemetry.ended) return;
    const elapsedMs = Date.now() - telemetry.startedAt;

    if (!telemetry.phases.has(nextProgress.phase)) {
      telemetry.phases.add(nextProgress.phase);
      trackPlayEvent("game_load_phase", telemetry, {
        load_phase: nextProgress.phase,
        elapsed_ms: elapsedMs,
        loaded_bytes: nextProgress.loadedBytes,
        total_bytes: nextProgress.totalBytes,
      });
    }

    if (nextProgress.phase === "loading-assets" && nextProgress.totalBytes > 0) {
      const percent = Math.min(100, Math.floor(100 * nextProgress.loadedBytes / nextProgress.totalBytes));
      for (const milestone of ASSET_PERCENT_MILESTONES) {
        if (percent < milestone || telemetry.assetMilestones.has(milestone)) continue;
        telemetry.assetMilestones.add(milestone);
        trackPlayEvent("game_asset_milestone", telemetry, {
          asset_milestone: `download_${milestone}`,
          asset_percent: milestone,
          loaded_bytes: nextProgress.loadedBytes,
          total_bytes: nextProgress.totalBytes,
          elapsed_ms: elapsedMs,
        });
      }
    }

    if (
      nextProgress.phase === "starting"
      && previousProgress?.phase === "loading-assets"
      && !telemetry.assetMilestones.has(100)
    ) {
      telemetry.assetMilestones.add(100);
      trackPlayEvent("game_asset_milestone", telemetry, {
        asset_milestone: previousProgress.totalBytes === 0 ? "cache_ready" : "download_100",
        asset_percent: 100,
        loaded_bytes: previousProgress.loadedBytes,
        total_bytes: previousProgress.totalBytes,
        elapsed_ms: elapsedMs,
      });
    }

    if (nextProgress.phase === "ready" && !telemetry.readyAt) {
      telemetry.readyAt = Date.now();
      trackPlayEvent("game_launch_ready", telemetry, {
        ready_elapsed_ms: telemetry.readyAt - telemetry.startedAt,
        asset_count: telemetry.assetCount,
      });
    }
  }, [trackPlayEvent]);

  const handleClientError = useCallback((clientError: Error) => {
    if (clientExitedRef.current) return;
    setGameClient(undefined);
    setError(clientError.message);
    const telemetry = telemetryRef.current;
    if (!telemetry || telemetry.ended) return;
    const errorCode = classifyPlayError(clientError);
    trackPlayEvent("game_launch_error", telemetry, {
      error_code: errorCode,
      error_phase: progressRef.current?.phase ?? "client_start",
      elapsed_ms: Date.now() - telemetry.startedAt,
    });
    finishPlaySession("launch_error", { errorCode });
  }, [finishPlaySession, trackPlayEvent]);

  const handleClientExit = useCallback((status: number) => {
    if (status !== 0) {
      handleClientError(new Error(`Q3JS exited unexpectedly (status ${status}).`));
      return;
    }
    clientExitedRef.current = true;
    setGameClient(undefined);
    setError(undefined);
    setExited(true);
    finishPlaySession("game_exit");
  }, [finishPlaySession, handleClientError]);

  const emitHeartbeat = useCallback(() => {
    const telemetry = telemetryRef.current;
    if (!telemetry || telemetry.ended || !telemetry.connectedAt) return;
    telemetry.heartbeatCount += 1;
    trackPlayEvent("game_play_heartbeat", telemetry, {
      heartbeat_index: telemetry.heartbeatCount,
      duration_ms: Date.now() - telemetry.startedAt,
      connected_duration_ms: Date.now() - telemetry.connectedAt,
      document_focused: document.hasFocus(),
    });
  }, [trackPlayEvent]);

  const handleClientReady = useCallback((client: Q3Client) => {
    clientRef.current = client;
    setGameClient(client);
    if (connectionPollRef.current !== undefined) {
      window.clearInterval(connectionPollRef.current);
    }

    const pollConnection = () => {
      const telemetry = telemetryRef.current;
      if (!telemetry || telemetry.ended || clientRef.current !== client) return;

      if (client.connected) {
        telemetry.disconnectedPolls = 0;
        if (!telemetry.connectedAt) {
          telemetry.connectedAt = Date.now();
          trackPlayEvent("game_connected", telemetry, {
            connected_elapsed_ms: telemetry.connectedAt - telemetry.startedAt,
            ready_to_connected_ms: telemetry.readyAt
              ? telemetry.connectedAt - telemetry.readyAt
              : undefined,
          });
          heartbeatRef.current = window.setInterval(emitHeartbeat, HEARTBEAT_INTERVAL_MS);
        }
        return;
      }

      if (telemetry.connectedAt && client.disconnected) {
        telemetry.disconnectedPolls += 1;
        if (telemetry.disconnectedPolls >= DISCONNECT_GRACE_POLLS) {
          setError("Connection to the server was lost.");
          finishPlaySession("connection_lost");
        }
        return;
      }

      telemetry.disconnectedPolls = 0;

      if (!telemetry.connectedAt && telemetry.readyAt && Date.now() - telemetry.readyAt >= CONNECTION_TIMEOUT_MS) {
        setError("Unable to connect to the selected server.");
        trackPlayEvent("game_launch_error", telemetry, {
          error_code: "connection_timeout",
          error_phase: "connecting",
          elapsed_ms: Date.now() - telemetry.startedAt,
        });
        finishPlaySession("connection_timeout", { errorCode: "connection_timeout" });
      }
    };

    pollConnection();
    connectionPollRef.current = window.setInterval(pollConnection, CONNECTION_POLL_MS);
  }, [emitHeartbeat, finishPlaySession, trackPlayEvent]);

  const toggleFullscreen = useCallback(async () => {
    const target = gameShellRef.current;
    if (!target) {
      return;
    }
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
    } else {
      await target.requestFullscreen().catch(() => undefined);
    }
  }, []);

  const handleServerHandoff = useCallback((slot: number) => {
    const destination = portalAssignmentsRef.current[slot];
    if (!destination || !session) {
      return;
    }

    finishPlaySession("portal_handoff");
    window.location.assign(joinServerHref(
      destination,
      session.playerName,
      "portal_hub",
      createAnalyticsId(),
      voiceEnabled,
    ));
  }, [finishPlaySession, session, voiceEnabled]);

  useEffect(() => {
    const handlePageHide = () => finishPlaySession("page_hide", { beacon: true });
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      finishPlaySession("component_unmount", { beacon: true });
    };
  }, [finishPlaySession]);

  useEffect(() => {
    if (!session) {
      return;
    }

    document.documentElement.classList.add("game-page-active");
    document.body.classList.add("game-page-active");
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F11") {
        event.preventDefault();
        void toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.documentElement.classList.remove("game-page-active");
      document.body.classList.remove("game-page-active");
    };
  }, [session, toggleFullscreen]);

  const options = useMemo<Omit<Q3ClientOptions, "canvas"> | undefined>(() => {
    if (!session) {
      return undefined;
    }
    return {
      server: {
        websocketUrl: session.websocketUrl,
        address: session.address,
        ...(session.subprotocol === undefined ? {} : { subprotocol: session.subprotocol }),
      },
      game: {
        comBaseGame: session.baseGame,
        fsBaseGame: session.baseGame,
        ...(session.fsGame ? { fsGame: session.fsGame } : {}),
        comGameName: session.comGameName,
      },
      player: {
        name: session.playerName,
        countryCode: session.countryCode,
      },
      assets: session.assets,
      persistence: { mounts: ["/persist"] },
      ...(isTouchDevice ? {
        cvars: {
          in_nograb: 1,
          in_joystickUseAnalog: 1,
          j_forward: -1,
          j_side: 1,
        },
      } : {}),
      onProgress: handleProgress,
      onConsole: (_level, message) => console.info(`[Q3JS] ${message}`),
      onExit: handleClientExit,
      onServerHandoff: handleServerHandoff,
      onError: handleClientError,
    };
  }, [handleClientError, handleClientExit, handleProgress, handleServerHandoff, isTouchDevice, session]);

  useEffect(() => {
    if (!gameClient || !selectedServer || selectedServer.map.toLowerCase() !== "q3js_hub") {
      portalAssignmentsRef.current = [];
      return;
    }

    let cancelled = false;
    const refreshPortals = async () => {
      try {
        const response = await listServers({ client });
        if (cancelled) return;

        const candidates = mapServers(response.data)
          .filter((server) => (
            server.id !== selectedServer.id
            && server.protocol === selectedServer.protocol
            && server.baseGame === selectedServer.baseGame
            && server.comGameName === selectedServer.comGameName
            && !server.passwordProtected
            && (server.capacity === 0 || server.players < server.capacity)
          ))
          .sort((left, right) => (
            portalMatchScore(left) - portalMatchScore(right)
            || (left.ping || 1_000) - (right.ping || 1_000)
            || humanPlayerCount(right) - humanPlayerCount(left)
            || left.name.localeCompare(right.name)
          ))
          .slice(0, PORTAL_SLOT_COUNT);

        portalAssignmentsRef.current = Array.from(
          { length: PORTAL_SLOT_COUNT },
          (_, slot) => candidates[slot],
        );
        portalAssignmentsRef.current.forEach((server, slot) => {
          gameClient.setPortalInfo(slot, {
            active: Boolean(server),
            bestMatch: slot === 0 && Boolean(server),
            map: server ? stockMapIndex(server.map) : -1,
            ping: server?.ping ?? 0,
            players: server ? humanPlayerCount(server) : 0,
            capacity: server?.capacity ?? 0,
            topScore: server?.users[0]?.score ?? 0,
          });
        });
      } catch (portalError) {
        console.warn("Unable to refresh Transit Hub portals", portalError);
      }
    };

    void refreshPortals();
    const refreshTimer = window.setInterval(() => void refreshPortals(), PORTAL_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, [gameClient, selectedServer]);

  const start = useCallback(async () => {
    finishPlaySession("restart");
    setGameClient(undefined);
    setError(undefined);
    setExited(false);
    clientExitedRef.current = false;
    setProgress(undefined);
    progressRef.current = undefined;
    const baseGame = selectedServer?.baseGame ?? "baseq3";
    const fsGame = selectedServer?.fsGame ?? (selectedServer ? undefined : "q3js");
    const comGameName = selectedServer?.comGameName ?? "Quake3Arena";
    const telemetry: PlayTelemetrySession = {
      id: createAnalyticsId(),
      startedAt: Date.now(),
      heartbeatCount: 0,
      disconnectedPolls: 0,
      ended: false,
      phases: new Set(),
      assetMilestones: new Set(),
    };
    telemetryRef.current = telemetry;
    trackPlayEvent("game_launch_started", telemetry, {
      launch_trigger: selectedServer ? "server_join" : "manual_local",
    });
    trackPlayEvent("game_asset_milestone", telemetry, {
      asset_milestone: "manifest_started",
      elapsed_ms: 0,
    });

    let activeHostedServer: ListedServer | undefined;
    if (selectedServer?.hosted) {
      try {
        const response = await listServers({ client });
        activeHostedServer = mapServers(response.data).find((server) => (
          server.hosted && server.id === selectedServer.id
        ));
      } catch {
        setError("Unable to verify that this hosted game is still online. Try again.");
        finishPlaySession("hosted_game_check_failed", { errorCode: "hosted_game_check_failed" });
        return;
      }
      if (!activeHostedServer) {
        setError("This hosted game has ended. Return to the server list and choose a live arena.");
        finishPlaySession("hosted_game_ended", { errorCode: "hosted_game_ended" });
        return;
      }
    }

    let countryCode: string | undefined;
    let assets: readonly Q3Asset[];
    try {
      [countryCode, assets] = await Promise.all([
        requesterCountryCode(),
        assetsForGame(baseGame, fsGame),
      ]);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : String(startError));
      if (telemetryRef.current === telemetry && !telemetry.ended) {
        const errorCode = classifyPlayError(startError);
        trackPlayEvent("game_launch_error", telemetry, {
          error_code: errorCode,
          error_phase: "asset_manifest",
          elapsed_ms: Date.now() - telemetry.startedAt,
        });
        finishPlaySession("launch_error", { errorCode });
      }
      return;
    }

    if (telemetryRef.current !== telemetry || telemetry.ended) return;
    telemetry.assetCount = assets.length;
    trackPlayEvent("game_asset_milestone", telemetry, {
      asset_milestone: "manifest_ready",
      asset_count: assets.length,
      elapsed_ms: Date.now() - telemetry.startedAt,
    });

    const resolvedPlayerName = playerNameOrRandom(playerName);
    setPlayerName(resolvedPlayerName);

    if (selectedServer) {
      const selectedHost = activeHostedServer?.host ?? selectedServer.host;
      const host = selectedHost.includes(":") && !selectedHost.startsWith("[")
        ? `[${selectedHost}]`
        : selectedHost;
      const websocketProtocol = selectedServer.secure ? "wss:" : "ws:";
      const gatewayUrl = activeHostedServer?.gatewayUrl ?? selectedServer.gatewayUrl;
      if (selectedServer.hosted && !gatewayUrl) {
        setError("The hosted game relay address is missing or invalid.");
        finishPlaySession("invalid_hosted_gateway", { errorCode: "invalid_gateway" });
        return;
      }
      setSession({
        playerName: resolvedPlayerName,
        countryCode,
        websocketUrl: gatewayUrl
          ?? `${websocketProtocol}//${host}:${selectedServer.proxyPort}/ws`,
        ...(selectedServer.hosted ? { subprotocol: null } : {}),
        address: `${host}:${selectedServer.proxyPort}`,
        baseGame,
        ...(fsGame ? { fsGame } : {}),
        comGameName,
        assets,
      });
      return;
    }

    const host = window.location.hostname || "localhost";
    const websocketProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    setSession({
      playerName: resolvedPlayerName,
      countryCode,
      websocketUrl:
        process.env.NEXT_PUBLIC_Q3JS_WEBSOCKET_URL
        ?? `${websocketProtocol}//${host}:27961/ws`,
      address: process.env.NEXT_PUBLIC_Q3JS_SERVER_ADDRESS ?? `${host}:27961`,
      baseGame,
      ...(fsGame ? { fsGame } : {}),
      comGameName,
      assets,
    });
  }, [finishPlaySession, playerName, selectedServer, setPlayerName, trackPlayEvent]);

  const shouldAutoStart = Boolean(selectedServer && initialPlayerName?.trim() && !autoStartSuppressed);

  useEffect(() => {
    if (!shouldAutoStart || autoStartRef.current) {
      return;
    }
    autoStartRef.current = true;
    void start();
  }, [shouldAutoStart, start]);

  const stop = () => {
    const target = gameShellRef.current;
    if (target && document.fullscreenElement && target.contains(document.fullscreenElement)) {
      void document.exitFullscreen().catch(() => undefined);
    }
    finishPlaySession("user_exit");
    setGameClient(undefined);
    setSession(undefined);
    setProgress(undefined);
    setError(undefined);
    setExited(false);
    clientExitedRef.current = false;
    setAutoStartSuppressed(true);
  };

  const exitDestination = selectedServer?.hosted ? "/host" : "/";
  const returnFromGame = () => {
    if (selectedServer?.hosted && window.opener && !window.opener.closed) {
      window.opener.focus();
      window.close();
      return;
    }
    window.location.assign(exitDestination);
  };
  const closeGamePage = () => {
    window.close();
    window.setTimeout(() => {
      if (!window.closed) window.location.assign(exitDestination);
    }, 100);
  };

  if (!session) {
    if (shouldAutoStart && !error) {
      return (
        <section className="grid size-full place-items-center bg-background p-4 text-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-primary">Joining server</p>
            <p className="mt-2 text-lg font-bold">{selectedServer?.name}</p>
          </div>
        </section>
      );
    }

    return (
      <section className="grid size-full place-items-center overflow-auto bg-background p-4">
        <div className="w-full max-w-xl border border-border bg-card/40 p-5 md:p-7">
          <p className="text-xs uppercase tracking-wider text-primary">
            {selectedServer ? "Selected server" : "Local match"}
          </p>
          <h1 className="mt-2 text-2xl font-bold uppercase tracking-tight md:text-3xl">
            {selectedServer ? selectedServer.name : "Launch Q3JS"}
          </h1>
          <p className="mt-3 text-sm leading-5 text-muted-foreground">
            {selectedServer?.hosted
              ? "Hosted games load the required packages into memory while your game settings remain in browser storage."
              : "The first launch downloads the required game packages into browser storage. Later launches reuse the local copy."}
          </p>
          {selectedServer && (
            <p className="mt-3 text-xs uppercase text-muted-foreground">
              {selectedServer.gatewayUrl
                ?? `${selectedServer.secure ? "wss" : "ws"}://${selectedServer.host}:${selectedServer.proxyPort}/ws`}
            </p>
          )}

          {error && (
            <p role="alert" className="mt-4 border-l-2 border-primary pl-3 text-sm leading-5 text-primary">
              {error}
            </p>
          )}

          <label className="mt-6 block text-xs uppercase text-muted-foreground">
            Player name
            <input
              value={playerName}
              maxLength={32}
              onChange={(event) => setPlayerName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void start();
                }
              }}
              className="mt-2 h-10 w-full border border-border bg-input px-3 text-base text-foreground focus:border-ring focus:outline-none"
            />
          </label>

          <Button size="lg" className="mt-4" onClick={() => void start()}>
            <Play weight="fill" />
            Start game
          </Button>
        </div>
      </section>
    );
  }

  const loadedBytes = progress?.loadedBytes ?? 0;
  const totalBytes = progress?.totalBytes ?? 0;
  const percent = totalBytes > 0 ? Math.min(100, Math.round((loadedBytes / totalBytes) * 100)) : 0;
  const waitingForLandscape = isTouchDevice && (!isViewportReady || !hasSeenLandscape);
  const portraitBlocked = isTouchDevice && hasSeenLandscape && !isLandscape;
  const showMobileControls = isTouchDevice && progress?.phase === "ready" && gameClient && !portraitBlocked;

  return (
    <section
      ref={gameShellRef}
      aria-label="Q3JS client"
      className="absolute inset-0 size-full overflow-hidden bg-black"
    >
      {!waitingForLandscape && !exited && (
        <GameCanvas
          options={options!}
          inputMode={isTouchDevice ? "mobile" : "desktop"}
          className="absolute inset-0 block size-full bg-black outline-none"
          onClientReady={handleClientReady}
        />
      )}

      {showMobileControls && (
        <MobileControls
          client={gameClient}
          canRequestFullscreen={canRequestFullscreen}
          onRequestFullscreen={() => void requestLandscapeFullscreen()}
        />
      )}

      {voiceEnabled && selectedServer && (
        <VoiceChat
          participantName={session.playerName}
          serverId={selectedServer.id}
        />
      )}

      {progress?.phase !== "ready" && !error && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-black/85 p-6 text-center">
          <div className="w-full max-w-md">
            <p className="text-base font-semibold">{progressLabel(progress)}</p>
            <div className="mt-4 h-1 w-full bg-muted">
              <div className="h-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
            </div>
            {totalBytes > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                {formatBytes(loadedBytes)} / {formatBytes(totalBytes)}
              </p>
            )}
          </div>
        </div>
      )}

      {(waitingForLandscape || portraitBlocked) && !error && !exited && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black p-6 text-center text-white">
          <div className="max-w-sm">
            <p className="text-xs font-black uppercase tracking-[0.32em] text-white/55">
              Landscape required
            </p>
            <h2 className="mt-4 text-3xl font-black uppercase tracking-[0.1em]">
              Rotate your phone
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/70">
              {hasSeenLandscape
                ? "Rotate back to landscape to continue playing."
                : "Mobile play starts in landscape so the controls have enough room."}
            </p>
            {canRequestFullscreen && (
              <Button variant="outline" className="mt-6 border-white/25 bg-white/10 text-white" onClick={() => void requestLandscapeFullscreen()}>
                Enter fullscreen
              </Button>
            )}
          </div>
        </div>
      )}

      {exited && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/90 p-6 text-center">
          <div className="max-w-lg">
            <p className="text-base font-semibold text-primary">Game exited</p>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">
              {selectedServer?.hosted
                ? "The arena is still running in the host tab."
                : "You have left the game."}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button size="sm" onClick={returnFromGame}>
                <ArrowLeft />
                {selectedServer?.hosted ? "Return to host" : "Back to servers"}
              </Button>
              <Button variant="outline" size="sm" onClick={closeGamePage}>
                <X />
                Close this tab
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && !exited && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/90 p-6 text-center">
          <div className="max-w-lg">
            <p className="text-base font-semibold text-primary">Unable to start Q3JS</p>
            <p className="mt-2 break-words text-sm leading-5 text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={stop}>
              <ArrowClockwise />
              Try again
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
