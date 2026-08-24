import assert from "node:assert/strict";
import test from "node:test";
import { preparePersistence } from "../dist/assets.js";

test("persists game assets and player data by default", async () => {
  const mounts = [];
  const idbfs = {};
  const module = {
    FS: {
      filesystems: { IDBFS: idbfs },
      mkdirTree() {},
      mount(type, options, mountpoint) {
        mounts.push({ type, options, mountpoint });
      },
      syncfs(_populate, callback) {
        callback(null);
      },
    },
  };

  const persistent = await preparePersistence(module, {
    assets: [
      { path: "/baseq3/pak0.pk3", url: "https://example.com/baseq3/pak0.pk3" },
      { path: "/cpma/z-cpma-pak153.pk3", url: "https://example.com/cpma/z-cpma-pak153.pk3" },
    ],
  });

  assert.equal(persistent, true);
  assert.deepEqual(
    mounts.map(({ mountpoint }) => mountpoint),
    ["/baseq3", "/cpma", "/persist"],
  );
  assert.ok(mounts.every(({ type }) => type === idbfs));
  assert.ok(mounts.every(({ options }) => options.autoPersist === true));
});
