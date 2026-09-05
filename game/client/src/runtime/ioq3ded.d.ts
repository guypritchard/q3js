import type { Q3FileSystem } from "../types.js";

export interface Q3ServerEngineModule {
  FS: Q3FileSystem;
  HEAPU8: Uint8Array;
  callMain(arguments_: readonly string[]): number | void;
  _malloc(size: number): number;
  _free(pointer: number): void;
  _Q3JS_ServerInjectPacket(endpoint: number, data: number, length: number): number;
  _Q3JS_ServerCommand(command: number): void;
  _Q3JS_ServerIsRunning(): number;
}

export interface Q3ServerEngineModuleOptions {
  noInitialRun: boolean;
  locateFile?: (path: string, prefix: string) => string;
  print?: (message: string) => void;
  printErr?: (message: string) => void;
  onAbort?: (reason: unknown) => void;
  onServerPacket?: (endpoint: number, packet: Uint8Array) => void;
}

export default function createIoquake3Server(
  options: Q3ServerEngineModuleOptions,
): Promise<Q3ServerEngineModule>;
