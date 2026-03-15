const dgram = require('dgram');
const http = require('http');
const WebSocket = require('ws');

const MASTER_SERVER_BASE = process.env.MASTER_SERVER_BASE || 'https://master.q3js.com';
const HEARTBEAT_INTERVAL_MS = 5 * 1000;
const INFO_TIMEOUT_MS = parseInt(process.env.INFO_TIMEOUT_MS || '5000', 10);

// env defaults
const DEFAULT_TARGET_HOST = process.env.TARGET_HOST || '127.0.0.1';
const DEFAULT_TARGET_PORT = parseInt(process.env.TARGET_PORT || '27960', 10);
const WS_PORT = parseInt(process.env.WS_PORT || '27961', 10);

async function sendHeartbeat() {
    try {
        const res = await fetch(`${MASTER_SERVER_BASE}/api/servers/heartbeat`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                proxyPort: WS_PORT,
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

setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
sendHeartbeat();

function toInt(value, fallback = 0) {
    const parsed = parseInt(value ?? '', 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function stripQ3Colors(value) {
    return String(value ?? '').replace(/\^\d/g, '');
}

function parseStatusResponse(rawStatus, opts) {
    const lines = rawStatus.replace(/\r/g, '').split('\n');
    const idx = lines.findIndex(line => line.includes('statusResponse'));
    if (idx === -1) return null;

    const rulesLine = (lines[idx + 1] ?? '').trim();
    if (!rulesLine) return null;

    const playerLines = lines.slice(idx + 2).filter(line => line.trim().length > 0);
    const parts = rulesLine.split('\\');
    const kv = {};

    for (let i = 1; i + 1 < parts.length; i += 2) {
        kv[parts[i].toLowerCase()] = parts[i + 1] ?? '';
    }

    const users = [];
    for (const line of playerLines) {
        const m = line.match(/^\s*(-?\d+)\s+(\d+)\s+"(.*)"\s*$/);
        if (!m) continue;
        users.push({
            score: parseInt(m[1], 10),
            ping: parseInt(m[2], 10),
            name: stripQ3Colors(m[3]),
        });
    }

    return {
        id: `${opts.publicHost}:${opts.targetPort}`,
        sv_hostname: stripQ3Colors(kv.sv_hostname ?? kv.hostname ?? 'Unnamed Server'),
        mapname: kv.mapname ?? 'unknown',
        g_gametype: toInt(kv.g_gametype ?? kv.gametype ?? '0'),
        fraglimit: toInt(kv.fraglimit),
        timelimit: toInt(kv.timelimit),
        sv_maxclients: toInt(kv.sv_maxclients),
        g_needpass: toInt(kv.g_needpass),
        capturelimit: toInt(kv.capturelimit),
        version: kv.version ?? kv.com_gamename ?? kv.gamename ?? '',
        players: users.length,
        ping: opts.ping,
        port: opts.targetPort,
        challenge: kv.challenge,
        sv_maxPing: toInt(kv.sv_maxping),
        sv_minPing: toInt(kv.sv_minping),
        com_gamename: kv.com_gamename,
        com_protocol: toInt(kv.com_protocol),
        dmflags: toInt(kv.dmflags),
        sv_privateClients: toInt(kv.sv_privateclients),
        sv_minRate: toInt(kv.sv_minrate),
        sv_maxRate: toInt(kv.sv_maxrate),
        sv_dlRate: toInt(kv.sv_dlrate),
        sv_floodProtect: toInt(kv.sv_floodprotect),
        sv_allowDownload: toInt(kv.sv_allowdownload),
        bot_minplayers: toInt(kv.bot_minplayers),
        gamename: kv.gamename,
        g_maxGameClients: toInt(kv.g_maxgameclients),
        host: opts.publicHost,
        proxyPort: opts.proxyPort,
        users,
    };
}

function queryServerStatus({host, port, timeoutMs}) {
    return new Promise((resolve, reject) => {
        const udp = dgram.createSocket('udp4');
        const start = Date.now();
        const payload = Buffer.concat([
            Buffer.from([0xff, 0xff, 0xff, 0xff]),
            Buffer.from('getstatus xxx\n'),
        ]);

        let settled = false;
        const finish = (err, result) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            try {
                udp.close();
            } catch {
            }
            if (err) reject(err);
            else resolve(result);
        };

        const timeout = setTimeout(() => {
            finish(new Error('timeout'));
        }, timeoutMs);

        udp.once('error', err => {
            finish(err);
        });

        udp.once('message', msg => {
            finish(null, {
                rawStatus: msg.toString('utf8'),
                ping: Math.round(Date.now() - start),
            });
        });

        udp.send(payload, port, host, err => {
            if (err) finish(err);
        });
    });
}

function getRequestHostname(req) {
    const hostHeader = req.headers['x-forwarded-host'] || req.headers.host || '';
    const hostValue = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
    const first = String(hostValue).split(',')[0].trim();
    if (!first) return null;

    try {
        return new URL(`http://${first}`).hostname;
    } catch {
        return first.replace(/:\d+$/, '');
    }
}

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
    if (req.method === 'GET' && requestUrl.pathname === '/info') {
        try {
            const status = await queryServerStatus({
                host: DEFAULT_TARGET_HOST,
                port: DEFAULT_TARGET_PORT,
                timeoutMs: INFO_TIMEOUT_MS,
            });

            const parsed = parseStatusResponse(status.rawStatus, {
                publicHost: getRequestHostname(req) || DEFAULT_TARGET_HOST,
                targetPort: DEFAULT_TARGET_PORT,
                proxyPort: WS_PORT,
                ping: status.ping,
            });

            if (!parsed) {
                sendJson(res, 502, {error: 'Invalid getstatus response from target server'});
                return;
            }

            sendJson(res, 200, parsed);
        } catch (e) {
            sendJson(res, 502, {
                error: 'Failed to query target server',
                message: e.message,
            });
        }
        return;
    }

    if (req.method === 'GET' && requestUrl.pathname === '/healthz') {
        sendJson(res, 200, {ok: true});
        return;
    }

    sendJson(res, 404, {error: 'Not found'});
});

const wss = new WebSocket.Server({server: httpServer});

httpServer.listen(WS_PORT, () => {
    console.log(`WS<->UDP proxy on ws://0.0.0.0:${WS_PORT}/`);
    console.log(`REST endpoint on http://0.0.0.0:${WS_PORT}/info`);
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
