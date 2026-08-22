import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("preserves a null WebSocket subprotocol", async () => {
  const client = await readFile(new URL("../dist/client.js", import.meta.url), "utf8");

  assert.match(
    client,
    /subprotocol: options\.server\.subprotocol === undefined \? "binary" : options\.server\.subprotocol/,
  );
});

test("reports engine exit separately from startup errors", async () => {
  const client = await readFile(new URL("../dist/client.js", import.meta.url), "utf8");

  assert.match(client, /engineOptions\.onNormalExit = \(\) => reportExit\(0\)/);
  assert.match(client, /engineOptions\.onExit = reportExit/);
});

test("reports a normal quit before engine networking shuts down", async () => {
  const mobileInput = await readFile(
    new URL("../../engine/code/web/q3js_mobile_input.c", import.meta.url),
    "utf8",
  );
  const system = await readFile(
    new URL("../../engine/code/sys/sys_main.c", import.meta.url),
    "utf8",
  );

  assert.match(mobileInput, /Module\["onNormalExit"\]\(\)/);
  assert.match(system, /Q3JS_NotifyNormalExit\( \);\s*#endif\s*Sys_Exit\( 0 \);/);
});
