import { inflateRawSync } from "node:zlib";
import { open, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";

const MAX_ARCHIVE_ENTRIES = 50_000;
const MAX_COMPRESSED_BYTES = 16 * 1024 * 1024;
const MAX_RESOURCE_BYTES = 32 * 1024 * 1024;
const MAX_RATIO = 100;
const PLAYER_QPATH = /^models\/players\/[a-z0-9_.@+-]+(?:\/[a-z0-9_.@+-]+)+$/;
const RESOURCE_EXTENSIONS = new Set([".md3", ".skin", ".cfg", ".tga", ".jpg", ".jpeg", ".png", ".webp"]);

export class PlayerAssetError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

export function validatePlayerQpath(input: string): string {
  if (input.length > 256 || input.includes("\0") || input.includes("\\") || input !== input.toLowerCase()) throw new PlayerAssetError("Invalid qpath");
  const extension = path.posix.extname(input);
  if (!PLAYER_QPATH.test(input) || input.split("/").some((part) => part === "." || part === "..") || !RESOURCE_EXTENSIONS.has(extension)) throw new PlayerAssetError("Resource is not allowlisted", 403);
  return input;
}

type ZipEntry = { archive: string; offset: number; compressed: number; uncompressed: number; method: number; flags: number; crc32: number; nameBytes: Buffer };

export function isPathContained(base: string, candidate: string): boolean {
  const relative = path.relative(base, candidate);
  return relative !== "" && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function verifyZipEntry(result: Buffer, entry: ZipEntry): Buffer {
  if (result.length !== entry.uncompressed || crc32(result) !== entry.crc32) throw new PlayerAssetError("Malformed or corrupt ZIP entry", 500);
  return result;
}

function range(buffer: Buffer, offset: number, length: number, label: string): void {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || offset + length > buffer.length) throw new PlayerAssetError(`Malformed ZIP ${label}`, 500);
}

export function indexPk3(buffer: Buffer, archive = "fixture.pk3"): Map<string, ZipEntry> {
  const minimum = Math.max(0, buffer.length - 65_557);
  let eocd = -1;
  for (let offset = buffer.length - 22; offset >= minimum; offset -= 1) if (buffer.readUInt32LE(offset) === 0x06054b50) { eocd = offset; break; }
  if (eocd < 0) throw new PlayerAssetError("Malformed ZIP directory", 500);
  range(buffer, eocd, 22, "end record");
  const count = buffer.readUInt16LE(eocd + 10);
  const directorySize = buffer.readUInt32LE(eocd + 12);
  const directoryOffset = buffer.readUInt32LE(eocd + 16);
  if (count > MAX_ARCHIVE_ENTRIES || buffer.readUInt16LE(eocd + 8) !== count) throw new PlayerAssetError("ZIP has too many entries", 500);
  range(buffer, directoryOffset, directorySize, "central directory");
  const entries = new Map<string, ZipEntry>();
  let cursor = directoryOffset;
  for (let index = 0; index < count; index += 1) {
    range(buffer, cursor, 46, "entry");
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) throw new PlayerAssetError("Malformed ZIP entry", 500);
    const flags = buffer.readUInt16LE(cursor + 8), method = buffer.readUInt16LE(cursor + 10);
    const crc32 = buffer.readUInt32LE(cursor + 16), compressed = buffer.readUInt32LE(cursor + 20), uncompressed = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28), extraLength = buffer.readUInt16LE(cursor + 30), commentLength = buffer.readUInt16LE(cursor + 32);
    range(buffer, cursor + 46, nameLength + extraLength + commentLength, "entry name");
    const rawName = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString((flags & 0x800) ? "utf8" : "latin1");
    const name = rawName.replaceAll("\\", "/").replace(/^\/+/, "").toLowerCase();
    const nameBytes = Buffer.from(buffer.subarray(cursor + 46, cursor + 46 + nameLength));
    if (!name.split("/").some((part) => part === "..") && !name.endsWith("/")) entries.set(name, { archive, offset: buffer.readUInt32LE(cursor + 42), compressed, uncompressed, method, flags, crc32, nameBytes });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  if (cursor > directoryOffset + directorySize) throw new PlayerAssetError("Malformed ZIP directory size", 500);
  return entries;
}

export function extractPk3Entry(buffer: Buffer, entry: ZipEntry): Buffer {
  if (entry.flags & 1 || (entry.method !== 0 && entry.method !== 8)) throw new PlayerAssetError("Unsupported ZIP entry", 415);
  if (entry.compressed > MAX_COMPRESSED_BYTES || entry.uncompressed > MAX_RESOURCE_BYTES || (entry.compressed === 0 ? entry.uncompressed > 0 : entry.uncompressed > entry.compressed * MAX_RATIO)) throw new PlayerAssetError("ZIP entry exceeds resource limits", 413);
  range(buffer, entry.offset, 30, "local entry");
  if (buffer.readUInt32LE(entry.offset) !== 0x04034b50) throw new PlayerAssetError("Malformed ZIP local entry", 500);
  const localFlags = buffer.readUInt16LE(entry.offset + 6), localMethod = buffer.readUInt16LE(entry.offset + 8), localNameLength = buffer.readUInt16LE(entry.offset + 26), localExtraLength = buffer.readUInt16LE(entry.offset + 28);
  range(buffer, entry.offset + 30, localNameLength + localExtraLength, "local entry name");
  const localName = buffer.subarray(entry.offset + 30, entry.offset + 30 + localNameLength);
  if (localFlags !== entry.flags || localMethod !== entry.method || !localName.equals(entry.nameBytes)) throw new PlayerAssetError("ZIP local entry disagrees with central directory", 500);
  if (!(entry.flags & 8) && (buffer.readUInt32LE(entry.offset + 14) !== entry.crc32 || buffer.readUInt32LE(entry.offset + 18) !== entry.compressed || buffer.readUInt32LE(entry.offset + 22) !== entry.uncompressed)) throw new PlayerAssetError("ZIP local entry disagrees with central directory", 500);
  const start = entry.offset + 30 + localNameLength + localExtraLength;
  range(buffer, start, entry.compressed, "entry data");
  const source = buffer.subarray(start, start + entry.compressed);
  const result = entry.method === 0 ? Buffer.from(source) : inflateRawSync(source, { maxOutputLength: MAX_RESOURCE_BYTES });
  return verifyZipEntry(result, entry);
}

type Archive = { file: string; entries: Map<string, ZipEntry> };

async function indexPk3File(file: string): Promise<Map<string, ZipEntry>> {
  const handle = await open(file, "r");
  try {
    const details = await handle.stat(), tailSize = Math.min(details.size, 65_557), tail = Buffer.alloc(tailSize);
    await handle.read(tail, 0, tail.length, details.size - tailSize);
    let eocd = -1;
    for (let offset=tail.length-22;offset>=0;offset-=1) if(tail.readUInt32LE(offset)===0x06054b50){eocd=offset;break;}
    if(eocd<0)throw new PlayerAssetError("Malformed ZIP directory",500);
    const count=tail.readUInt16LE(eocd+10),directorySize=tail.readUInt32LE(eocd+12),directoryOffset=tail.readUInt32LE(eocd+16);
    if(count>MAX_ARCHIVE_ENTRIES||tail.readUInt16LE(eocd+8)!==count||directorySize>64*1024*1024||directoryOffset+directorySize>details.size)throw new PlayerAssetError("Malformed ZIP directory",500);
    const directory=Buffer.alloc(directorySize);await handle.read(directory,0,directory.length,directoryOffset);
    const entries=new Map<string,ZipEntry>();let cursor=0;
    for(let index=0;index<count;index+=1){range(directory,cursor,46,"entry");if(directory.readUInt32LE(cursor)!==0x02014b50)throw new PlayerAssetError("Malformed ZIP entry",500);const flags=directory.readUInt16LE(cursor+8),method=directory.readUInt16LE(cursor+10),crc32=directory.readUInt32LE(cursor+16),compressed=directory.readUInt32LE(cursor+20),uncompressed=directory.readUInt32LE(cursor+24),nameLength=directory.readUInt16LE(cursor+28),extraLength=directory.readUInt16LE(cursor+30),commentLength=directory.readUInt16LE(cursor+32);range(directory,cursor+46,nameLength+extraLength+commentLength,"entry name");const nameBytes=Buffer.from(directory.subarray(cursor+46,cursor+46+nameLength)),rawName=nameBytes.toString((flags&0x800)?"utf8":"latin1"),name=rawName.replaceAll("\\","/").replace(/^\/+/,"").toLowerCase();if(!name.split("/").some(part=>part==="..")&&!name.endsWith("/"))entries.set(name,{archive:file,offset:directory.readUInt32LE(cursor+42),compressed,uncompressed,method,flags,crc32,nameBytes});cursor+=46+nameLength+extraLength+commentLength;}
    return entries;
  } finally { await handle.close(); }
}

async function extractPk3File(file: string, entry: ZipEntry): Promise<Buffer> {
  if(entry.flags&1||(entry.method!==0&&entry.method!==8))throw new PlayerAssetError("Unsupported ZIP entry",415);
  if(entry.compressed>MAX_COMPRESSED_BYTES||entry.uncompressed>MAX_RESOURCE_BYTES||(entry.compressed===0?entry.uncompressed>0:entry.uncompressed>entry.compressed*MAX_RATIO))throw new PlayerAssetError("ZIP entry exceeds resource limits",413);
  const handle=await open(file,"r");try{const header=Buffer.alloc(30),headerRead=await handle.read(header,0,30,entry.offset);if(headerRead.bytesRead!==30||header.readUInt32LE(0)!==0x04034b50)throw new PlayerAssetError("Malformed ZIP local entry",500);const localFlags=header.readUInt16LE(6),localMethod=header.readUInt16LE(8),localNameLength=header.readUInt16LE(26),localExtraLength=header.readUInt16LE(28),localName=Buffer.alloc(localNameLength),nameRead=await handle.read(localName,0,localName.length,entry.offset+30);if(nameRead.bytesRead!==localName.length||localFlags!==entry.flags||localMethod!==entry.method||!localName.equals(entry.nameBytes)||(!(entry.flags&8)&&(header.readUInt32LE(14)!==entry.crc32||header.readUInt32LE(18)!==entry.compressed||header.readUInt32LE(22)!==entry.uncompressed)))throw new PlayerAssetError("ZIP local entry disagrees with central directory",500);const start=entry.offset+30+localNameLength+localExtraLength,source=Buffer.alloc(entry.compressed),dataRead=await handle.read(source,0,source.length,start);if(dataRead.bytesRead!==source.length)throw new PlayerAssetError("Malformed ZIP entry data",500);const result=entry.method===0?source:inflateRawSync(source,{maxOutputLength:MAX_RESOURCE_BYTES});return verifyZipEntry(result,entry);}finally{await handle.close();}
}

export class PlayerAssetStore {
  private readonly baseq3: string;
  private readonly archives: Archive[];
  private constructor(baseq3: string, archives: Archive[]) { this.baseq3 = baseq3; this.archives = archives; }

  static async create(configuredRoot = process.env.Q3JS_GAME_DATA_ROOT): Promise<PlayerAssetStore> {
    if (!configuredRoot) throw new PlayerAssetError("Player preview data is not configured", 503);
    const root = await realpath(configuredRoot);
    const baseq3 = path.join(root, "baseq3");
    const resolvedBaseq3 = await realpath(baseq3);
    const names = (await readdir(baseq3)).filter((name) => name.toLowerCase().endsWith(".pk3")).sort((a, b) => b.localeCompare(a, "en"));
    const archives: Archive[] = [];
    for (const name of names) {
      const file = await realpath(path.join(resolvedBaseq3, name));
      if (!isPathContained(resolvedBaseq3, file) || !(await stat(file)).isFile()) throw new PlayerAssetError("Invalid PK3 archive", 403);
      archives.push({ file, entries: await indexPk3File(file) });
    }
    return new PlayerAssetStore(resolvedBaseq3, archives);
  }

  async read(input: string): Promise<Buffer | null> {
    const qpath = validatePlayerQpath(input);
    for (const archive of this.archives) {
      const entry = archive.entries.get(qpath);
      if (entry) return extractPk3File(archive.file, entry);
    }
    const candidate = path.join(this.baseq3, ...qpath.split("/"));
    try {
      const resolved = await realpath(candidate);
      if (!isPathContained(this.baseq3, resolved) || !(await stat(resolved)).isFile()) throw new PlayerAssetError("Invalid loose resource", 403);
      const handle = await open(resolved, "r");
      try {
        const details = await handle.stat();
        if (details.size > MAX_RESOURCE_BYTES) throw new PlayerAssetError("Resource exceeds size limit", 413);
        return await handle.readFile();
      } finally { await handle.close(); }
    } catch (error) {
      if (error instanceof PlayerAssetError) throw error;
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
}

let cachedStore: Promise<PlayerAssetStore> | undefined;
export function getPlayerAssetStore(): Promise<PlayerAssetStore> {
  cachedStore ??= PlayerAssetStore.create();
  return cachedStore;
}
