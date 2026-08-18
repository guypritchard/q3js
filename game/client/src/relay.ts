import { createQ3BrowserHost, type Q3BrowserHost } from "./host.js";
import type { Q3BrowserHostOptions } from "./host-protocol.js";

const OPEN = 1;
const DATAGRAM = 2;
const CLOSE = 3;
const HEADER_BYTES = 5;
const STARTUP_TIMEOUT_MS = 10 * 60 * 1_000;

export interface Q3BrowserHostedSession {
  readonly serverId: string;
  readonly gatewayUrl: string;
  command(command: string): void;
  close(): void;
}

interface RelayControlMessage {
  type?: string;
  serverId?: string;
  gatewayUrl?: string;
}

function relayFrame(endpoint: number, packet: Uint8Array): ArrayBuffer {
  const frame = new Uint8Array(HEADER_BYTES + packet.byteLength);
  const view = new DataView(frame.buffer);
  frame[0] = DATAGRAM;
  view.setUint32(1, endpoint);
  frame.set(packet, HEADER_BYTES);
  return frame.buffer;
}

export function createQ3BrowserHostedSession(
  relayUrl: string,
  options: Q3BrowserHostOptions,
): Promise<Q3BrowserHostedSession> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(options.signal.reason instanceof Error ? options.signal.reason : new Error("Browser hosting was cancelled."));
      return;
    }
    const socket = new WebSocket(relayUrl, "binary");
    socket.binaryType = "arraybuffer";
    let host: Q3BrowserHost | undefined;
    let registration: Required<Pick<RelayControlMessage, "serverId" | "gatewayUrl">> | undefined;
    let settled = false;
    let closed = false;

    const close = (): void => {
      if (closed) return;
      closed = true;
      globalThis.clearTimeout(startupTimeout);
      options.signal?.removeEventListener("abort", abort);
      host?.dispose();
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    };

    const fail = (error: Error): void => {
      options.onError?.(error);
      if (!settled) {
        settled = true;
        reject(error);
      }
      close();
    };

    const abort = (): void => fail(
      options.signal?.reason instanceof Error ? options.signal.reason : new Error("Browser hosting was cancelled."),
    );
    const startupTimeout = globalThis.setTimeout(
      () => fail(new Error("Browser-host server did not become ready in time.")),
      STARTUP_TIMEOUT_MS,
    );
    options.signal?.addEventListener("abort", abort, { once: true });

    socket.addEventListener("message", (event) => {
      if (typeof event.data === "string") {
        let control: RelayControlMessage;
        try {
          control = JSON.parse(event.data) as RelayControlMessage;
        } catch {
          fail(new Error("Browser-host relay sent invalid control data."));
          return;
        }
        if (control.type === "registered" && control.serverId && control.gatewayUrl) {
          registration = { serverId: control.serverId, gatewayUrl: control.gatewayUrl };
          try {
            host = createQ3BrowserHost({
              ...options,
              onReady: () => {
                options.onReady?.();
                socket.send(JSON.stringify({ type: "ready" }));
              },
              onPacket: (endpoint, packet) => {
                options.onPacket?.(endpoint, packet);
                if (socket.readyState === WebSocket.OPEN) {
                  socket.send(relayFrame(endpoint, packet));
                }
              },
              onError: fail,
            });
          } catch (error) {
            fail(error instanceof Error ? error : new Error(String(error)));
          }
        } else if (control.type === "listed" && registration && !settled) {
          settled = true;
          globalThis.clearTimeout(startupTimeout);
          resolve({
            serverId: registration.serverId,
            gatewayUrl: registration.gatewayUrl,
            command: (command) => host?.command(command),
            close,
          });
        }
        return;
      }

      if (!host || !(event.data instanceof ArrayBuffer)) {
        return;
      }
      const frame = new Uint8Array(event.data);
      if (frame.byteLength < HEADER_BYTES) {
        fail(new Error("Browser-host relay frame is truncated."));
        return;
      }
      const endpoint = new DataView(frame.buffer, frame.byteOffset, frame.byteLength).getUint32(1);
      const opcode = frame[0];
      if (opcode === DATAGRAM) {
        host.receive(endpoint, frame.subarray(HEADER_BYTES));
      } else if (opcode !== OPEN && opcode !== CLOSE) {
        fail(new Error("Browser-host relay sent an unsupported frame."));
      }
    });
    socket.addEventListener("error", () => fail(new Error("Browser-host relay connection failed.")));
    socket.addEventListener("close", () => {
      if (!closed) {
        fail(new Error(settled
          ? "Browser-host relay connection closed."
          : "Browser-host relay closed before the game was listed."));
      }
    });
  });
}
