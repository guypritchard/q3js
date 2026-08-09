import { BanList } from "./ban-list.js";
import { loadConfig } from "./config.js";
import { GameServer } from "./game-server.js";
import { Gateway } from "./gateway.js";
import { MasterHeartbeat } from "./master-heartbeat.js";
import { PlayerConnectionReporter } from "./player-connection-reporter.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const gameServer = new GameServer(config);
  const masterHeartbeat = new MasterHeartbeat({
    masterBaseUrl: config.masterBaseUrl,
    eventClientSecret: config.eventClientSecret,
    intervalMs: config.heartbeatIntervalMs,
    timeoutMs: config.heartbeatTimeoutMs,
    targetHost: config.publishHost,
    proxyPort: config.publishPort,
    targetPort: config.gamePort,
    secure: config.secure,
  });
  const playerConnectionReporter = new PlayerConnectionReporter({
    masterBaseUrl: config.masterBaseUrl,
    clientSecret: config.eventClientSecret,
    timeoutMs: config.heartbeatTimeoutMs,
    serverHost: config.publishHost,
    serverPort: config.publishPort,
  });
  const banList = new BanList({
    masterBaseUrl: config.masterBaseUrl,
    clientSecret: config.eventClientSecret,
    intervalMs: config.banRefreshIntervalMs,
    timeoutMs: config.heartbeatTimeoutMs,
  });
  let gameReady = false;
  let stopping = false;

  const gateway = new Gateway({
    host: config.gatewayHost,
    port: config.gatewayPort,
    targetHost: config.gameHost,
    targetPort: config.gamePort,
    maxConnections: config.maxConnections,
    maxPacketBytes: config.maxPacketBytes,
    trustedProxyHops: config.trustedProxyHops,
    idleTimeoutMs: config.idleTimeoutMs,
    ready: () => gameReady,
    isBanned: (clientIp) => banList.isBanned(clientIp),
    playerConnected: (connection) => playerConnectionReporter.report(connection),
  });
  banList.onUpdate(() => {
    const disconnected = gateway.disconnectBannedClients();
    if (disconnected > 0) {
      console.log(`Disconnected ${disconnected} newly banned client(s).`);
    }
  });

  let requestStop!: (exitCode: number) => void;
  const stopRequested = new Promise<number>((resolve) => {
    requestStop = resolve;
  });

  const stop = async (exitCode: number): Promise<void> => {
    if (stopping) {
      return;
    }
    stopping = true;
    gameReady = false;
    masterHeartbeat.stop();
    playerConnectionReporter.stop();
    banList.stop();
    await gateway.stop().catch((error: unknown) => console.error("Gateway shutdown failed:", error));
    await gameServer.stop().catch((error: unknown) => console.error("Game server shutdown failed:", error));
    process.exitCode = exitCode;
  };

  process.once("SIGINT", () => requestStop(0));
  process.once("SIGTERM", () => requestStop(0));

  try {
    await banList.start();
    await gateway.start();
    await gameServer.start();
    void gameServer.waitForExit().then((exitCode) => requestStop(exitCode));
    await gameServer.waitUntilReady();
    gameReady = true;
    await masterHeartbeat.start();
    console.log(`Q3JS server ready: ws://${config.gatewayHost}:${gateway.address().port}/ws`);
    await stop(await stopRequested);
  } catch (error) {
    console.error("Q3JS server failed:", error);
    await stop(1);
  }
}

await main();
