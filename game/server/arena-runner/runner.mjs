import { createServer } from 'node:http';
import { Worker } from 'node:worker_threads';
import { WebSocketServer, WebSocket } from 'ws';
import { validateConfig } from './config.mjs';

const MAX_PACKET = 16384;
const MAX_BUFFERED = 1024 * 1024;

export class ArenaRunner {
  constructor({ config, runtime, wasm, assets = [], startupTimeoutMs = 120000, workerUrl = new URL('./runtime-worker.mjs', import.meta.url), onLog = () => {} }) {
    this.config = validateConfig(config);
    this.options = { runtime, wasm, assets, startupTimeoutMs, workerUrl, onLog };
    this.arenas = new Map();
    this.stopping = false;
    this.http = createServer((request, response) => {
      if (request.method !== 'GET' || !['/healthz', '/arenas'].includes(request.url)) {
        response.writeHead(404).end(); return;
      }
      const arenas = this.status();
      const healthy = arenas.length > 0 && arenas.every(arena => arena.state === 'ready');
      response.writeHead(request.url === '/healthz' && !healthy ? 503 : 200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      response.end(JSON.stringify({ arenas }));
    });
    this.wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PACKET, perMessageDeflate: false });
    this.http.on('upgrade', (request, socket, head) => {
      const match = /^\/arenas\/([a-z0-9][a-z0-9_-]{0,31})\/ws$/.exec(request.url ?? '');
      const arena = match ? this.arenas.get(match[1]) : undefined;
      if (this.stopping || !arena || arena.state !== 'ready' || arena.clients.size >= arena.config.maxClients || arena.nextEndpoint > 0xffffff) {
        socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n'); return;
      }
      this.wss.handleUpgrade(request, socket, head, ws => this.connect(arena, ws));
    });
    this.http.requestTimeout = 10000;
    this.http.headersTimeout = 10000;
    this.http.maxConnections = 256;
  }

  status() {
    return [...this.arenas.values()].map(arena => ({ id: arena.config.id, name: arena.config.name,
      state: arena.state, connections: arena.clients.size, gatewayPath: `/arenas/${arena.config.id}/ws` }));
  }

  async start({ host = '127.0.0.1', port = 0 } = {}) {
    if (this.stopping || this.arenas.size) throw new Error('Runner already started or closed.');
    try {
      for (const config of this.config.arenas) this.spawn(config);
      await new Promise((resolve, reject) => {
        this.http.once('error', reject);
        this.http.listen(port, host, () => { this.http.off('error', reject); resolve(); });
      });
    } catch (error) { await this.close(); throw error; }
    return this.http.address();
  }

  spawn(config) {
    const arena = { config, state: 'starting', clients: new Map(), nextEndpoint: 1, pending: 0, lastPulse: Date.now() };
    this.arenas.set(config.id, arena);
    const worker = new Worker(this.options.workerUrl, { workerData: {
      arena: config, runtime: this.options.runtime, wasm: this.options.wasm, assets: this.options.assets,
    } });
    arena.worker = worker;
    const fail = () => {
      if (arena.state === 'failed' || arena.state === 'stopped') return;
      clearTimeout(arena.timer);
      clearInterval(arena.watchdog);
      arena.state = 'failed';
      for (const client of arena.clients.values()) client.terminate();
      arena.clients.clear();
      void worker.terminate();
    };
    arena.timer = setTimeout(fail, this.options.startupTimeoutMs);
    arena.watchdog = setInterval(() => {
      if (arena.state === 'ready' && Date.now() - arena.lastPulse > 10000) fail();
    }, 1000);
    arena.watchdog.unref();
    worker.on('error', fail);
    worker.on('exit', () => { if (!this.stopping) fail(); });
    worker.on('message', message => {
      if (this.stopping || ['failed', 'stopped'].includes(arena.state)) return;
      if (message.type === 'ready') { clearTimeout(arena.timer); arena.lastPulse = Date.now(); arena.state = 'ready'; }
      if (message.type === 'pulse') arena.lastPulse = Date.now();
      if (message.type === 'log') this.options.onLog(config.id, String(message.message).slice(0, 2048));
      if (message.type === 'failed') fail();
      if (message.type === 'ack') arena.pending = Math.max(0, arena.pending - 1);
      if (message.type === 'packet') {
        const client = arena.clients.get(message.endpoint);
        if (client?.readyState === WebSocket.OPEN && message.packet instanceof Uint8Array && message.packet.length <= MAX_PACKET) {
          if (client.bufferedAmount > MAX_BUFFERED) client.terminate();
          else client.send(message.packet, { binary: true });
        }
      }
    });
  }

  connect(arena, ws) {
    const endpoint = arena.nextEndpoint++;
    arena.clients.set(endpoint, ws);
    let windowStart = Date.now();
    let packets = 0;
    let alive = true;
    const heartbeat = setInterval(() => {
      if (!alive) { ws.terminate(); return; }
      alive = false; ws.ping();
    }, 30000);
    heartbeat.unref();
    ws.on('pong', () => { alive = true; });
    ws.on('error', () => {});
    ws.on('close', () => { clearInterval(heartbeat); arena.clients.delete(endpoint); });
    ws.on('message', (bytes, binary) => {
      if (!binary || bytes.length < 1 || bytes.length > MAX_PACKET) { ws.close(1003, 'Binary game packets required'); return; }
      if (Date.now() - windowStart >= 1000) { windowStart = Date.now(); packets = 0; }
      if (++packets > 250 || arena.pending >= 256 || arena.state !== 'ready') { ws.close(1008, 'Packet limit exceeded'); return; }
      arena.pending++;
      arena.worker.postMessage({ type: 'packet', endpoint, packet: Uint8Array.from(bytes) });
    });
  }

  close() {
    this.closePromise ??= this.shutdown();
    return this.closePromise;
  }

  async shutdown() {
    this.stopping = true;
    for (const arena of this.arenas.values()) {
      clearTimeout(arena.timer);
      clearInterval(arena.watchdog);
      arena.state = 'stopped';
      for (const ws of arena.clients.values()) ws.terminate();
      arena.clients.clear();
    }
    await Promise.all([...this.arenas.values()].map(arena => arena.worker?.terminate()));
    await new Promise(resolve => this.wss.close(() => resolve()));
    if (this.http.listening) await new Promise(resolve => this.http.close(() => resolve()));
  }
}
