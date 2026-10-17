import { parentPort, workerData } from 'node:worker_threads';

if (workerData.arena.id !== 'timeout') {
  parentPort.postMessage({ type: 'ready' });
  parentPort.postMessage({ type: 'status', status: { map: 'q3dm6', users: [], players: 0, info: { mapname: 'q3dm6', sv_maxclients: 12 } } });
  setInterval(() => parentPort.postMessage({ type: 'pulse' }), 1000).unref();
}
parentPort.on('message', message => {
  if (message.packet[0] === 255) process.exit(1);
  parentPort.postMessage({ type: 'packet', endpoint: message.endpoint, packet: message.packet });
  parentPort.postMessage({ type: 'ack' });
});
