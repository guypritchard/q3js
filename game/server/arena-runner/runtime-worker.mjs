import { parentPort, workerData } from 'node:worker_threads';
import { readFile, realpath } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { arenaConfig } from './config.mjs';
import { parseStatus } from './status.mjs';

const STATUS_ENDPOINT = 0xffffff;

let runtime;
let ready = false;
let logs = 0;
const post = value => parentPort.postMessage(value);
const output = message => {
  // Prevent an engine/client from flooding the parent message queue with logs.
  if (logs++ < 40) post({ type: 'log', message: String(message).slice(0, 2048) });
};
setInterval(() => { logs = 0; }, 1000).unref();

function command(value) {
  const bytes = new TextEncoder().encode(value);
  const pointer = runtime._malloc(bytes.length + 1);
  if (!pointer) throw new Error('WASM allocation failed.');
  try {
    runtime.HEAPU8.set(bytes, pointer);
    runtime.HEAPU8[pointer + bytes.length] = 0;
    runtime._Q3JS_ServerCommand(pointer);
  } finally { runtime._free(pointer); }
}

function inject(endpoint, bytes) {
  const pointer = runtime._malloc(bytes.length);
  if (!pointer) throw new Error('WASM allocation failed.');
  try {
    runtime.HEAPU8.set(bytes, pointer);
    runtime._Q3JS_ServerInjectPacket(endpoint, pointer, bytes.length);
  } finally { runtime._free(pointer); }
}

parentPort.on('message', message => {
  if (!ready || message.type !== 'packet') return;
  const bytes = message.packet;
  if (!(bytes instanceof Uint8Array) || bytes.length < 1 || bytes.length > 16384 || !Number.isInteger(message.endpoint) || message.endpoint < 1 || message.endpoint >= STATUS_ENDPOINT) return;
  try {
    inject(message.endpoint, bytes);
  } finally {
    post({ type: 'ack' });
  }
});

try {
  // The generated ES6 module MUST have an .mjs extension in a Node package.
  const modulePath = await realpath(workerData.runtime);
  const { default: createServer } = await import(pathToFileURL(modulePath).href);
  runtime = await createServer({
    noInitialRun: true,
    locateFile: file => file.endsWith('.wasm') ? workerData.wasm : path.join(path.dirname(modulePath), file),
    print: output, printErr: output,
    onAbort: reason => { throw new Error(`Engine aborted: ${String(reason).slice(0, 512)}`); },
    onServerPacket: (endpoint, packet) => {
      if (!ready || packet.byteLength > 16384) return;
      if (endpoint === STATUS_ENDPOINT) {
        const status = parseStatus(packet);
        if (status) post({ type: 'status', status });
        return;
      }
      post({ type: 'packet', endpoint, packet: Uint8Array.from(packet) });
    },
  });
  runtime.FS.mkdirTree('/baseq3');
  runtime.FS.mkdirTree('/home/baseq3');
  runtime.FS.mkdirTree('/q3js/vm');
  runtime.FS.mkdirTree('/home/q3js');
  for (const asset of workerData.assets) {
    const bytes = await readFile(asset.source);
    if (bytes.length !== asset.size) throw new Error('Asset changed during startup.');
    runtime.FS.writeFile(`/baseq3/${asset.name}`, bytes);
  }
  // Use the reviewed Q3JS module ahead of stock PK3 VMs. In particular it exits
  // bots-only intermissions rather than waiting forever for a human ready vote.
  runtime.FS.writeFile('/q3js/vm/qagame.qvm', await readFile(path.join(path.dirname(modulePath), 'qagame.qvm')));
  runtime.FS.writeFile('/home/q3js/arena.cfg', arenaConfig(workerData.arena));
  runtime.callMain(['+set', 'dedicated', '2', '+set', 'fs_basepath', '/', '+set', 'fs_homepath', '/home', '+set', 'fs_game', 'q3js', '+set', 'net_enabled', '0', '+exec', 'arena.cfg']);
  const timer = setInterval(() => {
    if (runtime._Q3JS_ServerIsRunning() !== 1) {
      if (ready) throw new Error('Engine stopped.');
      return;
    }
    if (!ready) {
      ready = true;
      post({ type: 'ready' });
      // Execute after initialization so status messages can be inspected locally.
      command('status');
    }
  }, 50);
  timer.unref();
  setInterval(() => { if (ready) post({ type: 'pulse' }); }, 1000).unref();
  const statusPacket = Uint8Array.from([255, 255, 255, 255, ...new TextEncoder().encode('getstatus arena-status\n')]);
  setInterval(() => { if (ready) inject(STATUS_ENDPOINT, statusPacket); }, 2000).unref();
} catch (error) {
  post({ type: 'failed', message: error instanceof Error ? error.message : String(error) });
  process.exitCode = 1;
  parentPort.close();
}
