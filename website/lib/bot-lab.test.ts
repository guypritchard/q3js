import assert from "node:assert/strict";
import test from "node:test";
import { BALANCED_BOT, BOT_ATTRIBUTES, createPk3, generateFiles, GUY_BOT, interpolateProfile, validateDraft } from "./bot-lab.ts";

const expectedKeys = [
  "name", "gender", "attackSkill", "weaponWeights", "viewFactor", "viewMaxChange", "reactionTime", "aimAccuracy",
  "aimAccuracyMachinegun", "aimAccuracyShotgun", "aimAccuracyRocketLauncher", "aimAccuracyGrenadeLauncher", "aimAccuracyLightning", "aimAccuracyPlasmagun", "aimAccuracyRailgun", "aimAccuracyBfg10k", "aimSkill",
  "aimSkillRocketLauncher", "aimSkillGrenadeLauncher", "aimSkillPlasmagun", "aimSkillBfg10k", "chatFile", "chatName", "chatCpm",
  "chatInsult", "chatMiscellaneous", "chatStartendlevel", "chatEnterexitgame", "chatKill", "chatDeath", "chatEnemysuicide", "chatHittalking", "chatHitwithoutdeath", "chatHitwithoutkill", "chatRandom", "chatReply",
  "croucher", "jumper", "weaponJumping", "grappleUser", "itemWeights", "aggression", "selfPreservation", "vengefulness", "camper", "easyFragger", "alertness", "fireThrottle", "walker",
];

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Minimal independent reader for stored ZIP entries; it does not use createPk3's layout assumptions. */
function extractZip(zip: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let eocd = zip.length - 22;
  while (eocd >= 0 && view.getUint32(eocd, true) !== 0x06054b50) eocd--;
  assert.ok(eocd >= 0, "ZIP end-of-central-directory exists");
  const count = view.getUint16(eocd + 10, true);
  let cursor = view.getUint32(eocd + 16, true);
  const extracted = new Map<string, Uint8Array>();
  for (let index = 0; index < count; index++) {
    assert.equal(view.getUint32(cursor, true), 0x02014b50, "central directory signature");
    const expectedCrc = view.getUint32(cursor + 16, true);
    const size = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = new TextDecoder().decode(zip.subarray(cursor + 46, cursor + 46 + nameLength));
    assert.equal(view.getUint32(localOffset, true), 0x04034b50, "local entry signature");
    assert.equal(view.getUint16(localOffset + 8, true), 0, "entry uses supported stored compression");
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const data = zip.slice(start, start + size);
    assert.equal(crc32(data), expectedCrc, `${name} CRC`);
    extracted.set(name, data);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  assert.equal(extracted.size, count);
  return extracted;
}

test("schema rejects unsafe paths and traversal", () => {
  assert.equal(validateDraft({ ...structuredClone(BALANCED_BOT), slug: "../evil" }).ok, false);
  assert.equal(validateDraft({ ...structuredClone(BALANCED_BOT), model: 'x";quit' }).ok, false);
  assert.equal(validateDraft({ ...structuredClone(BALANCED_BOT), itemWeights: "botfiles/items.c" }).ok, false);
  assert.equal(validateDraft(structuredClone(BALANCED_BOT)).ok, true);
});

test("separate-head syntax is valid only as one leading star on headModel", () => {
  const separate = { ...structuredClone(BALANCED_BOT), headModel: "*visor", headSkin: "blue" };
  assert.equal(validateDraft(separate).ok, true);
  assert.match(generateFiles(separate).bot, /^ headmodel "\*visor\/blue"$/m);
  for (const headModel of ["**visor", "vi*sor", "*"]) assert.equal(validateDraft({ ...separate, headModel }).ok, false, headModel);
  assert.equal(validateDraft({ ...separate, model: "*sarge" }).ok, false);
  assert.equal(validateDraft({ ...separate, weaponWeights: "*bots/hunter_w.c" }).ok, false);
});

test("GUY selects the installed stock sarge/default appearance", () => {
  assert.equal(GUY_BOT.model, "sarge");
  assert.equal(GUY_BOT.skin, "default");
  assert.equal(GUY_BOT.headModel, "");
});

test("skills 2 and 3 interpolate one and two thirds between 1 and 4", () => {
  const draft = structuredClone(BALANCED_BOT); draft.profiles[1][2] = 0; draft.profiles[4][2] = 0.9;
  assert.equal(interpolateProfile(draft, 2)[2], 0.3); assert.equal(interpolateProfile(draft, 3)[2], 0.6);
});

test("all characteristics exactly match authoritative chars.h IDs", () => {
  assert.equal(BOT_ATTRIBUTES.length, 49);
  assert.deepEqual(BOT_ATTRIBUTES.map(({ id }) => id).sort((a, b) => a - b), Array.from({ length: 49 }, (_, id) => id));
  assert.deepEqual(Object.fromEntries(BOT_ATTRIBUTES.map(({ id, key }) => [id, key])), Object.fromEntries(expectedKeys.map((key, id) => [id, key])));
  assert.equal(BOT_ATTRIBUTES[40].resource, "itemWeights");
});

test("text generation is deterministic and preserves float syntax", () => {
  const first = generateFiles(structuredClone(BALANCED_BOT)); const second = generateFiles(structuredClone(BALANCED_BOT));
  assert.deepEqual(first, second); assert.match(first.character, /\n 2 \d+\.\d+/); assert.equal(first.botPath, "scripts/arena_bot.bot");
  assert.equal(first.characterPath, "botfiles/bots/arena_bot_c.c"); assert.match(first.bot, /^ aifile "bots\/arena_bot_c\.c"$/m);
  for (let id = 0; id <= 48; id++) assert.equal((first.character.match(new RegExp(`^ ${id} `, "gm")) ?? []).length, 3, `attribute ${id} generated for every profile`);
  assert.match(first.character, /^ 21 "bots\/hunter_t\.c"$/m);
  assert.match(first.character, /^ 40 "bots\/hunter_i\.c"$/m);
});

test("all generated and implied QPATHs stay below MAX_QPATH", () => {
  const longestSlug = { ...structuredClone(BALANCED_BOT), slug: "a".repeat(45) };
  assert.equal(validateDraft(longestSlug).ok, true);
  assert.equal(validateDraft({ ...longestSlug, slug: "a".repeat(46) }).ok, false);
  assert.equal(validateDraft({ ...structuredClone(BALANCED_BOT), model: "m".repeat(40) }).ok, false);
  assert.equal(validateDraft({ ...structuredClone(BALANCED_BOT), skin: "s".repeat(40) }).ok, false);
  assert.throws(() => createPk3([{ name: `scripts/${"a".repeat(52)}.bot`, content: "x" }]), /shorter than 64 bytes/);
});

test("an independent ZIP reader extracts PK3 names, content, and valid CRCs", () => {
  const files = generateFiles(structuredClone(BALANCED_BOT));
  const first = createPk3([{ name: files.botPath, content: files.bot }, { name: files.characterPath, content: files.character }]);
  const second = createPk3([{ name: files.characterPath, content: files.character }, { name: files.botPath, content: files.bot }]);
  assert.deepEqual(first, second);
  const extracted = extractZip(first);
  assert.deepEqual([...extracted.keys()].sort(), [files.botPath, files.characterPath].sort());
  assert.equal(new TextDecoder().decode(extracted.get(files.botPath)), files.bot);
  assert.equal(new TextDecoder().decode(extracted.get(files.characterPath)), files.character);
});
