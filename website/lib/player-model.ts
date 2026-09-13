import { normalizePlayerQpath } from "./player-preview.ts";

export type Md3Tag = { origin: Float32Array; axis: Float32Array };
export type Md3Surface = { name: string; positions: Float32Array[]; normals: Float32Array[]; uvs: Float32Array; indices: Uint16Array };
export type Md3Model = { frameCount: number; surfaces: Md3Surface[]; tags: Map<string, Md3Tag[]> };
export type TgaImage = { width: number; height: number; pixels: Uint8Array };
export type PlayerAppearance = { model: string; skin: string; headModel: string; headSkin: string };
export type PlayerPaths = { bodyRoots: string[]; headRoots: string[]; headFileNames: string[]; bodySkin: string; headSkin: string; separateHead: string };

const MAX_MD3_FRAMES = 1_024;
const MAX_MD3_TAGS = 16;
const MAX_MD3_SURFACES = 32;
const MAX_MD3_VERTICES = 4_096;
const MAX_MD3_TRIANGLES = 8_192;
const MAX_MD3_EXPANDED_BYTES = 64 * 1024 * 1024;
export const MAX_SKIN_TEXT_LENGTH = 256 * 1024;
export const MAX_SKIN_LINE_LENGTH = 4 * 1024;
export const MAX_SKIN_MAPPINGS = 4 * 1024;

function checkedName(value: string, fallback = ""): string {
  const result = value.trim().toLowerCase() || fallback;
  if (!/^[a-z0-9_.+-]+$/.test(result)) throw new Error("Model and skin names may only contain letters, numbers, '.', '_', '+' and '-'");
  return result;
}

export function playerResourcePaths(appearance: PlayerAppearance): PlayerPaths {
  const model = checkedName(appearance.model);
  const bodySkin = checkedName(appearance.skin, "default");
  const explicitHead = appearance.headModel.trim();
  const rawHead = explicitHead.startsWith("*") ? explicitHead.slice(1) : explicitHead;
  const head = checkedName(rawHead, model);
  const headSkin = explicitHead ? checkedName(appearance.headSkin, "default") : bodySkin;
  return {
    bodyRoots: [`models/players/${model}`, `models/players/characters/${model}`],
    headRoots: explicitHead.startsWith("*") ? [`models/players/heads/${head}`] : [`models/players/${head}`, `models/players/heads/${head}`],
    headFileNames: explicitHead.startsWith("*") ? [`${head}.md3`] : ["head.md3", `${head}.md3`],
    bodySkin,
    headSkin,
    separateHead: explicitHead.startsWith("*") ? head : "",
  };
}

export function parseSkin(text: string): Map<string, string | null> {
  if (text.length > MAX_SKIN_TEXT_LENGTH) throw new Error("Skin text exceeds limit");
  const mappings = new Map<string, string | null>();
  let mappingCount = 0;
  for (const rawLine of text.split("\n")) {
    if (rawLine.length > MAX_SKIN_LINE_LENGTH) throw new Error("Skin line exceeds limit");
    const sourceLine = rawLine.replaceAll("\r", "");
    const line = sourceLine.replace(/\/\/.*$/, "").trim();
    if (!line) continue;
    const comma = line.indexOf(",");
    if (comma < 1) throw new Error("Malformed skin mapping");
    const surface = line.slice(0, comma).trim().toLowerCase();
    const shader = line.slice(comma + 1).trim().replaceAll("\\", "/").toLowerCase();
    if (!/^[a-z0-9_.+-]+$/.test(surface) || (!shader.endsWith("*off") && !/^models\/players\/[a-z0-9_.@+/-]+$/.test(shader))) throw new Error("Unsafe skin mapping");
    mappingCount += 1;
    if (mappingCount > MAX_SKIN_MAPPINGS) throw new Error("Skin mapping count exceeds limit");
    mappings.set(surface, shader.endsWith("*off") ? null : normalizePlayerQpath(shader));
  }
  return mappings;
}

export function parseIdleFrames(text: string): { lower: number; upper: number } {
  const rows = text.replace(/\/\/.*$/gm, "").split("\n").map((line) => line.trim()).filter((line) => /^-?\d+\s+-?\d+\s+\d+\s+[\d.]+/.test(line)).map((line) => line.split(/\s+/).map(Number));
  if (rows.length < 23) return { lower: 0, upper: 0 };
  const legOffset = rows[13][0] - rows[6][0];
  return { lower: Math.max(0, rows[22][0] - legOffset), upper: Math.max(0, rows[11][0]) };
}

function requireRange(view: DataView, offset: number, length: number, label: string): void {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || offset + length > view.byteLength) throw new Error(`Invalid ${label}`);
}
function stringAt(view: DataView, offset: number, length: number): string {
  requireRange(view, offset, length, "MD3 string"); let result = "";
  for (let index = 0; index < length; index += 1) { const value = view.getUint8(offset + index); if (!value) break; result += String.fromCharCode(value); }
  return result;
}
function normalAt(packed: number): readonly number[] {
  const latitude = ((packed >> 8) & 255) * Math.PI * 2 / 255, longitude = (packed & 255) * Math.PI * 2 / 255;
  return [Math.cos(latitude) * Math.sin(longitude), Math.sin(latitude) * Math.sin(longitude), Math.cos(longitude)];
}

export function parseMd3(buffer: ArrayBuffer): Md3Model {
  const view = new DataView(buffer); requireRange(view, 0, 108, "MD3 header");
  if (stringAt(view, 0, 4) !== "IDP3" || view.getInt32(4, true) !== 15) throw new Error("Unsupported MD3 model");
  const frameCount = view.getInt32(76, true), tagCount = view.getInt32(80, true), surfaceCount = view.getInt32(84, true);
  const tagOffset = view.getInt32(96, true); let surfaceOffset = view.getInt32(100, true);
  if (frameCount < 1 || frameCount > MAX_MD3_FRAMES || tagCount < 0 || tagCount > MAX_MD3_TAGS || surfaceCount < 1 || surfaceCount > MAX_MD3_SURFACES) throw new Error("Invalid MD3 counts");
  const tagBytes = frameCount * tagCount * 112;
  requireRange(view, tagOffset, tagBytes, "MD3 tags");
  let expandedBytes = frameCount * tagCount * (3 + 9) * Float32Array.BYTES_PER_ELEMENT;
  const tags = new Map<string, Md3Tag[]>();
  for (let frame = 0; frame < frameCount; frame += 1) for (let tag = 0; tag < tagCount; tag += 1) {
    const offset = tagOffset + (frame * tagCount + tag) * 112, origin = new Float32Array(3), axis = new Float32Array(9);
    for (let item = 0; item < 3; item += 1) origin[item] = view.getFloat32(offset + 64 + item * 4, true);
    for (let item = 0; item < 9; item += 1) axis[item] = view.getFloat32(offset + 76 + item * 4, true);
    const name = stringAt(view, offset, 64).toLowerCase(); const values = tags.get(name) ?? []; values.push({ origin, axis }); tags.set(name, values);
  }
  const surfaces: Md3Surface[] = [];
  for (let surfaceIndex = 0; surfaceIndex < surfaceCount; surfaceIndex += 1) {
    requireRange(view, surfaceOffset, 108, "MD3 surface header");
    if (stringAt(view, surfaceOffset, 4) !== "IDP3") throw new Error("Invalid MD3 surface");
    const frames = view.getInt32(surfaceOffset + 72, true), vertexCount = view.getInt32(surfaceOffset + 80, true), triangleCount = view.getInt32(surfaceOffset + 84, true);
    const triangleOffset = view.getInt32(surfaceOffset + 88, true), uvOffset = view.getInt32(surfaceOffset + 96, true), vertexOffset = view.getInt32(surfaceOffset + 100, true), end = view.getInt32(surfaceOffset + 104, true);
    if (frames !== frameCount || vertexCount < 1 || vertexCount > MAX_MD3_VERTICES || triangleCount < 1 || triangleCount > MAX_MD3_TRIANGLES || end < 108) throw new Error("Invalid MD3 surface counts");
    const triangleBytes = triangleCount * 12, uvBytes = vertexCount * 8, vertexBytes = frames * vertexCount * 8;
    if (triangleOffset < 108 || uvOffset < 108 || vertexOffset < 108 || triangleOffset + triangleBytes > end || uvOffset + uvBytes > end || vertexOffset + vertexBytes > end) throw new Error("Invalid MD3 surface layout");
    const triangles = surfaceOffset + triangleOffset, uvsAt = surfaceOffset + uvOffset, vertices = surfaceOffset + vertexOffset;
    requireRange(view, surfaceOffset, end, "MD3 surface");
    expandedBytes += triangleCount * 3 * Uint16Array.BYTES_PER_ELEMENT + vertexCount * 2 * Float32Array.BYTES_PER_ELEMENT + frames * vertexCount * 6 * Float32Array.BYTES_PER_ELEMENT;
    if (!Number.isSafeInteger(expandedBytes) || expandedBytes > MAX_MD3_EXPANDED_BYTES) throw new Error("MD3 expanded data exceeds limit");
    const indices = new Uint16Array(triangleCount * 3), uvs = new Float32Array(vertexCount * 2);
    for (let index = 0; index < indices.length; index += 1) { const value = view.getInt32(triangles + index * 4, true); if (value < 0 || value >= vertexCount) throw new Error("Invalid MD3 triangle"); indices[index] = value; }
    for (let index = 0; index < uvs.length; index += 1) uvs[index] = view.getFloat32(uvsAt + index * 4, true);
    const positions: Float32Array[] = [], normals: Float32Array[] = [];
    for (let frame = 0; frame < frames; frame += 1) {
      const framePositions = new Float32Array(vertexCount * 3), frameNormals = new Float32Array(vertexCount * 3);
      for (let vertex = 0; vertex < vertexCount; vertex += 1) { const offset = vertices + (frame * vertexCount + vertex) * 8; framePositions[vertex * 3] = view.getInt16(offset, true) / 64; framePositions[vertex * 3 + 1] = view.getInt16(offset + 2, true) / 64; framePositions[vertex * 3 + 2] = view.getInt16(offset + 4, true) / 64; frameNormals.set(normalAt(view.getUint16(offset + 6, true)), vertex * 3); }
      positions.push(framePositions); normals.push(frameNormals);
    }
    surfaces.push({ name: stringAt(view, surfaceOffset + 4, 64).toLowerCase(), positions, normals, uvs, indices }); surfaceOffset += end;
  }
  return { frameCount, surfaces, tags };
}

export function parseTga(buffer: ArrayBuffer): TgaImage {
  const view = new DataView(buffer); requireRange(view, 0, 18, "TGA header");
  const id = view.getUint8(0), type = view.getUint8(2), width = view.getUint16(12, true), height = view.getUint16(14, true), depth = view.getUint8(16), descriptor = view.getUint8(17);
  if (view.getUint8(1) !== 0 || (type !== 2 && type !== 10) || (depth !== 24 && depth !== 32) || width < 1 || height < 1 || width > 4096 || height > 4096) throw new Error("Unsupported TGA image");
  const bytesPerPixel = depth / 8, pixels = new Uint8Array(width * height * 4); let cursor = 18 + id, pixel = 0;
  const write = (offset: number) => { requireRange(view, offset, bytesPerPixel, "TGA pixel"); const sourceX = pixel % width, sourceY = Math.floor(pixel / width), x = descriptor & 0x10 ? width - 1 - sourceX : sourceX, y = descriptor & 0x20 ? sourceY : height - 1 - sourceY, target = (y * width + x) * 4; pixels[target] = view.getUint8(offset + 2); pixels[target + 1] = view.getUint8(offset + 1); pixels[target + 2] = view.getUint8(offset); pixels[target + 3] = bytesPerPixel === 4 ? view.getUint8(offset + 3) : 255; pixel += 1; };
  while (pixel < width * height) {
    if (type === 2) { write(cursor); cursor += bytesPerPixel; continue; }
    requireRange(view, cursor, 1, "TGA packet"); const packet = view.getUint8(cursor++), count = (packet & 0x7f) + 1; if (pixel + count > width * height) throw new Error("Invalid TGA packet");
    if (packet & 0x80) { const source = cursor; cursor += bytesPerPixel; for (let item = 0; item < count; item += 1) write(source); }
    else for (let item = 0; item < count; item += 1) { write(cursor); cursor += bytesPerPixel; }
  }
  return { width, height, pixels };
}

type Transform = Md3Tag;
const IDENTITY: Transform = { origin: new Float32Array(3), axis: new Float32Array([1,0,0,0,1,0,0,0,1]) };
function compose(parent: Transform, child: Transform): Transform { const origin = new Float32Array(3), axis = new Float32Array(9); for (let row=0;row<3;row+=1) { origin[row]=parent.origin[row]+child.origin[0]*parent.axis[row]+child.origin[1]*parent.axis[3+row]+child.origin[2]*parent.axis[6+row]; for(let column=0;column<3;column+=1) axis[column*3+row]=child.axis[column*3]*parent.axis[row]+child.axis[column*3+1]*parent.axis[3+row]+child.axis[column*3+2]*parent.axis[6+row]; } return {origin,axis}; }
function transformed(surface: Md3Surface, transform: Transform, frame: number): { position: Float32Array; normal: Float32Array } { const position=surface.positions[Math.min(frame,surface.positions.length-1)].slice(),normal=surface.normals[Math.min(frame,surface.normals.length-1)].slice(); for(let index=0;index<position.length;index+=3){const x=position[index],y=position[index+1],z=position[index+2],nx=normal[index],ny=normal[index+1],nz=normal[index+2];position[index]=transform.origin[0]+x*transform.axis[0]+y*transform.axis[3]+z*transform.axis[6];position[index+1]=transform.origin[1]+x*transform.axis[1]+y*transform.axis[4]+z*transform.axis[7];position[index+2]=transform.origin[2]+x*transform.axis[2]+y*transform.axis[5]+z*transform.axis[8];normal[index]=nx*transform.axis[0]+ny*transform.axis[3]+nz*transform.axis[6];normal[index+1]=nx*transform.axis[1]+ny*transform.axis[4]+nz*transform.axis[7];normal[index+2]=nx*transform.axis[2]+ny*transform.axis[5]+nz*transform.axis[8];}return{position,normal}; }
export type AssembledSurface = ReturnType<typeof transformed> & { name: string; uvs: Float32Array; indices: Uint16Array; part: "lower"|"upper"|"head" };
export function assemblePlayer(lower: Md3Model, upper: Md3Model, head: Md3Model, lowerFrame=0, upperFrame=0, headFrame=0): AssembledSurface[] {
  const torso=lower.tags.get("tag_torso")?.[Math.min(lowerFrame,lower.frameCount-1)], headTag=upper.tags.get("tag_head")?.[Math.min(upperFrame,upper.frameCount-1)]; if(!torso||!headTag) throw new Error("Player model is missing attachment tags");
  const upperTransform=compose(IDENTITY,torso),headTransform=compose(upperTransform,headTag);
  return [
    ...lower.surfaces.map(surface=>({...transformed(surface,IDENTITY,lowerFrame),name:surface.name,uvs:surface.uvs,indices:surface.indices,part:"lower" as const})),
    ...upper.surfaces.map(surface=>({...transformed(surface,upperTransform,upperFrame),name:surface.name,uvs:surface.uvs,indices:surface.indices,part:"upper" as const})),
    ...head.surfaces.map(surface=>({...transformed(surface,headTransform,headFrame),name:surface.name,uvs:surface.uvs,indices:surface.indices,part:"head" as const})),
  ];
}
