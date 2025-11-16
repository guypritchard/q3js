// ws-udp-proxy/index.js
const dgram = require('dgram');
const WebSocket = require('ws');

// --- config ---
const Q3_HOST = process.env.Q3_HOST || '127.0.0.1';
const Q3_PORT = parseInt(process.env.Q3_PORT || '27960', 10);
const WS_PORT = parseInt(process.env.WS_PORT || '27961', 10);
const RCON_PASS = process.env.RCON_PASS || 'qweqwe1*';
const POLL_MS = parseInt(process.env.POLL_MS || '5000', 10);
const RESP_TIMEOUT_MS = parseInt(process.env.RESP_TIMEOUT_MS || '1500', 10);
const CONSEC_REQUIRED = parseInt(process.env.CONSEC_REQUIRED || '2', 10);

// --- ws <-> udp bridge ---
const wss = new WebSocket.Server({ port: WS_PORT });
console.log(`WS<->UDP proxy: ws://0.0.0.0:${WS_PORT} -> ${Q3_HOST}:${Q3_PORT}`);

wss.on('connection', (ws) => {
    const udp = dgram.createSocket('udp4');

    udp.on('message', (msg) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    });

    ws.on('message', (data) => {
        if (Buffer.isBuffer(data)) udp.send(data, Q3_PORT, Q3_HOST);
        else if (typeof data === 'string') udp.send(Buffer.from(data), Q3_PORT, Q3_HOST);
    });

    const close = () => { try { udp.close(); } catch {} };
    ws.on('close', close);
    ws.on('error', close);
});

// --- auto-kick ping=999 poller ---
if (RCON_PASS) {
    const pollSock = dgram.createSocket('udp4');
    const HDR = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);

    function sendQuery(cmd) {
        return new Promise((resolve, reject) => {
            const buf = Buffer.concat([HDR, Buffer.from(cmd)]);
            let done = false;

            // one-shot listener for this request
            const onMsg = (msg) => {
                if (done) return;
                done = true;
                pollSock.removeListener('message', onMsg);
                resolve(msg.toString('utf8'));
            };

            pollSock.on('message', onMsg);
            pollSock.send(buf, 0, buf.length, Q3_PORT, Q3_HOST, (err) => {
                if (err && !done) { done = true; pollSock.removeListener('message', onMsg); reject(err); }
            });

            setTimeout(() => {
                if (done) return;
                done = true;
                pollSock.removeListener('message', onMsg);
                reject(new Error('timeout'));
            }, RESP_TIMEOUT_MS);
        });
    }

    function parsePlayers(resp) {
        const marker = 'statusResponse\n';
        const i = resp.indexOf(marker);
        if (i < 0) return [];
        const lines = resp.slice(i + marker.length).split(/\r?\n/).filter(Boolean);
        const playerLines = lines.slice(1);
        return playerLines.map((ln, idx) => {
            const m = ln.match(/^(-?\d+)\s+(-?\d+)\s+"(.*)"/);
            return m ? { slot: idx, score: +m[1], ping: +m[2], name: m[3] } : { slot: idx, raw: ln };
        });
    }

    async function rcon(cmd) {
        const full = `rcon ${RCON_PASS} ${cmd}`;
        try { await sendQuery(full); } catch {}
    }

    // track consecutive 999 detections per slot
    const streak = new Map(); // slot -> count
    const lastKickAt = new Map(); // slot -> ts

    async function pollOnce() {
        try {
            const resp = await sendQuery('getstatus');
            const players = parsePlayers(resp);
            const now = Date.now();

            // prune old slot state
            for (const k of [...streak.keys()]) if (!players.find(p => p.slot === k)) streak.delete(k);
            for (const k of [...lastKickAt.keys()]) if (now - lastKickAt.get(k) > 5 * 60_000) lastKickAt.delete(k);

            for (const p of players) {
                if (typeof p.ping === 'number' && p.ping === 999) {
                    const c = (streak.get(p.slot) || 0) + 1;
                    streak.set(p.slot, c);
                    if (c >= CONSEC_REQUIRED) {
                        const last = lastKickAt.get(p.slot) || 0;
                        if (now - last > 30_000) {
                            console.log(new Date().toISOString(), `kicknum ${p.slot} "${p.name || ''}" ping=999`);
                            await rcon(`kicknum ${p.slot}`);
                            lastKickAt.set(p.slot, now);
                            streak.set(p.slot, 0);
                        }
                    }
                } else {
                    streak.set(p.slot, 0);
                }
            }
        } catch (_e) {
            // ignore timeouts or empty server
        }
    }

    pollSock.bind(); // single socket for all polls
    pollOnce();
    setInterval(pollOnce, POLL_MS);
} else {
    console.log('Auto-kick disabled. Set RCON_PASS to enable.');
}
