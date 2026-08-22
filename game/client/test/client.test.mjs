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
