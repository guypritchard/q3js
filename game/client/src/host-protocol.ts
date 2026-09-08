import type { Q3Asset, Q3CvarValue, Q3GameOptions } from "./types.js";

export interface Q3BrowserHostOptions {
  assets: readonly Q3Asset[];
  game?: Q3GameOptions & { map?: string };
  cvars?: Readonly<Record<string, Q3CvarValue>>;
  additionalArguments?: readonly string[];
  workerUrl?: string | URL;
  wasmUrl?: string | URL;
  signal?: AbortSignal;
  onConsole?: (level: "info" | "error", message: string) => void;
  onPacket?: (endpoint: number, packet: Uint8Array) => void;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

export type Q3HostWorkerRequest =
  | {
      type: "start";
      assets: readonly { url: string; path: string; optional?: boolean; requestCache?: RequestCache }[];
      arguments: readonly string[];
      wasmUrl?: string;
    }
  | { type: "packet"; endpoint: number; packet: ArrayBuffer }
  | { type: "command"; command: string };

export type Q3HostWorkerResponse =
  | { type: "console"; level: "info" | "error"; message: string }
  | { type: "packet"; endpoint: number; packet: ArrayBuffer }
  | { type: "ready" }
  | { type: "error"; message: string };
