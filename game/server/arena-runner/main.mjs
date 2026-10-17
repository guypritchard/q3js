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
  const masterUrl = process.env.Q3JS_ARENA_MASTER_URL;
  const secret = process.env.Q3JS_EVENT_CLIENT_SECRET;
  const trustedProxyHops = Number(process.env.Q3JS_TRUST_PROXY_HOPS ?? 0);
  if (!Number.isInteger(trustedProxyHops) || trustedProxyHops < 0 || trustedProxyHops > 16) throw new Error('Invalid proxy hop count.');
  let bans;
  let clientIp;
  if (secret) {
    if (!masterUrl) throw new Error('Ban synchronization requires a master URL.');
    const { BanList } = await import('../dist/app/ban-list.mjs');
    const { clientIpAddress } = await import('../dist/app/ip-address.mjs');
    bans = new BanList({ masterBaseUrl: masterUrl, clientSecret: secret, intervalMs: 10000, timeoutMs: 5000 });
    clientIp = request => clientIpAddress(request, trustedProxyHops);
    await bans.start();
  }
  const runner = new ArenaRunner({ config, runtime, wasm: path.resolve(process.env.Q3JS_ARENA_WASM ?? runtime.replace(/\.mjs$/, '.wasm')), assets,
    masterUrl, clientIp, isBanned: address => bans?.isBanned(address) ?? false,
    onLog: (id, message) => console.log(`[${id}] ${message}`) });
  bans?.onUpdate(() => runner.disconnectBannedClients());
  try { await runner.start({ host: process.env.Q3JS_ARENA_HOST ?? '127.0.0.1', port }); }
  catch (error) { bans?.stop(); throw error; }
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { bans?.stop(); void runner.close().then(() => process.exit(0)); });
  console.log(`Arena runner listening on port ${port}; GET /healthz for engine readiness.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
