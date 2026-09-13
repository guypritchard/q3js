import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const server = resolve(here, '..');
const game = resolve(server, '..');
const assets = join(game, 'q3js-assets', 'baseq3');
const qvm = resolve(process.env.QAGAME_QVM || join(game, 'maps', 'build', 'vm', 'qagame.qvm'));
const destination = resolve(process.env.Q3JS_GUY_OUTPUT_DIR || join(server, 'dist', 'game', 'baseq3'));

async function filesUnder(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await filesUnder(path));
    else result.push(path);
  }
  return result;
}

const entries = [];
for (const path of await filesUnder(assets)) {
  entries.push({ name: relative(assets, path).replaceAll('\\', '/'), data: await readFile(path) });
}
entries.push({ name: 'vm/qagame.qvm', data: await readFile(qvm) });
entries.sort((a, b) => Buffer.compare(Buffer.from(a.name, 'utf8'), Buffer.from(b.name, 'utf8')));

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit=0; bit<8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function u16(value) { const b=Buffer.alloc(2); b.writeUInt16LE(value); return b; }
function u32(value) { const b=Buffer.alloc(4); b.writeUInt32LE(value); return b; }
const local=[], central=[]; let offset=0;
for (const entry of entries) {
  const name=Buffer.from(entry.name); const packed=deflateRawSync(entry.data,{level:9}); const crc=crc32(entry.data);
  const common=Buffer.concat([u16(20),u16(0),u16(8),u16(0),u16(33),u32(crc),u32(packed.length),u32(entry.data.length),u16(name.length),u16(0)]);
  const record=Buffer.concat([u32(0x04034b50),common,name,packed]); local.push(record);
  central.push(Buffer.concat([u32(0x02014b50),u16(20),common,u16(0),u16(0),u16(0),u32(0),u32(offset),name]));
  offset += record.length;
}
const body=Buffer.concat(local), directory=Buffer.concat(central);
const end=Buffer.concat([u32(0x06054b50),u16(0),u16(0),u16(entries.length),u16(entries.length),u32(directory.length),u32(body.length),u16(0)]);
const archive=Buffer.concat([body,directory,end]);
const hash=createHash('sha256').update(archive).digest('hex');
await mkdir(destination,{recursive:true});
for (const file of await readdir(destination)) if (/^zzz-q3js-guy-[0-9a-f]{64}\.pk3$/.test(file)) await rm(join(destination,file));
const output=join(destination,`zzz-q3js-guy-${hash}.pk3`);
await writeFile(output,archive);
await writeFile(join(destination,'q3js-guy-manifest.json'),`${JSON.stringify({sha256:hash,file:relative(server,output).replaceAll('\\','/'),entries:entries.map(e=>e.name)},null,2)}\n`);
console.log(output);
