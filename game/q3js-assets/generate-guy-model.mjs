import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, 'baseq3', 'models', 'players', 'guy');
await mkdir(out, { recursive: true });

const boxes = {
  lower: { min: [-10,-8,-12], max: [10,8,4], tags: [['tag_torso',[0,0,5]]] },
  upper: { min: [-14,-7,-4], max: [14,7,14], tags: [['tag_head',[0,0,15]],['tag_weapon',[9,-5,7]]] },
  head:  { min: [-8,-7,-5], max: [8,7,9], tags: [] }
};
const triangles = [0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,2,3,7,2,7,6,1,2,6,1,6,5,3,0,4,3,4,7];

function md3(part, spec) {
  const vertices = [];
  for (const z of [spec.min[2], spec.max[2]]) for (const y of [spec.min[1], spec.max[1]]) for (const x of [spec.min[0], spec.max[0]]) vertices.push([x,y,z]);
  const frames = 56, tags = spec.tags.length * 112, surf = 108 + 68 + triangles.length * 4 + vertices.length * 8 + vertices.length * 8;
  const b = Buffer.alloc(108 + frames + tags + surf); let p = 0;
  const i32 = v => { b.writeInt32LE(v,p); p+=4; }; const f32 = v => { b.writeFloatLE(v,p); p+=4; };
  const str = (s,n) => { b.write(s,p,n,'ascii'); p+=n; };
  str('IDP3',4); i32(15); str(part,64); i32(0); i32(1); i32(spec.tags.length); i32(1); i32(0); i32(108); i32(164); i32(164+tags); i32(164+tags+surf);
  for (const v of [...spec.min,...spec.max,[0,0,0],24]) Array.isArray(v) ? v.forEach(f32) : f32(v); str(part,16);
  for (const [name,origin] of spec.tags) { str(name,64); origin.forEach(f32); [1,0,0,0,1,0,0,0,1].forEach(f32); }
  const s0=p; str('IDP3',4); str(`${part}_body`,64); i32(0); i32(1); i32(1); i32(vertices.length); i32(12); i32(108+68); i32(108); i32(108+68+triangles.length*4); i32(108+68+triangles.length*4+vertices.length*8); i32(surf);
  str('models/players/guy/guy',64); i32(0); triangles.forEach(i32);
  vertices.forEach((_,i)=>{ f32((i&1)?1:0); f32((i&2)?1:0); });
  vertices.forEach(v=>{ v.forEach(n=>{ b.writeInt16LE(Math.round(n*64),p); p+=2; }); b.writeUInt16LE(0,p); p+=2; });
  if (p !== s0+surf) throw new Error(`MD3 layout error: ${part}`); return b;
}
for (const [part,spec] of Object.entries(boxes)) await writeFile(join(out, `${part}.md3`), md3(part,spec));

const tga = Buffer.alloc(18+32*32*3); tga[2]=2; tga.writeUInt16LE(32,12); tga.writeUInt16LE(32,14); tga[16]=24; tga[17]=0x20;
for(let y=0;y<32;y++) for(let x=0;x<32;x++){ const p=18+(y*32+x)*3, glow=((x>>2)^(y>>2))&1; tga[p]=35; tga[p+1]=glow?220:90; tga[p+2]=glow?255:45; }
await writeFile(join(out,'guy.tga'),tga);
await writeFile(join(out,'icon_default.tga'),tga);
const skin = ['lower_body,models/players/guy/guy','upper_body,models/players/guy/guy','head_body,models/players/guy/guy',''].join('\n');
for (const part of ['lower','upper','head']) for (const team of ['default','red','blue']) await writeFile(join(out,`${part}_${team}.skin`),skin);
const animations = Array.from({length:25},()=> '0 1 0 1').join('\n');
await writeFile(join(out,'animation.cfg'),`// Static hovering android: all canonical slots intentionally use frame zero.\nfootsteps none\nheadoffset 0 0 0\nsex m\n${animations}\n`);
