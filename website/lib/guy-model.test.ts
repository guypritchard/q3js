import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { assembleGuy, parseMd3, parseTga, supportsGuyPreview } from "./guy-model.ts";

const source = path.resolve("../game/q3js-assets/baseq3/models/players/guy");
const published = path.resolve("public/models/players/guy");
const bytes = async (directory: string, name: string) => new Uint8Array(await readFile(path.join(directory, name)));
const buffer = (value: Uint8Array) => value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;

function dot(a: readonly number[], b: readonly number[]): number {
  return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
}

function geometricNormal(positions: Float32Array, indices: Uint16Array | Uint32Array, triangle: number): number[] {
  const [a,b,c] = Array.from(indices.slice(triangle*3, triangle*3+3), index => Array.from(positions.slice(index*3,index*3+3)));
  const ab=b.map((value,axis)=>value-a[axis]), ac=c.map((value,axis)=>value-a[axis]);
  const normal=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
  const length=Math.hypot(...normal);
  return normal.map(value=>value/length);
}

test("bundled GUY MD3 parts parse and assemble through their tags", async () => {
  const [lower, upper, head] = await Promise.all(["lower.md3", "upper.md3", "head.md3"].map(async (name) => parseMd3(buffer(await bytes(published, name)))));
  assert.ok(lower.tags.has("tag_torso"));
  assert.ok(upper.tags.has("tag_head"));
  assert.deepEqual(Array.from(lower.tags.get("tag_torso")!.origin), [0, 0, 5]);
  assert.deepEqual(Array.from(upper.tags.get("tag_head")!.origin), [0, 0, 15]);
  const surfaces = assembleGuy(lower, upper, head);
  assert.equal(surfaces.length, 3);
  for (const surface of surfaces) {
    assert.equal(surface.positions.length, 72);
    assert.equal(surface.uvs.length, 48);
    assert.equal(surface.indices.length, 36);
    const mappings = new Set<string>();
    for (let face=0;face<6;face++) {
      const uv=Array.from(surface.uvs.slice(face*8,face*8+8));
      mappings.add(uv.map(value=>value.toFixed(6)).join(','));
      for (let triangle=face*2;triangle<face*2+2;triangle++) {
        const [a,b,c]=Array.from(surface.indices.slice(triangle*3,triangle*3+3), index=>Array.from(surface.uvs.slice(index*2,index*2+2)));
        const area=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
        assert.ok(Math.abs(area)>1e-4, `face ${face} triangle ${triangle} has UV area`);
        const geometric=geometricNormal(surface.positions,surface.indices,triangle);
        for (const index of surface.indices.slice(triangle*3,triangle*3+3)) {
          assert.ok(dot(geometric,Array.from(surface.normals.slice(index*3,index*3+3)))>.99, `face ${face} packed normal follows geometry`);
        }
      }
    }
    assert.equal(mappings.size,6,"six face-local atlas rectangles");
  }
  const headMinimumZ = Math.min(...surfaces[2].positions.filter((_, index) => index % 3 === 2));
  assert.equal(headMinimumZ, 15, "head receives both torso and head tag translations");
});

test("bundled top-origin GUY TGA decodes to bottom-origin opaque RGBA", async () => {
  const image = parseTga(buffer(await bytes(published, "guy.tga")));
  assert.deepEqual([image.width, image.height, image.pixels.length], [128, 128, 65536]);
  assert.ok(image.pixels.every((value, index) => index % 4 !== 3 || value === 255));
  assert.notDeepEqual(Array.from(image.pixels.slice(0, 4)), Array.from(image.pixels.slice(127 * 128 * 4, 127 * 128 * 4 + 4)), "asymmetric atlas rows are flipped for upload");
});

test("TGA descriptor normalizes asymmetric top-right origin", () => {
  const data=new Uint8Array(18+12); data[2]=2; data[12]=2; data[14]=2; data[16]=24; data[17]=0x30;
  data.set([0,0,255, 0,255,0, 255,0,0, 0,255,255],18);
  const image=parseTga(buffer(data));
  assert.deepEqual(Array.from(image.pixels), [255,255,0,255, 0,0,255,255, 0,255,0,255, 255,0,0,255]);
});

test("published preview files exactly match their generated sources", async () => {
  for (const name of ["lower.md3", "upper.md3", "head.md3", "guy.tga"]) assert.deepEqual(await bytes(published, name), await bytes(source, name), `${name} must be recopied after regeneration`);
});

test("preview selection matches the exact body and head references exported for GUY", () => {
  const appearance = { model: "guy", skin: "default", headModel: "", headSkin: "" };
  assert.equal(supportsGuyPreview(appearance), true);
  assert.equal(supportsGuyPreview({ ...appearance, model: " GUY", skin: "DEFAULT " }), true);
  assert.equal(supportsGuyPreview({ ...appearance, headModel: "guy" }), true, "explicit head uses the default-skin fallback");
  assert.equal(supportsGuyPreview({ ...appearance, headSkin: "custom" }), true, "head skin is ignored when the head model falls back to the body");
  for (const candidate of [
    { ...appearance, skin: "custom" },
    { ...appearance, model: "guy/default" },
    { ...appearance, headModel: "sarge" },
    { ...appearance, headModel: "guy", headSkin: "custom" },
  ]) assert.equal(supportsGuyPreview(candidate), false, JSON.stringify(candidate));
});
