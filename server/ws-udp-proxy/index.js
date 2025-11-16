const dgram = require('dgram');
const WebSocket = require('ws');

const Q3_HOST = process.env.Q3_HOST || '127.0.0.1';
const Q3_PORT = parseInt(process.env.Q3_PORT || '27960', 10);

const WS_PORT = parseInt(process.env.WS_PORT || '27961', 10);

const wss = new WebSocket.Server({port: WS_PORT});
console.log(`WS<->UDP proxy: ws://0.0.0.0:${WS_PORT} -> ${Q3_HOST}:${Q3_PORT}`);

wss.on('connection', (ws) => {
    const udp = dgram.createSocket('udp4');

    udp.on('message', (msg) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(msg); // binary frame
    });

    ws.on('message', (data) => {
        if (Buffer.isBuffer(data)) udp.send(data, Q3_PORT, Q3_HOST);
        else if (typeof data === 'string') udp.send(Buffer.from(data), Q3_PORT, Q3_HOST);
    });

    ws.on('close', () => udp.close());
    ws.on('error', () => udp.close());
});