import { copyFile, mkdir, rm } from "node:fs/promises";

const clientDist = new URL("../../game/client/dist/", import.meta.url);
const output = new URL("../public/browser-host/", import.meta.url);
const runtimeOutput = new URL("runtime/", output);

await rm(output, { recursive: true, force: true });
await mkdir(runtimeOutput, { recursive: true });

await Promise.all([
  copyFile(new URL("host-worker.js", clientDist), new URL("host-worker.js", output)),
  copyFile(new URL("host-worker.js.map", clientDist), new URL("host-worker.js.map", output)),
  copyFile(new URL("runtime/ioq3ded.js", clientDist), new URL("ioq3ded.js", runtimeOutput)),
  copyFile(new URL("runtime/ioq3ded.wasm", clientDist), new URL("ioq3ded.wasm", runtimeOutput)),
]);
