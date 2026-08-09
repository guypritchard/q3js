import { createSocket } from "node:dgram";
import { createServer, type IncomingMessage, type Server as HttpServer } from "node:http";
import { isIP, type AddressInfo } from "node:net";
import { WebSocket, WebSocketServer } from "ws";
import { decompressHuffman } from "./huffman.js";
import { normalizeIpAddress } from "./ip-address.js";

export interface PlayerConnection {
  clientIp: string;
  playerName: string;
  userinfo: Readonly<Record<string, string>>;
}

export interface GatewayOptions {
  host: string;
  port: number;
  targetHost: string;
  targetPort: number;
  maxConnections: number;
  maxPacketBytes: number;
  maxBufferedBytes?: number;
  trustedProxyHops?: number;
  idleTimeoutMs: number;
  ready: () => boolean;
  isBanned?: (clientIp: string) => boolean;
  playerConnected?: (connection: PlayerConnection) => void | Promise<void>;
}

const DISCONNECT_PACKET = Buffer.from("\xff\xff\xff\xffdisconnect\n", "latin1");
const CONNECT_HEADER = Buffer.from("\xff\xff\xff\xffconnect ", "latin1");
const CONNECT_RESPONSE = Buffer.from("\xff\xff\xff\xffconnectResponse", "latin1");
const MAX_INFO_STRING_BYTES = 1024;
const PRIVATE_USERINFO_KEYS = new Set(["clientip", "ip", "password", "rconpassword"]);

function clientIpAddress(request: IncomingMessage, trustedProxyHops: number): string {
  const peerAddress = request.socket.remoteAddress;
  if (!peerAddress) {
    throw new Error("WebSocket peer address is unavailable.");
  }
  if (trustedProxyHops === 0) {
    return normalizeIpAddress(peerAddress);
  }

  const forwardedHeader = request.headers["x-forwarded-for"];
  const forwarded = (Array.isArray(forwardedHeader) ? forwardedHeader.join(",") : forwardedHeader)
    ?.split(",")
    .map((address) => normalizeIpAddress(address.trim()));
  const clientIndex = (forwarded?.length ?? 0) - trustedProxyHops;
  const address = forwarded?.[clientIndex];
  if (!address || isIP(address) === 0) {
    throw new Error("A trusted proxy did not provide a valid X-Forwarded-For chain.");
  }
  return address;
}

/** Read and sanitize userinfo from an ioquake3 connect packet without changing it. */
export function readConnectUserinfo(
  packet: Buffer,
): { playerName: string; userinfo: Readonly<Record<string, string>> } | undefined {
  if (packet.byteLength < CONNECT_HEADER.byteLength
    || !packet.subarray(0, CONNECT_HEADER.byteLength).equals(CONNECT_HEADER)) {
    return undefined;
  }

  const decoded = decompressHuffman(
    packet.subarray(CONNECT_HEADER.byteLength),
    MAX_INFO_STRING_BYTES + 2,
  ).toString("latin1");
  if (decoded.length < 3 || decoded[0] !== "\"" || decoded.at(-1) !== "\"") {
    throw new Error("Invalid Quake connect command.");
  }

  const info = decoded.slice(1, -1);
  if (info.length >= MAX_INFO_STRING_BYTES) {
    throw new Error("Quake connect userinfo exceeds the engine limit.");
  }
  const parts = info.split("\\");
  if (parts[0] !== "" || parts.length % 2 === 0) {
    throw new Error("Invalid Quake userinfo pairs.");
  }

  const userinfo = Object.create(null) as Record<string, string>;
  let playerName: string | undefined;
  for (let index = 1; index < parts.length; index += 2) {
    const key = parts[index];
    const value = parts[index + 1];
    if (!key || value === undefined) {
      throw new Error("Invalid Quake userinfo pair.");
    }
    const normalizedKey = key.toLowerCase();
    if (normalizedKey === "name") {
      playerName = value;
    }
    if (!PRIVATE_USERINFO_KEYS.has(normalizedKey)) {
      userinfo[normalizedKey] = value;
    }
  }
  if (!playerName) {
    throw new Error("Quake connect userinfo is missing the player name.");
  }
  return { playerName, userinfo };
}

export class Gateway {
  readonly #options: GatewayOptions;
  readonly #httpServer: HttpServer;
  readonly #webSocketServer: WebSocketServer;
  readonly #clients = new Map<WebSocket, string>();

  constructor(options: GatewayOptions) {
    this.#options = options;
    this.#webSocketServer = new WebSocketServer({
      noServer: true,
      perMessageDeflate: false,
      maxPayload: options.maxPacketBytes,
    });
    this.#httpServer = createServer((request, response) => {
      if (request.method === "GET" && request.url === "/healthz") {
        const ready = this.#options.ready();
        response.writeHead(ready ? 200 : 503, { "content-type": "application/json" });
        response.end(JSON.stringify({
          status: ready ? "ready" : "starting",
          gateway: "up",
          gameServer: ready ? "up" : "starting",
        }));
        return;
      }

      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "Not found" }));
    });

    this.#httpServer.on("upgrade", (request, socket, head) => {
      if (!this.#options.ready() || this.#clients.size >= this.#options.maxConnections) {
        socket.end("HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n");
        return;
      }
      if (request.url !== "/" && request.url !== "/ws") {
        socket.end("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
        return;
      }
      let clientIp: string;
      try {
        clientIp = clientIpAddress(request, this.#options.trustedProxyHops ?? 0);
      } catch {
        socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
        return;
      }
      if (this.#options.isBanned?.(clientIp)) {
        socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
        return;
      }
      this.#webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
        this.#handleConnection(webSocket, clientIp);
      });
    });
  }

  async start(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.#httpServer.once("error", reject);
      this.#httpServer.listen(this.#options.port, this.#options.host, () => {
        this.#httpServer.off("error", reject);
        resolve();
      });
    });
  }

  address(): AddressInfo {
    const address = this.#httpServer.address();
    if (!address || typeof address === "string") {
      throw new Error("Gateway is not listening on a TCP address.");
    }
    return address;
  }

  disconnectBannedClients(): number {
    let disconnected = 0;
    for (const [client, clientIp] of this.#clients) {
      if (
        client.readyState === WebSocket.OPEN
        && this.#options.isBanned?.(clientIp)
      ) {
        disconnected++;
        client.close(1008, "IP address banned");
      }
    }
    return disconnected;
  }

  async stop(): Promise<void> {
    const httpClosed = this.#httpServer.listening
      ? new Promise<void>((resolve, reject) => {
          this.#httpServer.close((error) => error ? reject(error) : resolve());
        })
      : Promise.resolve();

    for (const client of this.#clients.keys()) {
      client.terminate();
    }

    const webSocketsClosed = new Promise<void>((resolve) => {
      this.#webSocketServer.close(() => resolve());
    });
    await Promise.all([httpClosed, webSocketsClosed]);
  }

  #handleConnection(webSocket: WebSocket, clientIp: string): void {
    this.#clients.set(webSocket, clientIp);
    const udp = createSocket("udp4");
    let closed = false;
    let sentToTarget = false;
    let connectionReported = false;
    let pendingConnection: PlayerConnection | undefined;
    let idleTimer: NodeJS.Timeout;

    const refreshIdleTimer = (): void => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => webSocket.close(1000, "Idle timeout"), this.#options.idleTimeoutMs);
      idleTimer.unref();
    };

    const closeUdp = (): void => {
      try {
        udp.close();
      } catch {
        // Socket is already closed.
      }
    };

    const close = (notifyTarget: boolean): void => {
      if (closed) {
        return;
      }
      closed = true;
      clearTimeout(idleTimer);
      this.#clients.delete(webSocket);

      if (!notifyTarget || !sentToTarget) {
        closeUdp();
        return;
      }

      const timeout = setTimeout(closeUdp, 100);
      udp.send(DISCONNECT_PACKET, this.#options.targetPort, this.#options.targetHost, () => {
        clearTimeout(timeout);
        closeUdp();
      });
    };

    udp.on("message", (message) => {
      refreshIdleTimer();
      if (
        !connectionReported
        && pendingConnection
        && message.subarray(0, CONNECT_RESPONSE.byteLength).equals(CONNECT_RESPONSE)
      ) {
        connectionReported = true;
        const connection = pendingConnection;
        pendingConnection = undefined;
        void Promise.resolve(this.#options.playerConnected?.(connection))
          .catch((error: unknown) => console.warn("Player connection callback failed:", error));
      }
      if (
        webSocket.readyState === WebSocket.OPEN
        && webSocket.bufferedAmount <= (this.#options.maxBufferedBytes ?? 1_000_000)
      ) {
        webSocket.send(message, { binary: true });
      }
    });
    udp.on("error", () => {
      webSocket.close(1011, "UDP transport failed");
      close(false);
    });

    webSocket.on("message", (data, isBinary) => {
      if (!isBinary) {
        return;
      }
      const message = Buffer.isBuffer(data)
        ? data
        : Array.isArray(data)
          ? Buffer.concat(data)
          : Buffer.from(data);
      if (message.byteLength > this.#options.maxPacketBytes) {
        webSocket.close(1009, "Packet too large");
        return;
      }
      if (!connectionReported && this.#options.playerConnected) {
        try {
          const connect = readConnectUserinfo(message);
          if (connect) {
            pendingConnection = { clientIp, ...connect };
          }
        } catch (error) {
          console.warn("Could not read Quake connect userinfo:", error);
        }
      }
      refreshIdleTimer();
      sentToTarget = true;
      udp.send(message, this.#options.targetPort, this.#options.targetHost, (error) => {
        if (error) {
          webSocket.close(1011, "UDP transport failed");
          close(false);
        }
      });
    });
    webSocket.on("close", () => close(true));
    webSocket.on("error", () => close(true));
    refreshIdleTimer();
  }
}
