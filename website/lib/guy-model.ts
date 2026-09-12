export type Md3Surface = {
  name: string;
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint16Array | Uint32Array;
};

export type Md3Tag = { origin: Float32Array; axis: Float32Array };
export type Md3Model = { surfaces: Md3Surface[]; tags: Map<string, Md3Tag> };
export type TgaImage = { width: number; height: number; pixels: Uint8Array };
export type GuyAppearance = { model: string; skin: string; headModel: string; headSkin: string };

function requireRange(view: DataView, offset: number, length: number, label: string): void {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || offset + length > view.byteLength) {
    throw new Error(`Invalid ${label}`);
  }
}

function readString(view: DataView, offset: number, length: number): string {
  requireRange(view, offset, length, "MD3 string");
  let result = "";
  for (let index = 0; index < length; index += 1) {
    const value = view.getUint8(offset + index);
    if (!value) break;
    result += String.fromCharCode(value);
  }
  return result;
}

function decodeNormal(packed: number): readonly [number, number, number] {
  const latitude = ((packed >> 8) & 255) * Math.PI * 2 / 255;
  const longitude = (packed & 255) * Math.PI * 2 / 255;
  return [Math.cos(latitude) * Math.sin(longitude), Math.sin(latitude) * Math.sin(longitude), Math.cos(longitude)];
}

export function parseMd3(buffer: ArrayBuffer): Md3Model {
  const view = new DataView(buffer);
  requireRange(view, 0, 108, "MD3 header");
  if (readString(view, 0, 4) !== "IDP3" || view.getInt32(4, true) !== 15) throw new Error("Unsupported MD3 model");
  const frameCount = view.getInt32(76, true);
  const tagCount = view.getInt32(80, true);
  const surfaceCount = view.getInt32(84, true);
  const tagOffset = view.getInt32(96, true);
  let surfaceOffset = view.getInt32(100, true);
  if (frameCount < 1 || tagCount < 0 || surfaceCount < 0 || surfaceCount > 64) throw new Error("Invalid MD3 counts");
  requireRange(view, tagOffset, tagCount * 112, "MD3 tags");
  const tags = new Map<string, Md3Tag>();
  for (let index = 0; index < tagCount; index += 1) {
    const offset = tagOffset + index * 112;
    const origin = new Float32Array(3);
    const axis = new Float32Array(9);
    for (let item = 0; item < 3; item += 1) origin[item] = view.getFloat32(offset + 64 + item * 4, true);
    for (let item = 0; item < 9; item += 1) axis[item] = view.getFloat32(offset + 76 + item * 4, true);
    tags.set(readString(view, offset, 64), { origin, axis });
  }
  const surfaces: Md3Surface[] = [];
  for (let surfaceIndex = 0; surfaceIndex < surfaceCount; surfaceIndex += 1) {
    requireRange(view, surfaceOffset, 108, "MD3 surface header");
    if (readString(view, surfaceOffset, 4) !== "IDP3") throw new Error("Invalid MD3 surface");
    const surfaceFrames = view.getInt32(surfaceOffset + 72, true);
    const vertexCount = view.getInt32(surfaceOffset + 80, true);
    const triangleCount = view.getInt32(surfaceOffset + 84, true);
    const triangleOffset = surfaceOffset + view.getInt32(surfaceOffset + 88, true);
    const uvOffset = surfaceOffset + view.getInt32(surfaceOffset + 96, true);
    const vertexOffset = surfaceOffset + view.getInt32(surfaceOffset + 100, true);
    const surfaceEnd = view.getInt32(surfaceOffset + 104, true);
    if (surfaceFrames < 1 || vertexCount < 1 || vertexCount > 65_535 || triangleCount < 1 || triangleCount > 1_000_000 || surfaceEnd < 108) throw new Error("Invalid MD3 surface counts");
    requireRange(view, triangleOffset, triangleCount * 12, "MD3 triangles");
    requireRange(view, uvOffset, vertexCount * 8, "MD3 texture coordinates");
    requireRange(view, vertexOffset, vertexCount * 8, "MD3 vertices");
    requireRange(view, surfaceOffset, surfaceEnd, "MD3 surface");
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const indices = new Uint16Array(triangleCount * 3);
    for (let index = 0; index < indices.length; index += 1) {
      const value = view.getInt32(triangleOffset + index * 4, true);
      if (value < 0 || value >= vertexCount) throw new Error("Invalid MD3 triangle index");
      indices[index] = value;
    }
    for (let index = 0; index < vertexCount; index += 1) {
      uvs[index * 2] = view.getFloat32(uvOffset + index * 8, true);
      uvs[index * 2 + 1] = view.getFloat32(uvOffset + index * 8 + 4, true);
      const offset = vertexOffset + index * 8;
      positions[index * 3] = view.getInt16(offset, true) / 64;
      positions[index * 3 + 1] = view.getInt16(offset + 2, true) / 64;
      positions[index * 3 + 2] = view.getInt16(offset + 4, true) / 64;
      normals.set(decodeNormal(view.getUint16(offset + 6, true)), index * 3);
    }
    surfaces.push({ name: readString(view, surfaceOffset + 4, 64), positions, normals, uvs, indices });
    surfaceOffset += surfaceEnd;
  }
  return { surfaces, tags };
}

export function parseTga(buffer: ArrayBuffer): TgaImage {
  const view = new DataView(buffer);
  requireRange(view, 0, 18, "TGA header");
  const idLength = view.getUint8(0);
  const colorMapType = view.getUint8(1);
  const imageType = view.getUint8(2);
  const width = view.getUint16(12, true);
  const height = view.getUint16(14, true);
  const depth = view.getUint8(16);
  const descriptor = view.getUint8(17);
  if (colorMapType !== 0 || imageType !== 2 || depth !== 24 || width < 1 || height < 1 || width > 4096 || height > 4096) throw new Error("Unsupported TGA image");
  const sourceOffset = 18 + idLength;
  requireRange(view, sourceOffset, width * height * 3, "TGA pixels");
  const pixels = new Uint8Array(width * height * 4);
  const rightOrigin = (descriptor & 0x10) !== 0;
  const topOrigin = (descriptor & 0x20) !== 0;
  for (let y = 0; y < height; y += 1) {
    // Typed-array texture uploads start at WebGL's bottom-left. Normalize both
    // TGA origin bits here; UNPACK_FLIP_Y_WEBGL does not apply to this upload.
    const targetY = topOrigin ? height - 1 - y : y;
    for (let x = 0; x < width; x += 1) {
      const source = sourceOffset + (y * width + x) * 3;
      const targetX = rightOrigin ? width - 1 - x : x;
      const target = (targetY * width + targetX) * 4;
      pixels[target] = view.getUint8(source + 2);
      pixels[target + 1] = view.getUint8(source + 1);
      pixels[target + 2] = view.getUint8(source);
      pixels[target + 3] = 255;
    }
  }
  return { width, height, pixels };
}

type Transform = { origin: Float32Array; axis: Float32Array };
const IDENTITY: Transform = { origin: new Float32Array(3), axis: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]) };

function compose(parent: Transform, child: Md3Tag): Transform {
  const origin = new Float32Array(3);
  const axis = new Float32Array(9);
  for (let row = 0; row < 3; row += 1) {
    origin[row] = parent.origin[row] + child.origin[0] * parent.axis[row] + child.origin[1] * parent.axis[3 + row] + child.origin[2] * parent.axis[6 + row];
    for (let column = 0; column < 3; column += 1) axis[column * 3 + row] = child.axis[column * 3] * parent.axis[row] + child.axis[column * 3 + 1] * parent.axis[3 + row] + child.axis[column * 3 + 2] * parent.axis[6 + row];
  }
  return { origin, axis };
}

function transformed(surfaces: Md3Surface[], transform: Transform): Md3Surface[] {
  return surfaces.map((surface) => {
    const positions = surface.positions.slice();
    const normals = surface.normals.slice();
    for (let index = 0; index < positions.length; index += 3) {
      const x = positions[index], y = positions[index + 1], z = positions[index + 2];
      positions[index] = transform.origin[0] + x * transform.axis[0] + y * transform.axis[3] + z * transform.axis[6];
      positions[index + 1] = transform.origin[1] + x * transform.axis[1] + y * transform.axis[4] + z * transform.axis[7];
      positions[index + 2] = transform.origin[2] + x * transform.axis[2] + y * transform.axis[5] + z * transform.axis[8];
      const nx = normals[index], ny = normals[index + 1], nz = normals[index + 2];
      normals[index] = nx * transform.axis[0] + ny * transform.axis[3] + nz * transform.axis[6];
      normals[index + 1] = nx * transform.axis[1] + ny * transform.axis[4] + nz * transform.axis[7];
      normals[index + 2] = nx * transform.axis[2] + ny * transform.axis[5] + nz * transform.axis[8];
    }
    return { ...surface, positions, normals };
  });
}

export function assembleGuy(lower: Md3Model, upper: Md3Model, head: Md3Model): Md3Surface[] {
  const torsoTag = lower.tags.get("tag_torso");
  const headTag = upper.tags.get("tag_head");
  if (!torsoTag || !headTag) throw new Error("GUY model is missing attachment tags");
  const upperTransform = compose(IDENTITY, torsoTag);
  const headTransform = compose(upperTransform, headTag);
  return [...transformed(lower.surfaces, IDENTITY), ...transformed(upper.surfaces, upperTransform), ...transformed(head.surfaces, headTransform)];
}

export function supportsGuyPreview({ model, skin, headModel, headSkin }: GuyAppearance): boolean {
  const bodyReference = `${model}/${skin}`.trim().toLowerCase();
  const headReference = headModel ? `${headModel}/${headSkin || "default"}` : bodyReference;
  return bodyReference === "guy/default" && headReference.trim().toLowerCase() === "guy/default";
}
