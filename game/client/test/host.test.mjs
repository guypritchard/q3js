import assert from "node:assert/strict";
import test from "node:test";

import { createQ3BrowserHost } from "../dist/host.js";

test("loads the browser-host Worker from an explicit URL", (context) => {
  const originalDocument = globalThis.document;
  const originalWorker = globalThis.Worker;
  let constructorArguments;

  class MockWorker extends EventTarget {
    constructor(...arguments_) {
      super();
      constructorArguments = arguments_;
    }

    postMessage() {}
    terminate() {}
  }

  globalThis.document = { baseURI: "https://q3js.example/host" };
  globalThis.Worker = MockWorker;
  context.after(() => {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    if (originalWorker === undefined) delete globalThis.Worker;
    else globalThis.Worker = originalWorker;
  });

  const host = createQ3BrowserHost({
    assets: [],
    workerUrl: "/browser-host/host-worker.js",
  });

  assert.equal(constructorArguments[0].href, "https://q3js.example/browser-host/host-worker.js");
  assert.deepEqual(constructorArguments[1], { type: "module" });
  host.dispose();
});
