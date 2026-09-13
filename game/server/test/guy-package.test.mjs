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

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
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
  for (const required of ['scripts/guy.bot', 'botfiles/bots/guy_c.c']) assert.ok(extracted.has(required), required);
  assert.ok(!manifest.entries.some(name => name.startsWith('models/players/guy/')), 'generated GUY model assets are not packaged');
  const bot = new TextDecoder().decode(extracted.get('scripts/guy.bot'));
  assert.match(bot, /model\s+"sarge\/default"/);
  assert.match(bot, /q3jsGuy\s+"1"/);
  const character = new TextDecoder().decode(extracted.get('botfiles/bots/guy_c.c'));
  assert.match(character, /CHARACTERISTIC_ITEMWEIGHTS "bots\/hunter_i\.c"/);
  assert.match(character, /CHARACTERISTIC_WEAPONWEIGHTS "bots\/hunter_w\.c"/);
  assert.match(character, /CHARACTERISTIC_CHAT_FILE "bots\/hunter_t\.c"/);
  assert.doesNotMatch(character, /"botfiles\//);
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
