import assert from "node:assert/strict";
import { createSocket } from "node:dgram";
import { test } from "node:test";
import { WebSocket } from "ws";
import { Gateway } from "../dist/app/gateway.mjs";
import { compressHuffman } from "../dist/app/huffman.mjs";

function listenUdp(socket) {
  return new Promise((resolve, reject) => {
    socket.once("error", reject);
    socket.bind(0, "127.0.0.1", () => {
      socket.off("error", reject);
      resolve();
    });
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

test("gateway forwards binary WebSocket messages through UDP", async () => {
  const udp = createSocket("udp4");
  await within(listenUdp(udp), "UDP bind");
  udp.on("message", (message, remote) => udp.send(message, remote.port, remote.address));
  const udpAddress = udp.address();

  const gateway = new Gateway({
    host: "127.0.0.1",
    port: 0,
    targetHost: "127.0.0.1",
    targetPort: udpAddress.port,
    maxConnections: 2,
    maxPacketBytes: 65535,
    idleTimeoutMs: 5000,
    ready: () => true,
  });
  await within(gateway.start(), "gateway start");

  const webSocket = new WebSocket(`ws://127.0.0.1:${gateway.address().port}/ws`);
  await within(new Promise((resolve, reject) => {
    webSocket.once("open", resolve);
    webSocket.once("error", reject);
  }), "WebSocket open");

  const response = new Promise((resolve) => webSocket.once("message", resolve));
  webSocket.send(Buffer.from("q3js"));
  const message = await within(response, "gateway response");
  assert.equal(Buffer.from(message).toString(), "q3js");

  webSocket.close();
  await within(new Promise((resolve) => webSocket.once("close", resolve)), "WebSocket close");
  await within(gateway.stop(), "gateway stop");
  udp.close();
});

test("gateway reports decoded userinfo and forwards the connect packet unchanged", async () => {
  const udp = createSocket("udp4");
  await within(listenUdp(udp), "UDP bind");
  const udpAddress = udp.address();
  let reported;

  const gateway = new Gateway({
    host: "127.0.0.1",
    port: 0,
    targetHost: "127.0.0.1",
    targetPort: udpAddress.port,
    maxConnections: 2,
    maxPacketBytes: 65535,
    trustedProxyHops: 1,
    idleTimeoutMs: 5000,
    ready: () => true,
    playerConnected: (connection) => {
      reported = connection;
    },
  });
  await within(gateway.start(), "gateway start");

  const webSocket = new WebSocket(`ws://127.0.0.1:${gateway.address().port}/ws`, {
    headers: { "x-forwarded-for": "192.0.2.10, 203.0.113.7" },
  });
  await within(new Promise((resolve, reject) => {
    webSocket.once("open", resolve);
    webSocket.once("error", reject);
  }), "WebSocket open");

  const info = "\\name\\^1Ranger\\rate\\25000\\clientip\\198.51.100.99"
    + "\\password\\secret\\rconPassword\\also-secret\\protocol\\71";
  const packet = Buffer.concat([
    Buffer.from("\xff\xff\xff\xffconnect ", "latin1"),
    compressHuffman(Buffer.from(`\"${info}\"`, "latin1")),
  ]);
  const forwarded = within(
    new Promise((resolve) => udp.once("message", (message, remote) => {
      udp.send(
        Buffer.from("\xff\xff\xff\xffconnectResponse", "latin1"),
        remote.port,
        remote.address,
      );
      resolve(message);
    })),
    "forwarded connect packet",
  );
  webSocket.send(packet);

  assert.deepEqual(await forwarded, packet);
  await within(new Promise((resolve) => {
    const check = () => reported ? resolve() : setTimeout(check, 1);
    check();
  }), "player connection report");
  assert.equal(reported.clientIp, "203.0.113.7");
  assert.equal(reported.playerName, "^1Ranger");
  assert.deepEqual({ ...reported.userinfo }, {
    name: "^1Ranger",
    rate: "25000",
    protocol: "71",
  });

  webSocket.close();
  await within(new Promise((resolve) => webSocket.once("close", resolve)), "WebSocket close");
  await within(gateway.stop(), "gateway stop");
  udp.close();
});

test("gateway rejects banned clients before accepting the WebSocket", async () => {
  const gateway = new Gateway({
    host: "127.0.0.1",
    port: 0,
    targetHost: "127.0.0.1",
    targetPort: 27960,
    maxConnections: 2,
    maxPacketBytes: 65535,
    trustedProxyHops: 1,
    idleTimeoutMs: 5000,
    ready: () => true,
    isBanned: (clientIp) => clientIp === "203.0.113.7",
  });
  await within(gateway.start(), "gateway start");

  const webSocket = new WebSocket(`ws://127.0.0.1:${gateway.address().port}/ws`, {
    headers: { "x-forwarded-for": "203.0.113.7" },
  });
  const status = await within(new Promise((resolve, reject) => {
    webSocket.once("unexpected-response", (_request, response) => {
      response.resume();
      resolve(response.statusCode);
    });
    webSocket.once("open", () => reject(new Error("Banned WebSocket was accepted.")));
    webSocket.once("error", reject);
  }), "banned WebSocket rejection");

  assert.equal(status, 403);
  await within(gateway.stop(), "gateway stop");
});

test("gateway disconnects a client that becomes banned while connected", async () => {
  let banned = false;
  const gateway = new Gateway({
    host: "127.0.0.1",
    port: 0,
    targetHost: "127.0.0.1",
    targetPort: 27960,
    maxConnections: 2,
    maxPacketBytes: 65535,
    trustedProxyHops: 1,
    idleTimeoutMs: 5000,
    ready: () => true,
    isBanned: (clientIp) => banned && clientIp === "203.0.113.7",
  });
  await within(gateway.start(), "gateway start");

  const webSocket = new WebSocket(`ws://127.0.0.1:${gateway.address().port}/ws`, {
    headers: { "x-forwarded-for": "203.0.113.7" },
  });
  await within(new Promise((resolve, reject) => {
    webSocket.once("open", resolve);
    webSocket.once("error", reject);
  }), "WebSocket open");

  const closed = new Promise((resolve) => webSocket.once("close", (code, reason) => {
    resolve({ code, reason: reason.toString() });
  }));
  banned = true;
  assert.equal(gateway.disconnectBannedClients(), 1);
  assert.deepEqual(await within(closed, "banned WebSocket close"), {
    code: 1008,
    reason: "IP address banned",
  });

  await within(gateway.stop(), "gateway stop");
});
