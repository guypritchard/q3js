import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const [, , sourceDirectory, outputDirectory] = process.argv;
if (!sourceDirectory || !outputDirectory) {
  throw new Error("Usage: prepare-runtime.mjs <source-directory> <output-directory>");
}

const directoryProbe = 'new URL(".",_scriptName).href';
const bundlerSafeDirectoryProbe = '_scriptName.slice(0,_scriptName.lastIndexOf("/")+1)';

await mkdir(outputDirectory, { recursive: true });

for (const runtime of ["ioquake3", "ioq3ded"]) {
  const sourceJavaScript = path.join(sourceDirectory, `${runtime}.js`);
  const generatedJavaScript = await readFile(sourceJavaScript, "utf8");
  const occurrences = generatedJavaScript.split(directoryProbe).length - 1;
  if (occurrences !== 1) {
    throw new Error(
      `Expected exactly one Emscripten script-directory probe in ${runtime}.js, found ${occurrences}.`,
    );
  }

  await writeFile(
    path.join(outputDirectory, `${runtime}.js`),
    generatedJavaScript.replace(directoryProbe, bundlerSafeDirectoryProbe),
  );
  await copyFile(
    path.join(sourceDirectory, `${runtime}.wasm`),
    path.join(outputDirectory, `${runtime}.wasm`),
  );
}
