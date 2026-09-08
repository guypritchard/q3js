import type { ListedServer } from "@/lib/master-server";
import { playerNameOrRandom } from "@/lib/player-name";

export function humanPlayerCount(server: ListedServer): number {
  return server.users.filter((player) => !player.bot).length;
}

export function joinServerHref(
  server: ListedServer,
  playerName: string,
  entryPoint: string,
  handoffId: string,
  voiceEnabled: boolean,
): string {
  const parameters = new URLSearchParams({
    id: server.id,
    hosted: server.hosted ? "1" : "0",
    gatewayUrl: server.gatewayUrl,
    host: server.host,
    proxyPort: String(server.proxyPort),
    secure: server.secure ? "1" : "0",
    baseGame: server.baseGame,
    comGameName: server.comGameName,
    protocol: String(server.protocol),
    ping: String(server.ping),
    serverName: server.name,
    name: playerNameOrRandom(playerName),
    serverMode: server.mode,
    serverMap: server.map,
    official: server.official ? "1" : "0",
    humanPlayers: String(humanPlayerCount(server)),
    entryPoint,
    handoffId,
    voice: voiceEnabled ? "1" : "0",
  });
  if (server.fsGame) parameters.set("fsGame", server.fsGame);
  const insecurePlayUrl = process.env.NEXT_PUBLIC_Q3JS_INSECURE_PLAY_URL?.replace(/\/$/, "") ?? "";
  return `${server.secure ? "" : insecurePlayUrl}/play?${parameters.toString()}`;
}
