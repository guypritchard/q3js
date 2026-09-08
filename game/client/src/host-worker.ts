import type { Q3HostWorkerRequest, Q3HostWorkerResponse } from "./host-protocol.js";
import createServer from "./runtime/ioq3ded.js";

const bundledWasmUrl = new URL("./runtime/ioq3ded.wasm", import.meta.url).href;

function post(message: Q3HostWorkerResponse, transfer?: Transferable[]): void {
  globalThis.postMessage(message, { transfer: transfer ?? [] });
}

function parentPath(path: string): string {
  const separator = path.lastIndexOf("/");
  return separator <= 0 ? "/" : path.slice(0, separator);
}

globalThis.addEventListener("message", (event: MessageEvent<Q3HostWorkerRequest>) => {
  if (event.data.type !== "start") {
    return;
  }
  void start(event.data);
}, { once: true });

async function start(request: Extract<Q3HostWorkerRequest, { type: "start" }>): Promise<void> {
  try {
    let abortError: Error | undefined;
    const runtime = await createServer({
      noInitialRun: true,
      locateFile: (path: string, prefix: string) => path.endsWith(".wasm")
        ? (request.wasmUrl ?? bundledWasmUrl)
        : `${prefix}${path}`,
      print: (message) => post({ type: "console", level: "info", message }),
      printErr: (message) => post({ type: "console", level: "error", message }),
      onAbort: (reason) => {
        abortError = reason instanceof Error ? reason : new Error(String(reason));
      },
      onServerPacket: (endpoint, packet) => {
        const copy = new Uint8Array(packet.byteLength);
        copy.set(packet);
        const buffer = copy.buffer;
        post({ type: "packet", endpoint, packet: buffer }, [buffer]);
      },
    });
    if (abortError) {
      throw abortError;
    }

    for (const asset of request.assets) {
      try {
        const response = await fetch(asset.url, { cache: asset.requestCache ?? "default" });
        if (!response.ok) {
          throw new Error(`Unable to load ${asset.path} (HTTP ${response.status}).`);
        }
        runtime.FS.mkdirTree(parentPath(asset.path));
        runtime.FS.writeFile(asset.path, new Uint8Array(await response.arrayBuffer()));
      } catch (error) {
        if (!asset.optional) {
          throw error;
        }
      }
    }
    runtime.FS.mkdirTree("/persist/baseq3");
    runtime.callMain(request.arguments);

    globalThis.addEventListener("message", (event: MessageEvent<Q3HostWorkerRequest>) => {
      if (event.data.type === "command") {
        const command = new TextEncoder().encode(event.data.command);
        const pointer = runtime._malloc(command.byteLength + 1);
        try {
          runtime.HEAPU8.set(command, pointer);
          runtime.HEAPU8[pointer + command.byteLength] = 0;
          runtime._Q3JS_ServerCommand(pointer);
        } finally {
          runtime._free(pointer);
        }
        return;
      }
      if (event.data.type !== "packet") {
        return;
      }
      const packet = new Uint8Array(event.data.packet);
      const pointer = runtime._malloc(packet.byteLength);
      try {
        runtime.HEAPU8.set(packet, pointer);
        runtime._Q3JS_ServerInjectPacket(event.data.endpoint, pointer, packet.byteLength);
      } finally {
        runtime._free(pointer);
      }
    });

    const readiness = globalThis.setInterval(() => {
      if (runtime._Q3JS_ServerIsRunning() === 1) {
        globalThis.clearInterval(readiness);
        post({ type: "ready" });
      }
    }, 50);
  } catch (error) {
    post({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
}
