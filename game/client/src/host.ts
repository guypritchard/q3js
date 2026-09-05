import type { Q3BrowserHostOptions, Q3HostWorkerRequest, Q3HostWorkerResponse } from "./host-protocol.js";

const SAFE_VALUE_PATTERN = /^[^\x00-\x1f"\\;]*$/;

function safeValue(value: string | number | boolean, name: string): string {
  const text = typeof value === "boolean" ? (value ? "1" : "0") : String(value);
  if (!SAFE_VALUE_PATTERN.test(text)) {
    throw new Error(`${name} contains unsupported characters.`);
  }
  return text;
}

function buildHostArguments(options: Q3BrowserHostOptions): string[] {
  const game = options.game ?? {};
  const arguments_ = [
    "+set", "dedicated", "1",
    "+set", "net_enabled", "1",
    "+set", "fs_basepath", "/",
    "+set", "fs_homepath", game.homePath ?? "/persist",
    "+set", "com_basegame", game.comBaseGame ?? "baseq3",
    "+set", "fs_basegame", game.fsBaseGame ?? "baseq3",
    "+set", "sv_pure", "0",
    "+set", "sv_allowDownload", "0",
    "+set", "sv_master1", "",
    "+set", "sv_master2", "",
  ];
  if (game.fsGame) {
    arguments_.push("+set", "fs_game", safeValue(game.fsGame, "fsGame"));
  }
  for (const [name, value] of Object.entries(options.cvars ?? {})) {
    arguments_.push("+set", safeValue(name, "cvar name"), safeValue(value, name));
  }
  arguments_.push(...(options.additionalArguments ?? []));
  arguments_.push("+map", safeValue(game.map ?? "q3dm17", "map"));
  return arguments_;
}

export class Q3BrowserHost {
  readonly #worker: Worker;
  readonly #options: Q3BrowserHostOptions;
  #ready = false;

  constructor(options: Q3BrowserHostOptions) {
    this.#options = options;
    const request: Q3HostWorkerRequest = {
      type: "start",
      assets: options.assets.map((asset) => ({
        url: new URL(String(asset.url), document.baseURI).href,
        path: asset.path,
        ...(asset.optional === undefined ? {} : { optional: asset.optional }),
        ...(asset.requestCache === undefined ? {} : { requestCache: asset.requestCache }),
      })),
      arguments: buildHostArguments(options),
      ...(options.wasmUrl
        ? { wasmUrl: new URL(String(options.wasmUrl), document.baseURI).href }
        : {}),
    };
    const workerUrl = options.workerUrl
      ? new URL(String(options.workerUrl), document.baseURI)
      : new URL("./host-worker.js", import.meta.url);
    this.#worker = new Worker(workerUrl, { type: "module" });
    this.#worker.addEventListener("message", this.#onMessage);
    this.#worker.addEventListener("error", (event) => {
      options.onError?.(new Error(event.message || "Browser-host Worker failed."));
    });
    this.#worker.postMessage(request);
  }

  get ready(): boolean {
    return this.#ready;
  }

  receive(endpoint: number, packet: Uint8Array): void {
    if (!Number.isInteger(endpoint) || endpoint <= 0 || endpoint > 0x00ffffff) {
      throw new Error("Endpoint must be an integer between 1 and 16777215.");
    }
    const copy = new Uint8Array(packet.byteLength);
    copy.set(packet);
    const buffer = copy.buffer;
    const request: Q3HostWorkerRequest = { type: "packet", endpoint, packet: buffer };
    this.#worker.postMessage(request, [buffer]);
  }

  command(command: string): void {
    const normalized = command.trim();
    if (!normalized || normalized.length > 1_024 || normalized.includes("\0")) {
      throw new Error("Server command must contain between 1 and 1024 characters.");
    }
    this.#worker.postMessage({ type: "command", command: normalized } satisfies Q3HostWorkerRequest);
  }

  dispose(): void {
    this.#worker.removeEventListener("message", this.#onMessage);
    this.#worker.terminate();
    this.#ready = false;
  }

  readonly #onMessage = (event: MessageEvent<Q3HostWorkerResponse>): void => {
    const message = event.data;
    if (message.type === "console") {
      this.#options.onConsole?.(message.level, message.message);
    } else if (message.type === "packet") {
      this.#options.onPacket?.(message.endpoint, new Uint8Array(message.packet));
    } else if (message.type === "ready") {
      this.#ready = true;
      this.#options.onReady?.();
    } else if (message.type === "error") {
      this.#options.onError?.(new Error(message.message));
    }
  };
}

export function createQ3BrowserHost(options: Q3BrowserHostOptions): Q3BrowserHost {
  return new Q3BrowserHost(options);
}
