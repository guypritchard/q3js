import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function serviceBlock(compose, name) {
  const marker = `  ${name}:\n`;
  const start = compose.indexOf(marker);
  assert.notEqual(start, -1, `missing ${name} service`);
  const remainder = compose.slice(start + marker.length);
  const next = remainder.search(/\n  [A-Za-z0-9_-]+:\r?\n/);
  return compose.slice(start, next === -1 ? undefined : start + marker.length + next);
}

test("production arena has an isolated closed stock-map rotation", async () => {
  const compose = await readFile(path.join(repository, "deploy/compose.yml"), "utf8");
  const arena = serviceBlock(compose, "arena-server");
  const hub = serviceBlock(compose, "hub-server");

  assert.match(arena, /Q3JS_PUBLISH_HOST: q3js-ffa\.amber-fly\.org/);
  assert.match(arena, /Q3JS_PUBLISH_PORT: 443/);
  assert.match(arena, /127\.0\.0\.1:3084:27961/);
  assert.match(arena, /data\/arena-state:\/state/);
  assert.match(arena, /data\/game\/baseq3:\/data\/baseq3:ro/);
  assert.match(arena, /seta g_gametype "0"/);
  assert.match(arena, /seta bot_minplayers "4"/);
  assert.match(arena, /seta fraglimit "20"/);
  assert.match(arena, /seta timelimit "12"/);

  const links = [...arena.matchAll(/set d(\d) "map (q3dm\d+); set nextmap vstr d(\d)"/g)]
    .map((match) => ({ from: Number(match[1]), map: match[2], to: Number(match[3]) }));
  assert.deepEqual(links, [
    { from: 1, map: "q3dm6", to: 2 },
    { from: 2, map: "q3dm7", to: 3 },
    { from: 3, map: "q3dm13", to: 4 },
    { from: 4, map: "q3dm15", to: 5 },
    { from: 5, map: "q3dm17", to: 1 },
  ]);
  assert.match(arena, /\n        vstr d1\n/);

  assert.match(hub, /Q3JS_PUBLISH_HOST: q3js\.amber-fly\.org/);
  assert.match(hub, /127\.0\.0\.1:3083:27961/);
  assert.match(hub, /map q3js_hub/);
  assert.doesNotMatch(hub, /q3js-ffa|arena-state|q3dm6/);
});

test("Caddy and Cloudflare provision a distinct arena gateway", async () => {
  const [caddy, cloudflare] = await Promise.all([
    readFile(path.join(repository, "deploy/Caddyfile"), "utf8"),
    readFile(path.join(repository, "deploy/install-cloudflare.py"), "utf8"),
  ]);

  assert.match(caddy, /http:\/\/q3js-ffa\.amber-fly\.org \{[\s\S]*?handle \/ws \{[\s\S]*?reverse_proxy 127\.0\.0\.1:3084/);
  assert.match(cloudflare, /HOSTNAMES = \("q3js\.amber-fly\.org", "q3js-ffa\.amber-fly\.org"\)/);
  assert.match(cloudflare, /catch_all = next/);
  assert.match(cloudflare, /ingress\.insert\(catch_all, desired_rule\)/);
});
