import assert from "node:assert/strict";
import { test } from "node:test";
import { mapServers } from "./master-server.ts";

test("retired external seed is omitted while other servers remain", () => {
  const hosts = ["q3.pieter.com", "Q3.PIETER.COM.", "q3js.amber-fly.org", "community.example.com", "not-q3.pieter.com"];
  const servers = hosts.map((host) => ({
    id: `${host}:443`, host, gatewayUrl: `wss://${host}/ws`, proxyPort: 443,
    targetPort: 27960, secure: true, official: false, hosted: false,
    info: { sv_hostname: host, users: [] },
  }));
  assert.deepEqual(mapServers(servers as Parameters<typeof mapServers>[0]).map((server) => server.host), hosts.slice(2));
});
