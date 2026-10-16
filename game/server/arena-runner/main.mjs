import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ArenaRunner } from './runner.mjs';
import { resolveAssets, validateConfig } from './config.mjs';

async function main() {
  if (!process.env.Q3JS_ARENA_CONFIG || !process.env.Q3JS_ARENA_RUNTIME || !process.env.Q3JS_ARENA_ASSETS) {
    throw new Error('Set Q3JS_ARENA_CONFIG, Q3JS_ARENA_RUNTIME (.mjs), and Q3JS_ARENA_ASSETS (baseq3 directory).');
  }
  const configFile = await readFile(process.env.Q3JS_ARENA_CONFIG, 'utf8');
  if (Buffer.byteLength(configFile) > 65536) throw new Error('Config too large.');
  const config = JSON.parse(configFile);
  validateConfig(config);
  const runtime = path.resolve(process.env.Q3JS_ARENA_RUNTIME);
  if (!runtime.endsWith('.mjs')) throw new Error('Copy the generated ES6 ioq3ded.js module to ioq3ded.mjs.');
  const assets = await resolveAssets(process.env.Q3JS_ARENA_ASSETS, config.pk3s);
  const port = Number(process.env.Q3JS_ARENA_PORT ?? 3090);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port.');
  const runner = new ArenaRunner({ config, runtime, wasm: path.resolve(process.env.Q3JS_ARENA_WASM ?? runtime.replace(/\.mjs$/, '.wasm')), assets,
    onLog: (id, message) => console.log(`[${id}] ${message}`) });
  await runner.start({ host: process.env.Q3JS_ARENA_HOST ?? '127.0.0.1', port });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void runner.close().then(() => process.exit(0)); });
  console.log(`Arena runner listening on port ${port}; GET /healthz for engine readiness.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
