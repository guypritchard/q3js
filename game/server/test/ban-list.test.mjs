import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { BanList } from "../dist/app/ban-list.mjs";

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

function within(promise, label) {
  let timeout;
  const result = Promise.race([
    promise,
    new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error(`${label} timed out`)), 2000);
    }),
  ]);
  return result.finally(() => clearTimeout(timeout));
}

test("periodically refreshes authenticated bans and retains the last good list", async () => {
  let requests = 0;
  let receivedSecret;
  let secondRequest;
  const secondRequestReceived = new Promise((resolve) => {
    secondRequest = resolve;
  });
  const server = createServer((request, response) => {
    requests++;
    receivedSecret = request.headers["x-q3js-client-secret"];
    if (requests === 1) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify([
        { ipAddress: "203.0.113.7", playerName: "Ranger", bannedAt: "2026-08-09T20:00:00Z" },
        { ipAddress: "2001:0db8:0:0:0:0:0:1", playerName: null, bannedAt: "2026-08-09T20:01:00Z" },
      ]));
      return;
    }
    response.writeHead(500);
    response.end();
    secondRequest();
  });
  await listen(server);
  const address = server.address();
  const bans = new BanList({
    masterBaseUrl: `http://127.0.0.1:${address.port}`,
    clientSecret: "0123456789abcdef0123456789abcdef",
    intervalMs: 10,
    timeoutMs: 1000,
  });
  let updates = 0;
  bans.onUpdate(() => updates++);

  await bans.start();
  assert.equal(updates, 1);
  assert.equal(receivedSecret, "0123456789abcdef0123456789abcdef");
  assert.equal(bans.isBanned("203.0.113.7"), true);
  assert.equal(bans.isBanned("2001:db8::1"), true);
  assert.equal(bans.isBanned("203.0.113.8"), false);

  await within(secondRequestReceived, "second ban refresh");
  assert.equal(bans.isBanned("203.0.113.7"), true);
  assert.equal(updates, 1);

  bans.stop();
  await close(server);
});
