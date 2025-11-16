const dgram = require('dgram');
const WebSocket = require('ws');

const WS_PORT = parseInt(process.env.WS_PORT || '27961', 10);
const wss = new WebSocket.Server({ port: WS_PORT });

console.log(`WS<->UDP proxy: ws://0.0.0.0:${WS_PORT}/`);

wss.on('connection', (ws, req) => {
    let host, port;
    try {
        const url = new URL(req.url, 'ws://dummy');
        host = url.searchParams.get('host');
        port = parseInt(url.searchParams.get('port'), 10);
    } catch {
        ws.close(1008, 'bad url');
        return;
    }

    if (!host || isNaN(port)) {
        ws.close(1008, 'missing host/port');
        return;
    }

    const udp = dgram.createSocket('udp4');

    udp.on('message', msg => {
        if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    });

    udp.on('error', err => {
        console.warn('UDP error:', err.message);
        try { udp.close(); } catch {}
    });

    ws.on('message', data => {
        try {
            const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
            udp.send(buf, port, host, sendErr => {
                if (sendErr) console.warn('Send error:', sendErr.message);
            });
        } catch (e) {
            console.warn('Message error:', e.message);
        }
    });

    const close = () => {
        try { udp.close(); } catch {}
    };

    ws.on('close', close);
    ws.on('error', close);
});
