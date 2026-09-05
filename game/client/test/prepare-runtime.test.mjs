import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

const execute = promisify(execFile);
const script = new URL("../scripts/prepare-runtime.mjs", import.meta.url);
const directoryProbe = 'new URL(".",_scriptName).href';
const bundlerSafeDirectoryProbe = '_scriptName.slice(0,_scriptName.lastIndexOf("/")+1)';

test("prepares the client and browser-server runtimes", async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), "q3js-client-runtime-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const outputDirectory = path.join(directory, "output");

  for (const runtime of ["ioquake3", "ioq3ded"]) {
    await writeFile(path.join(directory, `${runtime}.js`), `const root=${directoryProbe};`);
    await writeFile(path.join(directory, `${runtime}.wasm`), runtime);
  }

  await execute(process.execPath, [fileURLToPath(script), directory, outputDirectory]);

  for (const runtime of ["ioquake3", "ioq3ded"]) {
    const generatedJavaScript = await readFile(
      path.join(outputDirectory, `${runtime}.js`),
      "utf8",
    );
    assert.equal(generatedJavaScript.includes(directoryProbe), false);
    assert.equal(generatedJavaScript.includes(bundlerSafeDirectoryProbe), true);
    assert.equal(
      await readFile(path.join(outputDirectory, `${runtime}.wasm`), "utf8"),
      runtime,
    );
  }
});
