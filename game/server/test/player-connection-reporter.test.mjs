import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { PlayerConnectionReporter } from "../dist/app/player-connection-reporter.mjs";

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

test("posts player connections to the master", async () => {
  let received;
  const server = createServer((request, response) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      received = {
        method: request.method,
        path: request.url,
        clientSecret: request.headers["x-q3js-client-secret"],
        body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
      };
      response.writeHead(204);
      response.end();
    });
  });
  await listen(server);
  const address = server.address();
  const reporter = new PlayerConnectionReporter({
    masterBaseUrl: `http://127.0.0.1:${address.port}`,
    clientSecret: "0123456789abcdef0123456789abcdef",
    timeoutMs: 2_000,
    serverHost: "game.example.com",
    serverPort: 27961,
  });

  await reporter.report({
    clientIp: "203.0.113.7",
    playerName: "^1Ranger",
    userinfo: { name: "^1Ranger", rate: "25000" },
  });
  reporter.stop();
  await close(server);

  assert.deepEqual(received, {
    method: "POST",
    path: "/api/player-connections",
    clientSecret: "0123456789abcdef0123456789abcdef",
    body: {
      clientIp: "203.0.113.7",
      playerName: "^1Ranger",
      userinfo: { name: "^1Ranger", rate: "25000" },
      serverHost: "game.example.com",
      serverPort: 27961,
    },
  });
});

test("does not report without a client secret", async () => {
  const reporter = new PlayerConnectionReporter({
    masterBaseUrl: "https://master.example.com",
    clientSecret: undefined,
    timeoutMs: 2_000,
    serverHost: "community.example.com",
    serverPort: 27961,
  });
  await reporter.report({
    clientIp: "203.0.113.7",
    playerName: "Ranger",
    userinfo: { name: "Ranger" },
  });
});
