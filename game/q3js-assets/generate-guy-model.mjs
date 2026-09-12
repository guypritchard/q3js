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
const faceTriangles = [0,2,1,1,2,3];

function encodeNormal([x, y, z]) {
  const latitude = Math.atan2(y, x);
  const longitude = Math.acos(Math.max(-1, Math.min(1, z)));
  const lat = Math.round(latitude * 255 / (Math.PI * 2)) & 255;
  const lng = Math.round(longitude * 255 / (Math.PI * 2)) & 255;
  return (lat << 8) | lng;
}

function geometry(spec) {
  const [x0,y0,z0] = spec.min, [x1,y1,z1] = spec.max;
  const faces = [
    { normal: [0,0,-1], vertices: [[x0,y0,z0],[x1,y0,z0],[x0,y1,z0],[x1,y1,z0]] },
    { normal: [0,0,1],  vertices: [[x0,y0,z1],[x0,y1,z1],[x1,y0,z1],[x1,y1,z1]] },
    { normal: [0,-1,0], vertices: [[x0,y0,z0],[x0,y0,z1],[x1,y0,z0],[x1,y0,z1]] },
    { normal: [0,1,0],  vertices: [[x0,y1,z0],[x1,y1,z0],[x0,y1,z1],[x1,y1,z1]] },
    { normal: [-1,0,0], vertices: [[x0,y0,z0],[x0,y1,z0],[x0,y0,z1],[x0,y1,z1]] },
    { normal: [1,0,0],  vertices: [[x1,y0,z0],[x1,y0,z1],[x1,y1,z0],[x1,y1,z1]] },
  ];
  const inset = 4 / 128;
  const vertices = [], normals = [], uvs = [], triangles = [];
  faces.forEach((face, faceIndex) => {
    const column = faceIndex % 3, row = Math.floor(faceIndex / 3);
    const left = column / 3 + inset, right = (column + 1) / 3 - inset;
    // TGA rows are top-origin; WebGL UVs address the normalized bottom-origin upload.
    const top = 1 - (row / 2 + inset), bottom = 1 - ((row + 1) / 2 - inset);
    const base = vertices.length;
    vertices.push(...face.vertices); normals.push(...Array(4).fill(face.normal));
    uvs.push([left,top],[right,top],[left,bottom],[right,bottom]);
    triangles.push(...faceTriangles.map(index => base + index));
  });
  return { vertices, normals, uvs, triangles };
}

function md3(part, spec) {
  const { vertices, normals, uvs, triangles } = geometry(spec);
  const frames = 56, tags = spec.tags.length * 112, surf = 108 + 68 + triangles.length * 4 + vertices.length * 8 + vertices.length * 8;
  const b = Buffer.alloc(108 + frames + tags + surf); let p = 0;
  const i32 = v => { b.writeInt32LE(v,p); p+=4; }; const f32 = v => { b.writeFloatLE(v,p); p+=4; };
  const str = (s,n) => { b.write(s,p,n,'ascii'); p+=n; };
  str('IDP3',4); i32(15); str(part,64); i32(0); i32(1); i32(spec.tags.length); i32(1); i32(0); i32(108); i32(164); i32(164+tags); i32(164+tags+surf);
  for (const v of [...spec.min,...spec.max,[0,0,0],24]) Array.isArray(v) ? v.forEach(f32) : f32(v); str(part,16);
  for (const [name,origin] of spec.tags) { str(name,64); origin.forEach(f32); [1,0,0,0,1,0,0,0,1].forEach(f32); }
  const s0=p; str('IDP3',4); str(`${part}_body`,64); i32(0); i32(1); i32(1); i32(vertices.length); i32(12); i32(108+68); i32(108); i32(108+68+triangles.length*4); i32(108+68+triangles.length*4+vertices.length*8); i32(surf);
  str('models/players/guy/guy',64); i32(0); triangles.forEach(i32);
  uvs.forEach(uv => uv.forEach(f32));
  vertices.forEach((v,index)=>{ v.forEach(n=>{ b.writeInt16LE(Math.round(n*64),p); p+=2; }); b.writeUInt16LE(encodeNormal(normals[index]),p); p+=2; });
  if (p !== s0+surf) throw new Error(`MD3 layout error: ${part}`); return b;
}
for (const [part,spec] of Object.entries(boxes)) await writeFile(join(out, `${part}.md3`), md3(part,spec));

const textureSize = 128;
const tga = Buffer.alloc(18+textureSize*textureSize*3); tga[2]=2; tga.writeUInt16LE(textureSize,12); tga.writeUInt16LE(textureSize,14); tga[16]=24; tga[17]=0x20;
const faceColors = [[20,45,34],[25,36,32],[22,31,29],[30,54,38],[25,29,29],[34,47,35]];
for(let y=0;y<textureSize;y++) for(let x=0;x<textureSize;x++) {
  const column = Math.min(2, Math.floor(x*3/textureSize)), row = Math.min(1, Math.floor(y*2/textureSize));
  const face = row*3+column, x0=Math.floor(column*textureSize/3), x1=Math.floor((column+1)*textureSize/3)-1;
  const y0=row*64, y1=y0+63, edge=Math.min(x-x0,x1-x,y-y0,y1-y);
  let [r,g,b] = faceColors[face];
  const rivet = ((x-x0-8)%20===0 && (y-y0-8)%24===0);
  if (edge>=4 && edge<=7) [r,g,b] = face===3 ? [214,170,42] : [126,205,55];
  else if (face===3 && y-y0>19 && y-y0<36 && x-x0>8 && x1-x>8) [r,g,b] = [72,205,178];
  else if (face===1 && Math.abs((x-x0)-(y-y0)*0.45-6)<2) [r,g,b] = [194,151,38];
  else if (rivet) [r,g,b] = [170,213,76];
  else if (((x+y)&7)===0) { r+=4; g+=5; b+=4; }
  const p=18+(y*textureSize+x)*3; tga[p]=b; tga[p+1]=g; tga[p+2]=r;
}
await writeFile(join(out,'guy.tga'),tga);
await writeFile(join(out,'icon_default.tga'),tga);
const skin = ['lower_body,models/players/guy/guy','upper_body,models/players/guy/guy','head_body,models/players/guy/guy',''].join('\n');
for (const part of ['lower','upper','head']) for (const team of ['default','red','blue']) await writeFile(join(out,`${part}_${team}.skin`),skin);
const animations = Array.from({length:25},()=> '0 1 0 1').join('\n');
await writeFile(join(out,'animation.cfg'),`// Static hovering android: all canonical slots intentionally use frame zero.\nfootsteps none\nheadoffset 0 0 0\nsex m\n${animations}\n`);
