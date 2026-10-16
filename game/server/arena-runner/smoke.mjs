import assert from 'node:assert/strict';
import { once } from 'node:events';
import path from 'node:path';
import { WebSocket } from 'ws';
import { resolveAssets } from './config.mjs';
import { ArenaRunner } from './runner.mjs';

const directory = process.env.Q3JS_ARENA_ASSETS;
const runtime = process.env.Q3JS_ARENA_RUNTIME;
if (!directory || !runtime) throw new Error('Set Q3JS_ARENA_ASSETS and Q3JS_ARENA_RUNTIME to run the real WASM smoke test.');
const config = { arenas: [{ id: 'wasm-smoke', name: 'WASM Smoke Test', maps: ['q3dm6', 'q3dm7'], bots: 2, timelimit: 1, fraglimit: 1000 }] };
const pk3s = process.env.Q3JS_ARENA_PK3S?.split(',') ?? Array.from({ length: 9 }, (_, i) => `pak${i}.pk3`);
const assets = await resolveAssets(directory, pk3s);
let lastOutput = '';
const runner = new ArenaRunner({ config, runtime: path.resolve(runtime), wasm: path.resolve(process.env.Q3JS_ARENA_WASM ?? runtime.replace(/\.mjs$/, '.wasm')), assets,
  onLog: (_id, message) => { lastOutput = message; if (/Server:|Error|error|Exit:/.test(message)) console.log(message); } });
let ws;
try {
  const address = await runner.start();
  const deadline = Date.now() + 180000;
  while (runner.status()[0].state !== 'ready') {
    assert.notEqual(runner.status()[0].state, 'failed', `Engine failed: ${lastOutput}`);
    assert.ok(Date.now() < deadline, 'Engine startup timeout');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  ws = new WebSocket(`ws://127.0.0.1:${address.port}/arenas/wasm-smoke/ws`);
  await once(ws, 'open');
  const seen = new Set();
  ws.on('error', () => {});
  ws.on('message', data => {
    const response = data.toString('latin1');
    const map = /\\mapname\\([^\\\n]+)/.exec(response)?.[1];
    if (map && !seen.has(map)) { seen.add(map); console.log(`GETSTATUS_MAP=${map}`); }
  });
  while (!seen.has('q3dm7')) {
    assert.ok(Date.now() < deadline, `Map transition timeout. Last engine output: ${lastOutput}`);
    assert.equal(runner.status()[0].state, 'ready', `Engine failed: ${lastOutput}`);
    assert.equal(ws.readyState, WebSocket.OPEN, 'WebSocket closed during smoke test');
    ws.send(Buffer.concat([Buffer.from([255, 255, 255, 255]), Buffer.from('getstatus wasm-smoke\n')]));
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  assert.ok(seen.has('q3dm6'), 'Initial map status was not received');
  console.log('PASS: real WASM Node worker, named WebSocket getstatus, and automatic q3dm6 -> q3dm7 transition');
} finally {
  ws?.terminate();
  await runner.close();
}
