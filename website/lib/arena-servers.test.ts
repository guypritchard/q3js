import assert from "node:assert/strict";
import { test } from "node:test";
import { mapArenaServers } from "./arena-servers.ts";

const arena = { id: "classic", name: "Classic", state: "ready", gatewayPath: "/arenas/classic/ws", status: {
  map: "q3dm6", users: [{ name: "Bot", ping: 0, score: 2 }], info: { sv_maxclients: 12, fraglimit: 20, com_protocol: 71 },
} };
test("ready WASM arenas have stable same-origin routes and real live state", () => {
  const servers = mapArenaServers({ arenas: [arena] }, "https://q3js.amber-fly.org");
  assert.equal(servers[0].gatewayUrl, "wss://q3js.amber-fly.org/arenas/classic/ws");
  assert.equal(servers[0].map, "q3dm6");
  assert.equal(servers[0].users[0].bot, true);
  assert.equal(servers[0].id, "arena:classic");
  assert.equal(servers[0].fsGame, "q3js");
});
test("stopped, stale, malformed and off-origin arena listings fail closed", () => {
  for (const bad of [{ ...arena, state: "stopped" }, { ...arena, status: undefined }, { ...arena, gatewayPath: "https://evil.example/ws" }, { ...arena, id: "../admin" }]) {
    assert.deepEqual(mapArenaServers({ arenas: [bad] }, "https://q3js.amber-fly.org"), []);
  }
  assert.deepEqual(mapArenaServers(undefined, "https://q3js.amber-fly.org"), []);
  assert.equal(mapArenaServers({ arenas: [arena, arena] }, "http://localhost:3000").length, 1);
});
