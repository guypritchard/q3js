import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { inflateRawSync } from 'node:zlib';

const server = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const game = resolve(server, '..');
const guyModel = join(game, 'q3js-assets', 'baseq3', 'models', 'players', 'guy');
const expectedTriangles = Array.from({ length: 6 }, (_, face) => [0,2,1,1,2,3].map(index => face*4+index)).flat();
const expectedTags = { lower: ['tag_torso'], upper: ['tag_head', 'tag_weapon'], head: [] };

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function cString(data, offset, length) {
  const end = data.indexOf(0, offset);
  return data.subarray(offset, end < 0 || end >= offset + length ? offset + length : end).toString('ascii');
}

function extractPk3(archive) {
  const eocd = archive.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(eocd >= 0, 'PK3 has an end-of-central-directory record');
  assert.equal(eocd + 22 + archive.readUInt16LE(eocd + 20), archive.length, 'EOCD reaches archive end');
  assert.equal(archive.readUInt16LE(eocd + 4), 0, 'single-disk archive');
  assert.equal(archive.readUInt16LE(eocd + 6), 0, 'central directory is on the same disk');
  const count = archive.readUInt16LE(eocd + 10);
  assert.equal(archive.readUInt16LE(eocd + 8), count, 'all entries are in this central directory');
  const directorySize = archive.readUInt32LE(eocd + 12);
  const directoryOffset = archive.readUInt32LE(eocd + 16);
  assert.equal(directoryOffset + directorySize, eocd, 'central directory offsets are contiguous');

  const extracted = new Map();
  let cursor = directoryOffset;
  for (let index = 0; index < count; index++) {
    assert.equal(archive.readUInt32LE(cursor), 0x02014b50, `central entry ${index} signature`);
    const method = archive.readUInt16LE(cursor + 10);
    const crc = archive.readUInt32LE(cursor + 16);
    const packedSize = archive.readUInt32LE(cursor + 20);
    const size = archive.readUInt32LE(cursor + 24);
    const nameLength = archive.readUInt16LE(cursor + 28);
    const extraLength = archive.readUInt16LE(cursor + 30);
    const commentLength = archive.readUInt16LE(cursor + 32);
    const localOffset = archive.readUInt32LE(cursor + 42);
    const name = archive.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');
    assert.equal(archive.readUInt32LE(localOffset), 0x04034b50, `${name} local signature`);
    assert.equal(archive.readUInt16LE(localOffset + 8), method, `${name} compression method agrees`);
    assert.equal(archive.readUInt32LE(localOffset + 14), crc, `${name} CRC agrees`);
    assert.equal(archive.readUInt32LE(localOffset + 18), packedSize, `${name} packed size agrees`);
    assert.equal(archive.readUInt32LE(localOffset + 22), size, `${name} size agrees`);
    const localNameLength = archive.readUInt16LE(localOffset + 26);
    const localExtraLength = archive.readUInt16LE(localOffset + 28);
    assert.equal(archive.subarray(localOffset + 30, localOffset + 30 + localNameLength).toString('utf8'), name);
    const packedStart = localOffset + 30 + localNameLength + localExtraLength;
    const packed = archive.subarray(packedStart, packedStart + packedSize);
    const data = method === 8 ? inflateRawSync(packed) : packed;
    assert.equal(data.length, size, `${name} extracts to its declared size`);
    assert.equal(crc32(data), crc, `${name} extracts with its declared CRC`);
    assert.ok(!extracted.has(name), `${name} occurs only once`);
    extracted.set(name, data);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  assert.equal(cursor, eocd, 'all and only central-directory bytes were consumed');
  return extracted;
}

function validateMd3(md3, part) {
  assert.equal(md3.subarray(0, 4).toString(), 'IDP3');
  assert.equal(md3.readInt32LE(4), 15);
  assert.equal(cString(md3, 8, 64), part);
  const frames = md3.readInt32LE(76);
  const tags = md3.readInt32LE(80);
  const surfaces = md3.readInt32LE(84);
  const frameOffset = md3.readInt32LE(92);
  const tagOffset = md3.readInt32LE(96);
  const surfaceOffset = md3.readInt32LE(100);
  const endOffset = md3.readInt32LE(104);
  assert.deepEqual([frames, tags, surfaces], [1, expectedTags[part].length, 1]);
  assert.deepEqual([frameOffset, tagOffset, surfaceOffset, endOffset], [108, 164, 164 + tags * 112, md3.length]);
  assert.ok(frameOffset + frames * 56 <= tagOffset && tagOffset + frames * tags * 112 <= surfaceOffset);
  for (let axis = 0; axis < 3; axis++) {
    const min = md3.readFloatLE(frameOffset + axis * 4);
    const max = md3.readFloatLE(frameOffset + 12 + axis * 4);
    assert.ok(Number.isFinite(min) && Number.isFinite(max) && min <= max, `${part} frame axis ${axis} bounds`);
  }
  assert.equal(cString(md3, frameOffset + 40, 16), part);
  for (let tag = 0; tag < tags; tag++) {
    const offset = tagOffset + tag * 112;
    assert.equal(cString(md3, offset, 64), expectedTags[part][tag]);
    for (let value = 0; value < 12; value++) assert.ok(Number.isFinite(md3.readFloatLE(offset + 64 + value * 4)));
    assert.deepEqual(Array.from({ length: 9 }, (_, i) => md3.readFloatLE(offset + 76 + i * 4)), [1,0,0,0,1,0,0,0,1]);
  }

  let offset = surfaceOffset;
  for (let surface = 0; surface < surfaces; surface++) {
    assert.equal(md3.subarray(offset, offset + 4).toString(), 'IDP3');
    assert.equal(cString(md3, offset + 4, 64), `${part}_body`);
    const surfaceFrames = md3.readInt32LE(offset + 72);
    const shaders = md3.readInt32LE(offset + 76);
    const vertices = md3.readInt32LE(offset + 80);
    const triangles = md3.readInt32LE(offset + 84);
    const triangleOffset = md3.readInt32LE(offset + 88);
    const shaderOffset = md3.readInt32LE(offset + 92);
    const stOffset = md3.readInt32LE(offset + 96);
    const vertexOffset = md3.readInt32LE(offset + 100);
    const surfaceEnd = md3.readInt32LE(offset + 104);
    assert.deepEqual([surfaceFrames, shaders, vertices, triangles], [1, 1, 24, 12]);
    assert.deepEqual([triangleOffset, shaderOffset, stOffset, vertexOffset], [176, 108, 320, 512]);
    assert.equal(vertexOffset + surfaceFrames * vertices * 8, surfaceEnd);
    assert.ok(offset + surfaceEnd <= md3.length);
    assert.equal(cString(md3, offset + shaderOffset, 64), 'models/players/guy/guy');
    const indices = Array.from({ length: triangles * 3 }, (_, i) => md3.readInt32LE(offset + triangleOffset + i * 4));
    assert.deepEqual(indices, expectedTriangles);
    for (const index of indices) assert.ok(index >= 0 && index < vertices, `${part} triangle index ${index} is in range`);
    const mappings = new Set();
    for (let face = 0; face < 6; face++) {
      const uv = Array.from({ length: 8 }, (_, i) => md3.readFloatLE(offset + stOffset + (face * 8 + i) * 4));
      mappings.add(uv.map(value => value.toFixed(6)).join(','));
      const area = (uv[4]-uv[0])*(uv[3]-uv[1])-(uv[5]-uv[1])*(uv[2]-uv[0]);
      assert.ok(Math.abs(area) > 1e-4, `${part} face ${face} has non-degenerate UVs`);
    }
    assert.equal(mappings.size, 6);
    offset += surfaceEnd;
  }
  assert.equal(offset, endOffset, 'surfaces end at the MD3 end offset');
}

test('GUY overlay is deterministic, isolated, and structurally valid', async t => {
  const temp = await mkdtemp(join(tmpdir(), 'q3js-guy-package-'));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const qvm = join(temp, 'qagame.qvm');
  const output = join(temp, 'output');
  const qvmData = Buffer.from('fresh-qvm-test-fixture');
  await writeFile(qvm, qvmData);
  const env = { ...process.env, QAGAME_QVM: qvm, Q3JS_GUY_OUTPUT_DIR: output };

  execFileSync(process.execPath, [join(server, 'scripts', 'package-game.mjs')], { env, stdio: 'pipe' });
  const manifest = JSON.parse(await readFile(join(output, 'q3js-guy-manifest.json'), 'utf8'));
  assert.match(manifest.file, /zzz-q3js-guy-[0-9a-f]{64}\.pk3$/);
  const packages = (await readdir(output)).filter(name => name.endsWith('.pk3'));
  assert.deepEqual(packages, [basename(manifest.file)]);
  const archive = await readFile(join(output, packages[0]));
  assert.equal(createHash('sha256').update(archive).digest('hex'), manifest.sha256);
  const extracted = extractPk3(archive);
  assert.deepEqual([...extracted.keys()], manifest.entries);
  assert.deepEqual(manifest.entries, [...manifest.entries].sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b))));
  assert.deepEqual(extracted.get('vm/qagame.qvm'), qvmData, 'the requested freshly built QVM is packaged');
  for (const required of ['scripts/guy.bot','botfiles/bots/guy_c.c','models/players/guy/lower.md3','models/players/guy/upper.md3','models/players/guy/head.md3','models/players/guy/animation.cfg','models/players/guy/icon_default.tga']) assert.ok(extracted.has(required), required);
  const icon = extracted.get('models/players/guy/icon_default.tga');
  assert.deepEqual([icon.readUInt16LE(12), icon.readUInt16LE(14), icon[16], icon[17]], [128,128,24,0x20]);
  const character = new TextDecoder().decode(extracted.get('botfiles/bots/guy_c.c'));
  assert.match(character, /CHARACTERISTIC_ITEMWEIGHTS "bots\/hunter_i\.c"/);
  assert.match(character, /CHARACTERISTIC_WEAPONWEIGHTS "bots\/hunter_w\.c"/);
  assert.match(character, /CHARACTERISTIC_CHAT_FILE "bots\/hunter_t\.c"/);
  assert.doesNotMatch(character, /"botfiles\//);
  for (const part of ['lower', 'upper', 'head']) {
    const name = `models/players/guy/${part}.md3`;
    validateMd3(extracted.get(name), part);
    assert.deepEqual(extracted.get(name), await readFile(join(guyModel, `${part}.md3`)));
  }

  execFileSync(process.execPath, [join(server, 'scripts', 'package-game.mjs')], { env, stdio: 'pipe' });
  const second = JSON.parse(await readFile(join(output, 'q3js-guy-manifest.json'), 'utf8'));
  assert.equal(second.sha256, manifest.sha256, 'identical inputs produce the same PK3');
  assert.deepEqual((await readdir(output)).filter(name => name.endsWith('.pk3')), packages);
});

test('GUY trust marker, loot guards, handicap, and fresh-QVM build wiring remain explicit', async () => {
  const bot = await readFile(join(game, 'q3js-assets', 'baseq3', 'scripts', 'guy.bot'), 'utf8');
  const combat = await readFile(join(game, 'engine', 'code', 'game', 'g_combat.c'), 'utf8');
  assert.match(bot, /q3jsGuy\s+"1"/);
  assert.match(combat, /SVF_BOT[\s\S]*GUY_MARKER/);
  assert.match(combat, /take <= 0[\s\S]*!attacker \|\| !attacker->client \|\| attacker == targ \|\|\s*!G_IsGuyBot\( targ \)[\s\S]*OnSameTeam\( targ, attacker \)/);
  assert.doesNotMatch(combat, /G_GuyDamageLoot[\s\S]{0,900}!G_IsGuyBot\( attacker \)/);
  assert.match(combat, /guyLootEligible = damage > 0 && targ->health > 0;/);
  assert.match(combat, /CheckArmor[\s\S]*G_GuyDamageLoot\( targ, attacker, guyLootEligible \? take : 0, mod \);[\s\S]*targ->health = targ->health - take/);
  assert.match(combat, /static unsigned int lastRollFrameTag\[MAX_CLIENTS\]/);
  assert.match(combat, /frameTag = \(unsigned int\)level\.time \+ 1u;[\s\S]*lastRollFrameTag\[victimNum\] == frameTag[\s\S]*lastRollFrameTag\[victimNum\] = frameTag/);
  assert.match(combat, /G_GuyHandicap[\s\S]*Info_ValueForKey\( userinfo, "handicap" \)[\s\S]*handicap < 1 \|\| handicap > 100[\s\S]*handicap = 100/);
  assert.match(combat, /max = attacker->client->ps\.stats\[STAT_MAX_HEALTH\];\s*if \( G_IsGuyBot\( attacker \) \) \{\s*max = G_GuyHandicap\( attacker \);/);
  const client = await readFile(join(game, 'engine', 'code', 'game', 'g_client.c'), 'utf8');
  assert.match(client, /ent->health = client->ps\.stats\[STAT_HEALTH\] = 200/);
  const botCode = await readFile(join(game, 'engine', 'code', 'game', 'g_bot.c'), 'utf8');
  assert.match(botCode, /Info_ValueForKey\( botinfo, "q3jsGuy" \)[\s\S]*Info_SetValueForKey\( userinfo, "q3jsGuy", "1" \)/);
  const packager = await readFile(join(server, 'scripts', 'package-game.mjs'), 'utf8');
  assert.match(packager, /Q3JS_GUY_OUTPUT_DIR/);
  assert.match(packager, /Buffer\.compare\(Buffer\.from\(a\.name, 'utf8'\), Buffer\.from\(b\.name, 'utf8'\)\)/);
  assert.doesNotMatch(packager, /localeCompare/);
  const build = await readFile(join(server, 'build.sh'), 'utf8');
  assert.match(build, /QAGAME_QVM="\$BUILD_DIR\/\$BUILD_TYPE\/baseq3\/vm\/qagame\.qvm"[\s\S]*\[\[ ! -f "\$QAGAME_QVM" \]\][\s\S]*QAGAME_QVM="\$QAGAME_QVM"[\s\S]*package-game\.mjs/);
  const dockerfile = await readFile(join(server, 'Dockerfile'), 'utf8');
  assert.match(dockerfile, /COPY game\/q3js-assets game\/q3js-assets/);
});
