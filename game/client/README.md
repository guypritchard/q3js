# @q3js/client

Framework-independent browser client for Q3JS. It owns the Emscripten runtime,
virtual filesystem, asset loading, persistence, WebSocket configuration, and
mobile input bridge.

Build it from the repository root:

```sh
make client
```

Then consume it from a browser-only module:

```ts
import { createQ3Client } from "@q3js/client";

const client = await createQ3Client({
  canvas,
  server: {
    websocketUrl: "wss://example.test:27960",
    address: "example.test:27960",
  },
  player: {
    name: "Ranger",
    countryCode: "RS",
  },
  assets: [
    { url: "/baseq3/pak0.pk3", path: "/baseq3/pak0.pk3" },
  ],
});
```

`player.countryCode` is normalized as a two-letter ISO code and sent through
Quake userinfo as `country`, allowing compatible game VMs to show it on the
in-game scoreboard.

## Browser hosting

The package also includes a Worker-compatible authoritative server runtime. A
relay-backed hosted session registers the game, forwards Quake datagrams, and
resolves only after the master has queried the server successfully:

```ts
import { createQ3BrowserHostedSession } from "@q3js/client";

const session = await createQ3BrowserHostedSession(
  "wss://master.example.test/api/hosted-games/host",
  {
    assets: [{ url: "/baseq3/pak0.pk3", path: "/baseq3/pak0.pk3" }],
    game: { map: "q3dm17" },
    cvars: { sv_hostname: "Browser Arena", bot_minplayers: 4 },
  },
);

console.log(session.gatewayUrl);
session.command("map_restart 0");
session.close();
```

The host page must remain open. Calling `close()`, terminating the Worker, or
closing the page ends the in-memory session and removes it from discovery.
