import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEVELOPMENT_EVENT_CLIENT_SECRET,
  eventConfigContents,
  loadConfig,
} from "../dist/app/config.mjs";

test("uses matching local event-ingestion defaults", () => {
  const config = loadConfig({}, []);

  assert.equal(config.masterBaseUrl, "http://localhost:8080/");
  assert.equal(config.eventIngestionUrl, "http://localhost:8080/api/events");
  assert.equal(config.eventClientSecret, DEVELOPMENT_EVENT_CLIENT_SECRET);
});

test("allows event ingestion URL and secret overrides", () => {
  const secret = "production-secret-0123456789abcdef";
  const config = loadConfig({
    Q3JS_MASTER_URL: "https://master.example.com/root",
    Q3JS_EVENT_URL: "https://events.example.com/v1/q3",
    Q3JS_EVENT_CLIENT_SECRET: secret,
  }, []);

  assert.equal(config.masterBaseUrl, "https://master.example.com/root");
  assert.equal(config.eventIngestionUrl, "https://events.example.com/v1/q3");
  assert.equal(config.eventClientSecret, secret);
});

test("allows the complete game-server config to come from the environment", () => {
  const serverConfig = 'seta sv_hostname "Environment Arena"; seta fraglimit "30"; map q3dm17';
  const config = loadConfig({ Q3JS_SERVER_CONFIG: `  ${serverConfig}  ` }, []);

  assert.equal(config.serverConfig, serverConfig);
  assert.equal(loadConfig({}, []).serverConfig, undefined);
});

test("configures trusted reverse-proxy hops for client IP forwarding", () => {
  assert.equal(loadConfig({}, []).trustedProxyHops, 0);
  assert.equal(loadConfig({ Q3JS_TRUST_PROXY_HOPS: "2" }, []).trustedProxyHops, 2);
  assert.throws(
    () => loadConfig({ Q3JS_TRUST_PROXY_HOPS: "17" }, []),
    /Q3JS_TRUST_PROXY_HOPS must be an integer between 0 and 16/,
  );
});

test("rejects unsafe or oversized game-server config", () => {
  assert.throws(
    () => loadConfig({ Q3JS_SERVER_CONFIG: "seta sv_hostname bad\0name" }, []),
    /must not contain null bytes/,
  );
  assert.throws(
    () => loadConfig({ Q3JS_SERVER_CONFIG: "x".repeat(65_537) }, []),
    /must not exceed 65536 bytes/,
  );
});

test("rejects weak event client secrets", () => {
  assert.throws(
    () => loadConfig({ Q3JS_EVENT_CLIENT_SECRET: "too-short" }, []),
    /32 to 512 URL-safe characters/,
  );
});

test("allows anonymous community registration with remote masters", () => {
  const fromMaster = loadConfig({ Q3JS_MASTER_URL: "https://master.example.com" }, []);
  const fromEventUrl = loadConfig({ Q3JS_EVENT_URL: "https://events.example.com/api/events" }, []);

  assert.equal(fromMaster.eventClientSecret, undefined);
  assert.equal(fromEventUrl.eventClientSecret, undefined);
  assert.equal(eventConfigContents(fromMaster), [
    "set sv_killpost_url \"\"",
    "set sv_killpost_client_secret \"\"",
    "",
  ].join("\n"));
});

test("writes the ioq3 event endpoint and secret cvars", () => {
  assert.equal(eventConfigContents({
    eventIngestionUrl: "https://master.example.com/api/events",
    eventClientSecret: "production-secret-0123456789abcdef",
  }), [
    "set sv_killpost_url \"https://master.example.com/api/events\"",
    "set sv_killpost_client_secret \"production-secret-0123456789abcdef\"",
    "",
  ].join("\n"));
});
