import { createSocket } from "node:dgram";
import { createServer, type IncomingMessage, type Server as HttpServer } from "node:http";
import { isIP, type AddressInfo } from "node:net";
import { WebSocket, WebSocketServer } from "ws";
import { compressHuffman, decompressHuffman } from "./huffman.js";

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
}

const DISCONNECT_PACKET = Buffer.from("\xff\xff\xff\xffdisconnect\n", "latin1");
const CONNECT_HEADER = Buffer.from("\xff\xff\xff\xffconnect ", "latin1");
const MAX_INFO_STRING_BYTES = 1024;
const SERVER_LOCAL_IP_INFO_BYTES = Buffer.byteLength("\\ip\\localhost", "latin1");

function normalizeIpAddress(address: string): string {
  const mappedIpv4 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(address);
  return mappedIpv4?.[1] ?? address;
}

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

function withInfoValue(info: string, key: string, value: string): string {
  if (!info.startsWith("\\") || /[\\;"\0]/.test(key) || /[\\;"\0]/.test(value)) {
    throw new Error("Invalid Quake userinfo.");
  }

  const parts = info.split("\\");
  if (parts[0] !== "" || parts.length % 2 === 0) {
    throw new Error("Invalid Quake userinfo pairs.");
  }

  const retained: string[] = [];
  for (let index = 1; index < parts.length; index += 2) {
    const existingKey = parts[index];
    const existingValue = parts[index + 1];
    if (!existingKey || existingValue === undefined) {
      throw new Error("Invalid Quake userinfo pair.");
    }
    if (existingKey.toLowerCase() !== key.toLowerCase()) {
      retained.push(existingKey, existingValue);
    }
  }
  retained.push(key, value);
  return `\\${retained.join("\\")}`;
}

/** Add the WebSocket peer address to a Quake connect packet's userinfo. */
export function enrichConnectPacket(
  packet: Buffer,
  clientAddress: string,
  maxPacketBytes: number,
): Buffer {
  if (packet.byteLength < CONNECT_HEADER.byteLength
    || !packet.subarray(0, CONNECT_HEADER.byteLength).equals(CONNECT_HEADER)) {
    return packet;
  }

  const decoded = decompressHuffman(
    packet.subarray(CONNECT_HEADER.byteLength),
    maxPacketBytes - CONNECT_HEADER.byteLength,
  ).toString("latin1");
  if (decoded.length < 3 || decoded[0] !== "\"" || decoded.at(-1) !== "\"") {
    throw new Error("Invalid Quake connect command.");
  }

  const info = withInfoValue(decoded.slice(1, -1), "clientip", normalizeIpAddress(clientAddress));
  // ioquake3 adds its own local UDP peer as `ip` after receiving this packet.
  // Reserve that space so the enriched connection cannot overflow userinfo.
  if (Buffer.byteLength(info, "latin1") + SERVER_LOCAL_IP_INFO_BYTES >= MAX_INFO_STRING_BYTES) {
    throw new Error("Enriched Quake userinfo exceeds the engine limit.");
  }

  const encoded = compressHuffman(Buffer.from(`\"${info}\"`, "latin1"));
  const enriched = Buffer.concat([CONNECT_HEADER, encoded]);
  if (enriched.byteLength > maxPacketBytes) {
    throw new Error("Enriched connect packet exceeds the configured packet limit.");
  }
  return enriched;
}

export class Gateway {
  readonly #options: GatewayOptions;
  readonly #httpServer: HttpServer;
  readonly #webSocketServer: WebSocketServer;
  readonly #clients = new Set<WebSocket>();

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
      this.#webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
        this.#webSocketServer.emit("connection", webSocket, request);
      });
    });
    this.#webSocketServer.on("connection", (webSocket, request) => {
      try {
        this.#handleConnection(
          webSocket,
          clientIpAddress(request, this.#options.trustedProxyHops ?? 0),
        );
      } catch {
        webSocket.close(1008, "Client IP unavailable");
      }
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

  async stop(): Promise<void> {
    const httpClosed = this.#httpServer.listening
      ? new Promise<void>((resolve, reject) => {
          this.#httpServer.close((error) => error ? reject(error) : resolve());
        })
      : Promise.resolve();

    for (const client of this.#clients) {
      client.terminate();
    }

    const webSocketsClosed = new Promise<void>((resolve) => {
      this.#webSocketServer.close(() => resolve());
    });
    await Promise.all([httpClosed, webSocketsClosed]);
  }

  #handleConnection(webSocket: WebSocket, clientAddress: string): void {
    this.#clients.add(webSocket);
    const udp = createSocket("udp4");
    let closed = false;
    let sentToTarget = false;
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
      let forwardedMessage = message;
      try {
        forwardedMessage = enrichConnectPacket(
          message,
          clientAddress,
          this.#options.maxPacketBytes,
        );
      } catch {
        webSocket.close(1008, "Invalid connect packet");
        return;
      }
      refreshIdleTimer();
      sentToTarget = true;
      udp.send(forwardedMessage, this.#options.targetPort, this.#options.targetHost, (error) => {
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
