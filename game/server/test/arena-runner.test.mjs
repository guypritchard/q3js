import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { WebSocket } from 'ws';
import { ArenaRunner } from '../arena-runner/runner.mjs';
import { validateConfig, arenaConfig, resolveAssets } from '../arena-runner/config.mjs';
import { parseStatus } from '../arena-runner/status.mjs';
import { authorizeAdmin } from '../arena-runner/admin-auth.mjs';

const arena = { id: 'classic', name: 'Classic FFA', maps: ['q3dm6', 'q3dm7'], bots: 0 };
async function until(predicate, timeout = 3000) {
  const end = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() > end) throw new Error('Timed out');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}
const options = config => ({ config, workerUrl: new URL('./fixtures/arena-worker.mjs', import.meta.url), startupTimeoutMs: 500 });
async function connect(url) { const ws = new WebSocket(url); await once(ws, 'open'); return ws; }

test('arena config validates ids, commands, budgets and closes the playlist', () => {
  const valid = validateConfig({ arenas: [arena] });
  assert.match(arenaConfig(valid.arenas[0]), /set rotation1 "map q3dm7; set nextmap vstr rotation0"/);
  assert.match(arenaConfig(valid.arenas[0]), /vstr rotation0\n$/);
  for (const bad of [{ ...arena, id: undefined }, { ...arena, id: '../bad' }, { ...arena, name: 'x";quit' }, { ...arena, maps: ['q3dm6;quit'] }, { ...arena, bots: 33 }, { ...arena, fraglimit: 0 }]) {
    assert.throws(() => validateConfig({ arenas: [bad] }));
  }
  assert.throws(() => validateConfig({ arenas: [arena, arena] }));
});

test('asset manifest rejects paths, duplicates and missing files', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'q3js-arena-'));
  try {
    await writeFile(path.join(directory, 'pak0.pk3'), 'fixture');
    assert.equal((await resolveAssets(directory, ['pak0.pk3']))[0].size, 7);
    await assert.rejects(resolveAssets(directory, ['../pak0.pk3']));
    await assert.rejects(resolveAssets(directory, ['pak0.pk3', 'pak0.pk3']));
    await assert.rejects(resolveAssets(directory, ['missing.pk3']));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('named routes isolate binary datagrams between arenas and connections', async t => {
  const runner = new ArenaRunner(options({ arenas: [arena, { ...arena, id: 'other' }] }));
  t.after(() => runner.close());
  const address = await runner.start();
  await until(() => runner.status().every(state => state.state === 'ready'));
  const root = `http://127.0.0.1:${address.port}`;
  assert.equal((await fetch(`${root}/healthz`)).status, 200);
  assert.equal((await fetch(`${root}/admin/start`, { method: 'POST' })).status, 404);
  const first = await connect(`ws://127.0.0.1:${address.port}/arenas/classic/ws`);
  const second = await connect(`ws://127.0.0.1:${address.port}/arenas/other/ws`);
  const third = await connect(`ws://127.0.0.1:${address.port}/arenas/classic/ws`);
  t.after(() => { first.terminate(); second.terminate(); third.terminate(); });
  let leaked = false;
  second.on('message', () => { leaked = true; });
  third.on('message', () => { leaked = true; });
  const reply = once(first, 'message');
  first.send(Buffer.from([1, 2, 3]));
  assert.deepEqual([...((await reply)[0])], [1, 2, 3]);
  assert.equal(leaked, false);
  const closed = once(first, 'close');
  first.send('not a game packet');
  assert.equal((await closed)[0], 1003);
  const invalid = new WebSocket(`ws://127.0.0.1:${address.port}/arenas/missing/ws`);
  await once(invalid, 'error');
  invalid.terminate();
});

test('startup timeout and engine crash fail closed without killing other arenas', async t => {
  const runner = new ArenaRunner(options({ arenas: [arena, { ...arena, id: 'timeout' }] }));
  t.after(() => runner.close());
  const address = await runner.start();
  await until(() => runner.status().some(state => state.state === 'failed'));
  assert.equal((await fetch(`http://127.0.0.1:${address.port}/healthz`)).status, 503);
  assert.equal(runner.status()[0].state, 'ready');
  const ws = await connect(`ws://127.0.0.1:${address.port}/arenas/classic/ws`);
  const closed = once(ws, 'close');
  ws.send(Buffer.from([255]));
  await closed;
  await until(() => runner.status()[0].state === 'failed');
});

test('bind failure tears down workers and repeated shutdown is safe', async () => {
  const blocker = createServer();
  blocker.listen(0, '127.0.0.1');
  await once(blocker, 'listening');
  const runner = new ArenaRunner(options({ arenas: [arena] }));
  try {
    await assert.rejects(runner.start({ port: blocker.address().port }), /EADDRINUSE/);
    assert.equal(runner.status()[0].state, 'stopped');
    assert.equal(runner.arenas.get('classic').worker.threadId, -1);
    await Promise.all([runner.close(), runner.close()]);
  } finally { await new Promise(resolve => blocker.close(resolve)); }
});

test('status parser accepts bounded Quake status and rejects malformed packets', () => {
  const status = Buffer.concat([Buffer.from([255,255,255,255]), Buffer.from('statusResponse\n\\mapname\\q3dm7\\sv_maxclients\\12\\com_protocol\\71\n10 0 "Bot"\n5 30 "Player"\n')]);
  const parsed = parseStatus(status);
  assert.equal(parsed.map, 'q3dm7');
  assert.equal(parsed.users.length, 2);
  assert.equal(parsed.info.com_protocol, 71);
  assert.equal(parseStatus(Buffer.from('not status')), undefined);
  assert.equal(parseStatus(new Uint8Array(17000)), undefined);
});

test('management verifies admin tokens with the master and fails closed', async () => {
  const token = 'Bearer valid-test-token-0000000000';
  assert.equal(await authorizeAdmin(undefined, 'http://master:8080'), 401);
  assert.equal(await authorizeAdmin(token, undefined), 503);
  assert.equal(await authorizeAdmin(token, 'http://master:8080', async (url, options) => {
    assert.equal(url.href, 'http://master:8080/api/admin/bans');
    assert.equal(options.headers.Authorization, token);
    assert.equal(options.redirect, 'error');
    return new Response('private ban data', { status: 200 });
  }), 200);
  for (const status of [401, 403, 500]) {
    assert.equal(await authorizeAdmin(token, 'http://master:8080', async () => new Response('', { status })), status === 500 ? 503 : status);
  }
  assert.equal(await authorizeAdmin(token, 'http://master:8080', async () => { throw new Error('offline'); }), 503);
});

test('authenticated lifecycle serializes operations and isolates restart', async t => {
  let authChecks = 0;
  const runner = new ArenaRunner({ ...options({ arenas: [{ ...arena, autostart: false }, { ...arena, id: 'other' }] }), masterUrl: 'http://master:8080',
    fetcher: async () => { authChecks++; return new Response('[]'); } });
  t.after(() => runner.close());
  const address = await runner.start();
  const root = `http://127.0.0.1:${address.port}`;
  assert.equal(runner.status()[0].state, 'stopped');
  assert.equal((await fetch(`${root}/arenas/classic/start`, { method: 'POST' })).status, 401);
  assert.equal(authChecks, 0);
  const headers = { Authorization: 'Bearer valid-test-token-0000000000' };
  assert.equal((await fetch(`${root}/arenas/classic/start`, { method: 'POST', headers })).status, 200);
  await until(() => runner.status()[0].state === 'ready' && runner.status()[0].status?.map === 'q3dm6');
  const oldWorker = runner.arenas.get('classic').worker;
  const otherWorker = runner.arenas.get('other').worker;
  await Promise.all([runner.action('classic', 'stop'), runner.action('classic', 'start'), runner.action('classic', 'restart')]);
  await until(() => runner.status()[0].state === 'ready');
  assert.equal(oldWorker.threadId, -1);
  assert.equal(runner.arenas.get('other').worker, otherWorker);
  assert.equal((await fetch(`${root}/arenas/classic/stop`, { method: 'POST', headers, body: 'not allowed' })).status, 413);
  assert.equal((await fetch(`${root}/arenas/classic/stop`, { method: 'POST', headers })).status, 200);
  assert.equal(runner.status()[0].state, 'stopped');
  assert.equal(runner.status()[0].status, undefined);
  assert.equal(authChecks, 2);
});

test('WASM admission respects bans and drops newly banned sockets', async t => {
  let banned = true;
  const runner = new ArenaRunner({ ...options({ arenas: [arena] }), isBanned: () => banned });
  t.after(() => runner.close());
  const address = await runner.start();
  await until(() => runner.status()[0].state === 'ready');
  const url = `ws://127.0.0.1:${address.port}/arenas/classic/ws`;
  const rejected = new WebSocket(url);
  const [error] = await once(rejected, 'error');
  assert.match(error.message, /403/);
  banned = false;
  const admitted = await connect(url);
  const closed = once(admitted, 'close');
  banned = true;
  runner.disconnectBannedClients();
  await closed;
});
