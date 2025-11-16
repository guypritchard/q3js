const dgram = require('dgram');
const WebSocket = require('ws');
const url = require('url');

const MASTER_SERVER_BASE = process.env.MASTER_SERVER_BASE || 'https://master.q3js.com';
const HEARTBEAT_INTERVAL_MS = 30 * 1000;

// env defaults
const DEFAULT_TARGET_HOST = process.env.TARGET_HOST || '127.0.0.1';
const DEFAULT_TARGET_PORT = parseInt(process.env.TARGET_PORT || '27960', 10);
const PROXY_PORT = parseInt(process.env.WS_PORT || '27961', 10);

// toggle: true = use ?host=&port=, false = use env consts
const USE_URL_PARAMS = process.env.USE_URL_PARAMS === 'true';

// send heartbeat only if using env defaults
async function sendHeartbeat() {
    try {
        const res = await fetch(`${MASTER_SERVER_BASE}/api/servers/heartbeat`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                proxyPort: PROXY_PORT,
                targetHost: DEFAULT_TARGET_HOST,
                targetPort: DEFAULT_TARGET_PORT
            }),
        });
        if (!res.ok) {
            console.warn('Heartbeat failed:', res.statusText);
        }
    } catch (e) {
        console.warn('Heartbeat error:', e.message);
    }
}

// only start the heartbeat when URL params are NOT used
if (!USE_URL_PARAMS) {
    setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    sendHeartbeat();
}

const WS_PORT = parseInt(process.env.WS_PORT || '27961', 10);
const wss = new WebSocket.Server({port: WS_PORT});

console.log(`WS<->UDP proxy on ws://0.0.0.0:${WS_PORT}/`);
console.log(`Default target: ${DEFAULT_TARGET_HOST}:${DEFAULT_TARGET_PORT}`);
console.log(`USE_URL_PARAMS = ${USE_URL_PARAMS}`);

wss.on('connection', (ws, req) => {

    // default env target
    let targetHost = DEFAULT_TARGET_HOST;
    let targetPort = DEFAULT_TARGET_PORT;

    // override via URL
    if (USE_URL_PARAMS) {
        const query = url.parse(req.url, true).query;

        if (query.host) targetHost = query.host;
        if (query.port) targetPort = parseInt(query.port, 10);

        console.log(`Client override → ${targetHost}:${targetPort}`);
    }

    const udp = dgram.createSocket('udp4');

    udp.on('message', msg => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(msg);
        }
    });

    udp.on('error', err => {
        console.warn('UDP error:', err.message);
        try {
            udp.close();
        } catch {
        }
    });

    ws.on('message', data => {
        try {
            const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
            udp.send(buf, targetPort, targetHost, sendErr => {
                if (sendErr) console.warn('Send error:', sendErr.message);
            });
        } catch (e) {
            console.warn('Message error:', e.message);
        }
    });

    const close = () => {
        try {
            udp.close();
        } catch {
        }
    };
    ws.on('close', close);
    ws.on('error', close);
});
