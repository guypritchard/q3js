import { createServer } from 'node:http';
import { Worker } from 'node:worker_threads';
import { WebSocketServer, WebSocket } from 'ws';
import { validateConfig } from './config.mjs';
import { authorizeAdmin } from './admin-auth.mjs';

const MAX_PACKET = 16384;
const MAX_BUFFERED = 1024 * 1024;

export class ArenaRunner {
  constructor({ config, runtime, wasm, assets = [], startupTimeoutMs = 120000, workerUrl = new URL('./runtime-worker.mjs', import.meta.url), onLog = () => {}, masterUrl, fetcher = fetch, isBanned = () => false, clientIp = request => request.socket.remoteAddress ?? '' }) {
    this.config = validateConfig(config);
    if (masterUrl && !['http:', 'https:'].includes(new URL(masterUrl).protocol)) throw new Error('Invalid master URL.');
    this.options = { runtime, wasm, assets, startupTimeoutMs, workerUrl, onLog, masterUrl, fetcher, isBanned, clientIp };
    this.arenas = new Map();
    this.stopping = false;
    this.operations = new Map();
    this.pendingManagement = 0;
    this.http = createServer((request, response) => {
      if (request.method === 'POST') { void this.manage(request, response); return; }
      if (request.method !== 'GET' || !['/healthz', '/arenas'].includes(request.url)) {
        response.writeHead(404).end(); return;
      }
      const arenas = this.status();
      const healthy = arenas.length > 0 && arenas.every(arena => ['ready', 'stopped'].includes(arena.state));
      response.writeHead(request.url === '/healthz' && !healthy ? 503 : 200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      response.end(JSON.stringify({ arenas }));
    });
    this.wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PACKET, perMessageDeflate: false });
    this.http.on('upgrade', (request, socket, head) => {
      const match = /^\/arenas\/([a-z0-9][a-z0-9_-]{0,31})\/ws$/.exec(request.url ?? '');
      const arena = match ? this.arenas.get(match[1]) : undefined;
      if (this.stopping || !arena || arena.state !== 'ready' || arena.clients.size >= arena.config.maxClients || arena.nextEndpoint >= 0xffffff) {
        socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n'); return;
      }
      let address;
      try { address = this.options.clientIp(request); }
      catch { socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n'); return; }
      if (this.options.isBanned(address)) { socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return; }
      this.wss.handleUpgrade(request, socket, head, ws => { ws.clientIp = address; this.connect(arena, ws); });
    });
    this.http.requestTimeout = 10000;
    this.http.headersTimeout = 10000;
    this.http.maxConnections = 256;
  }

  status() {
    return [...this.arenas.values()].map(arena => ({ id: arena.config.id, name: arena.config.name,
      state: arena.state, connections: arena.clients.size, gatewayPath: `/arenas/${arena.config.id}/ws`,
      maps: arena.config.maps, maxClients: arena.config.maxClients,
      status: arena.state === 'ready' && Date.now() - (arena.statusAt ?? 0) < 15000 ? arena.status : undefined }));
  }

  disconnectBannedClients() {
    for (const arena of this.arenas.values()) {
      for (const client of arena.clients.values()) {
        if (this.options.isBanned(client.clientIp)) client.terminate();
      }
    }
  }

  async manage(request, response) {
    const reply = (status, value) => { response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(value)); };
    const match = /^\/arenas\/([a-z0-9][a-z0-9_-]{0,31})\/(start|stop|restart)$/.exec(request.url ?? '');
    if (!match || !this.arenas.has(match[1])) { reply(404, { error: 'Unknown arena action.' }); return; }
    if (request.headers['transfer-encoding'] || Number(request.headers['content-length'] ?? 0) !== 0) { request.resume(); reply(413, { error: 'Action does not accept a body.' }); return; }
    if (this.stopping || this.pendingManagement >= 8) { reply(503, { error: 'Runner busy.' }); return; }
    this.pendingManagement++;
    try {
      const auth = await authorizeAdmin(request.headers.authorization, this.options.masterUrl, this.options.fetcher);
      if (auth !== 200) { reply(auth, { error: auth === 503 ? 'Administrator verification unavailable.' : 'Administrator authentication required.' }); return; }
      await this.action(match[1], match[2]);
      reply(200, { arenas: this.status() });
    } catch { reply(503, { error: 'Arena action failed.' }); }
    finally { this.pendingManagement--; }
  }

  action(id, action) {
    const config = this.config.arenas.find(arena => arena.id === id);
    if (!config || !['start', 'stop', 'restart'].includes(action)) return Promise.reject(new Error('Unknown arena action.'));
    const previous = this.operations.get(id) ?? Promise.resolve();
    const operation = previous.catch(() => {}).then(async () => {
      if (this.stopping) throw new Error('Runner is shutting down.');
      let arena = this.arenas.get(id);
      if (action === 'stop' || action === 'restart') {
        if (arena) await this.stopArena(arena);
      }
      if (action === 'start' || action === 'restart') {
        arena = this.arenas.get(id);
        if (!arena || ['stopped', 'failed'].includes(arena.state)) {
          if (arena) await this.stopArena(arena);
          this.spawn(config);
        }
      }
    });
    this.operations.set(id, operation);
    return operation;
  }

  async stopArena(arena) {
    clearTimeout(arena.timer);
    clearInterval(arena.watchdog);
    arena.state = 'stopped';
    arena.status = undefined;
    for (const ws of arena.clients.values()) ws.terminate();
    arena.clients.clear();
    await arena.worker?.terminate();
  }

  async start({ host = '127.0.0.1', port = 0 } = {}) {
    if (this.stopping || this.arenas.size) throw new Error('Runner already started or closed.');
    try {
      for (const config of this.config.arenas) {
        if (config.autostart) this.spawn(config);
        else this.arenas.set(config.id, { config, state: 'stopped', clients: new Map() });
      }
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
      if (message.type === 'status') { arena.status = message.status; arena.statusAt = Date.now(); }
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
    await Promise.allSettled([...this.operations.values()]);
    for (const arena of this.arenas.values()) {
      await this.stopArena(arena);
    }
    await new Promise(resolve => this.wss.close(() => resolve()));
    if (this.http.listening) await new Promise(resolve => this.http.close(() => resolve()));
  }
}
