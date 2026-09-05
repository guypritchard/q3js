import assert from "node:assert/strict";
import test from "node:test";

import { createQ3BrowserHostedSession } from "../dist/relay.js";

test("opens the browser-host relay without an unsupported subprotocol", async (context) => {
  const originalWebSocket = globalThis.WebSocket;
  let constructorArguments;

  class MockWebSocket extends EventTarget {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    binaryType = "blob";
    readyState = MockWebSocket.CONNECTING;

    constructor(...arguments_) {
      super();
      constructorArguments = arguments_;
    }

    close() {
      this.readyState = MockWebSocket.CLOSED;
    }
  }

  globalThis.WebSocket = MockWebSocket;
  context.after(() => {
    if (originalWebSocket === undefined) {
      delete globalThis.WebSocket;
    } else {
      globalThis.WebSocket = originalWebSocket;
    }
  });

  const controller = new AbortController();
  const session = createQ3BrowserHostedSession("wss://master.example/api/hosted-games/host", {
    signal: controller.signal,
  });

  assert.deepEqual(constructorArguments, ["wss://master.example/api/hosted-games/host"]);
  controller.abort(new Error("Test complete"));
  await assert.rejects(session, /Test complete/);
});
