const dgram = require('dgram');
const http = require('http');
const WebSocket = require('ws');
const {env} = require('./env');

const MASTER_SERVER_BASE = env.MASTER_SERVER_BASE;
const HEARTBEAT_INTERVAL_MS = env.HEARTBEAT_INTERVAL_MS;
const DEFAULT_TARGET_HOST = env.TARGET_HOST;
const DEFAULT_TARGET_PORT = env.TARGET_PORT;
const WS_PORT = env.WS_PORT;
const SECURE = env.SECURE;

let host = env.HOST;

if (!host) {
    fetch("https://api.ipify.org").then(res => res.text()).then(ipRes => {
        host = ipRes;
    });
}


async function sendHeartbeat() {
    if (!host) {
        console.warn('Obtaining IP address...');
        return;
    }

    try {
        const res = await fetch(`${MASTER_SERVER_BASE}/api/servers/heartbeat`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                targetHost: host,
                proxyPort: WS_PORT,
                targetPort: DEFAULT_TARGET_PORT,
                secure: SECURE,
            }),
        });
        if (!res.ok) {
            console.warn('Heartbeat failed:', res.statusText);
        }
    } catch (e) {
        console.warn('Heartbeat error:', e.message);
    }
}

setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
sendHeartbeat();

function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, statusCode, payload) {
    setCorsHeaders(res);
    res.writeHead(statusCode, {'Content-Type': 'application/json; charset=utf-8'});
    res.end(JSON.stringify(payload));
}

const httpServer = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        res.writeHead(204);
        res.end();
        return;
    }

    const requestUrl = new URL(req.url || '/', 'http://127.0.0.1');
    if (req.method === 'GET' && requestUrl.pathname === '/healthz') {
        sendJson(res, 200, {ok: true});
        return;
    }

    sendJson(res, 404, {error: 'Not found'});
});

const wss = new WebSocket.Server({server: httpServer});

httpServer.listen(WS_PORT, () => {
    console.log(`WS<->UDP proxy on ws://0.0.0.0:${WS_PORT}/`);
    console.log(`Default target: ${DEFAULT_TARGET_HOST}:${DEFAULT_TARGET_PORT}`);
});

wss.on('connection', ws => {

    const targetHost = DEFAULT_TARGET_HOST;
    const targetPort = DEFAULT_TARGET_PORT;

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
