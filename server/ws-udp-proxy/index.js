const dgram = require('dgram');
const WebSocket = require('ws');

const WS_PORT = parseInt(process.env.WS_PORT || '27961', 10);

const wss = new WebSocket.Server({port: WS_PORT});
console.log(`WS<->UDP proxy: ws://0.0.0.0:${WS_PORT}/`);

wss.on('connection', (ws, req) => {
    const udp = dgram.createSocket('udp4');
    const url = new URL(req.url, `https://${req.headers.host}`);
    const host = url.searchParams.get('host');
    const portString = url.searchParams.get('port');
    const port = parseInt(portString, 10);

    udp.on('message', (msg) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    });

    ws.on('message', (data) => {
        if (Buffer.isBuffer(data)) udp.send(data, port, host);
        else if (typeof data === 'string') udp.send(Buffer.from(data), port, host);
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
