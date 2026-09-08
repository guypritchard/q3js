import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const emscriptenPlatform = new URL(
  "../../engine/cmake/platforms/emscripten.cmake",
  import.meta.url,
);
const commonSource = new URL(
  "../../engine/code/qcommon/common.c",
  import.meta.url,
);

test("exports the browser-server heap used for packet injection", async () => {
  const configuration = await readFile(emscriptenPlatform, "utf8");

  assert.match(configuration, /-sEXPORTED_RUNTIME_METHODS=FS,HEAPU8,callMain/);
});

test("pumps fragmented browser-server packets without blocking", async () => {
  const source = await readFile(commonSource, "utf8");

  assert.match(
    source,
    /#ifdef Q3JS_BROWSER_SERVER[\s\S]*?SV_SendQueuedPackets\(\);[\s\S]*?#else[\s\S]*?NET_Sleep/,
  );
});
