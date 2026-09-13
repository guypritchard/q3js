export const BOT_LAB_SCHEMA = 1 as const;
export const MAX_QPATH = 64;

export type Gender = "male" | "female" | "neuter";
export type Skill = 1 | 4 | 5;

export type BotAttribute = {
  id: number;
  key: string;
  label: string;
  group: "Combat & perception" | "Weapon aim" | "Chat" | "Movement & behavior" | "Resources";
  min: number;
  max: number;
  step: number;
  unused?: boolean;
  resource?: "name" | "gender" | "weaponWeights" | "itemWeights" | "chatFile" | "chatName";
};

const attribute = (id: number, key: string, label: string, group: BotAttribute["group"], min = 0, max = 1, step = 0.01, unused = false): BotAttribute => ({ id, key, label, group, min, max, step, unused });

export const BOT_ATTRIBUTES: readonly BotAttribute[] = [
  { ...attribute(0, "name", "Character name", "Resources"), resource: "name" },
  { ...attribute(1, "gender", "Gender", "Resources"), resource: "gender" },
  attribute(2, "attackSkill", "Attack skill", "Combat & perception"),
  { ...attribute(3, "weaponWeights", "Weapon weights file", "Resources"), resource: "weaponWeights" },
  attribute(4, "viewFactor", "View factor", "Combat & perception", 0.01),
  attribute(5, "viewMaxChange", "Maximum view change", "Combat & perception", 1, 360, 1),
  attribute(6, "reactionTime", "Reaction time", "Combat & perception", 0, 5),
  attribute(7, "aimAccuracy", "General accuracy", "Weapon aim"),
  attribute(8, "aimAccuracyMachinegun", "Machinegun accuracy", "Weapon aim"),
  attribute(9, "aimAccuracyShotgun", "Shotgun accuracy", "Weapon aim"),
  attribute(10, "aimAccuracyRocketLauncher", "Rocket accuracy", "Weapon aim"),
  attribute(11, "aimAccuracyGrenadeLauncher", "Grenade accuracy", "Weapon aim"),
  attribute(12, "aimAccuracyLightning", "Lightning accuracy", "Weapon aim"),
  attribute(13, "aimAccuracyPlasmagun", "Plasma accuracy", "Weapon aim"),
  attribute(14, "aimAccuracyRailgun", "Railgun accuracy", "Weapon aim"),
  attribute(15, "aimAccuracyBfg10k", "BFG10K accuracy", "Weapon aim"),
  attribute(16, "aimSkill", "General aim skill", "Weapon aim"),
  attribute(17, "aimSkillRocketLauncher", "Rocket aim skill", "Weapon aim"),
  attribute(18, "aimSkillGrenadeLauncher", "Grenade aim skill", "Weapon aim"),
  attribute(19, "aimSkillPlasmagun", "Plasma aim skill", "Weapon aim"),
  attribute(20, "aimSkillBfg10k", "BFG aim skill", "Weapon aim"),
  { ...attribute(21, "chatFile", "Chat file", "Resources"), resource: "chatFile" },
  { ...attribute(22, "chatName", "Chat name", "Resources"), resource: "chatName" },
  attribute(23, "chatCpm", "Characters per minute", "Chat", 1, 4000, 1),
  ...["Insult", "Miscellaneous", "Start/end level", "Enter/exit game", "Kill", "Death", "Enemy suicide", "Hit talking", "Hit without death", "Hit without kill", "Random", "Reply"].map((label, index) => attribute(24 + index, `chat${label.replace(/[^A-Za-z]/g, "")}`, label, "Chat")),
  attribute(36, "croucher", "Croucher", "Movement & behavior"),
  attribute(37, "jumper", "Jumper", "Movement & behavior"),
  attribute(38, "weaponJumping", "Weapon jumping", "Movement & behavior"),
  attribute(39, "grappleUser", "Grapple user", "Movement & behavior"),
  { ...attribute(40, "itemWeights", "Item weights file", "Resources"), resource: "itemWeights" },
  attribute(41, "aggression", "Aggression", "Movement & behavior"),
  attribute(42, "selfPreservation", "Self preservation", "Movement & behavior"),
  attribute(43, "vengefulness", "Vengefulness", "Movement & behavior"),
  attribute(44, "camper", "Camper", "Movement & behavior"),
  attribute(45, "easyFragger", "Easy fragger", "Movement & behavior"),
  attribute(46, "alertness", "Alertness", "Combat & perception"),
  attribute(47, "fireThrottle", "Fire throttle", "Combat & perception"),
  attribute(48, "walker", "Walker", "Movement & behavior"),
] as const;

export type BotDraft = {
  schema: typeof BOT_LAB_SCHEMA;
  slug: string;
  displayName: string;
  gender: Gender;
  model: string;
  skin: string;
  headModel: string;
  headSkin: string;
  color1: number;
  color2: number;
  spawnSkill: 1 | 2 | 3 | 4 | 5;
  weaponWeights: string;
  itemWeights: string;
  chatFile: string;
  chatName: string;
  profiles: Record<Skill, Record<number, number>>;
  metadata?: { note?: string };
};

const numericAttributes = BOT_ATTRIBUTES.filter((item) => !item.resource && item.id > 1);

function values(level: Skill): Record<number, number> {
  return Object.fromEntries(numericAttributes.map((item) => {
    const strength = level === 1 ? 0.25 : level === 4 ? 0.7 : 0.9;
    const inverse = item.id === 6;
    const value = inverse ? item.max - (item.max - item.min) * strength : item.min + (item.max - item.min) * strength;
    return [item.id, Number(value.toFixed(item.step >= 1 ? 0 : 2))];
  }));
}

export const BALANCED_BOT: BotDraft = {
  schema: 1, slug: "arena_bot", displayName: "^2Arena ^7Bot", gender: "neuter",
  model: "sarge", skin: "default", headModel: "", headSkin: "", color1: 2, color2: 5, spawnSkill: 3,
  weaponWeights: "bots/hunter_w.c", itemWeights: "bots/hunter_i.c", chatFile: "bots/hunter_t.c", chatName: "hunter",
  profiles: { 1: values(1), 4: values(4), 5: values(5) },
};

export const GUY_BOT: BotDraft = {
  ...structuredClone(BALANCED_BOT), slug: "guy", displayName: "^1G^2U^4Y", gender: "male", model: "sarge", skin: "default", spawnSkill: 5,
  metadata: { note: "On Q3JS servers GUY has built-in 200 health/drop behavior. Standard exports intentionally contain no promise of those server-only traits." },
};

export function interpolateProfile(draft: BotDraft, skill: 1 | 2 | 3 | 4 | 5): Record<number, number> {
  if (skill === 1 || skill === 4 || skill === 5) return { ...draft.profiles[skill] };
  const ratio = skill === 2 ? 1 / 3 : 2 / 3;
  return Object.fromEntries(numericAttributes.map(({ id }) => [id, Number((draft.profiles[1][id] + (draft.profiles[4][id] - draft.profiles[1][id]) * ratio).toFixed(4))]));
}

const SAFE = /^[a-z0-9_]+$/;
const QPATH = /^[A-Za-z0-9_.\/-]+$/;
const forbidden = /[\x00-\x1f\x7f";]/;
const encoder = new TextEncoder();

function qpathBytes(value: string): number {
  return encoder.encode(value).length;
}

function validateQpath(errors: string[], label: string, value: unknown, required: boolean, allowSeparateHead = false): value is string {
  if (typeof value !== "string" || (required && !value)) {
    errors.push(`${label} is required and must be a QPATH.`);
    return false;
  }
  if (!value) return true;
  const qpath = allowSeparateHead && value.startsWith("*") ? value.slice(1) : value;
  if (!qpath || forbidden.test(value) || !QPATH.test(qpath) || qpath.includes("*") || qpath.includes("..") || qpath.startsWith("/") || qpathBytes(value) >= MAX_QPATH) {
    errors.push(`${label} must be a safe ASCII QPATH shorter than ${MAX_QPATH} bytes.`);
    return false;
  }
  return true;
}

function validateBotResource(errors: string[], label: string, value: unknown): void {
  if (validateQpath(errors, label, value, true) && value.startsWith("botfiles/")) {
    errors.push(`${label} is relative to botfiles/ and must not include that prefix.`);
  }
}

function validateComposedQpath(errors: string[], label: string, value: string): void {
  if (qpathBytes(value) >= MAX_QPATH) errors.push(`${label} resolves to “${value}” (${qpathBytes(value)} bytes); Quake QPATHs must be shorter than ${MAX_QPATH} bytes.`);
}

export function validateDraft(input: unknown): { ok: true; value: BotDraft } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, errors: ["Draft must be a JSON object."] };
  const draft = input as Partial<BotDraft>;
  if (draft.schema !== BOT_LAB_SCHEMA) errors.push("Unsupported Bot Lab schema.");
  if (typeof draft.slug !== "string" || !SAFE.test(draft.slug) || draft.slug.length > 45) errors.push("Slug must be 1-45 lowercase ASCII letters, numbers, or underscores (the generated character QPATH must stay below 64 bytes).");
  if (typeof draft.displayName !== "string" || !draft.displayName || draft.displayName.length > 64 || forbidden.test(draft.displayName)) errors.push("Display name must be 1-64 safe characters (Quake color codes are allowed).");
  const modelOk = validateQpath(errors, "Model", draft.model, true);
  const skinOk = validateQpath(errors, "Skin", draft.skin, true);
  const headModelOk = validateQpath(errors, "Head model", draft.headModel, false, true);
  const headSkinOk = validateQpath(errors, "Head skin", draft.headSkin, false);
  validateBotResource(errors, "Weapon weights", draft.weaponWeights);
  validateBotResource(errors, "Item weights", draft.itemWeights);
  validateBotResource(errors, "Chat file", draft.chatFile);
  if (typeof draft.chatName !== "string" || !draft.chatName || forbidden.test(draft.chatName) || !QPATH.test(draft.chatName)) errors.push("Chat name must be a non-empty safe ASCII game value.");
  if (typeof draft.slug === "string" && SAFE.test(draft.slug)) {
    validateComposedQpath(errors, "Generated bot file", `scripts/${draft.slug}.bot`);
    validateComposedQpath(errors, "Generated character file", `botfiles/bots/${draft.slug}_c.c`);
  }
  if (modelOk && skinOk) {
    validateComposedQpath(errors, "Model/skin reference", `${draft.model}/${draft.skin}`);
    for (const file of [`models/players/${draft.model}/lower.md3`, `models/players/${draft.model}/upper.md3`, `models/players/${draft.model}/head.md3`, `models/players/${draft.model}/lower_${draft.skin}.skin`, `models/players/${draft.model}/upper_${draft.skin}.skin`, `models/players/${draft.model}/head_${draft.skin}.skin`, `models/players/${draft.model}/icon_${draft.skin}.tga`]) validateComposedQpath(errors, "Referenced player asset", file);
  }
  if (headModelOk && headSkinOk && draft.headModel) {
    const headModel = draft.headModel.startsWith("*") ? draft.headModel.slice(1) : draft.headModel;
    const headSkin = draft.headSkin || "default";
    validateComposedQpath(errors, "Head model/skin reference", `${draft.headModel}/${headSkin}`);
    const headFiles = draft.headModel.startsWith("*")
      ? [`models/players/heads/${headModel}/${headModel}.md3`, `models/players/heads/${headModel}/${headModel}_${headSkin}.skin`]
      : [`models/players/${headModel}/head.md3`, `models/players/${headModel}/head_${headSkin}.skin`];
    for (const file of headFiles) validateComposedQpath(errors, "Referenced head asset", file);
  }
  if (!(["male", "female", "neuter"] as unknown[]).includes(draft.gender)) errors.push("Gender is invalid.");
  if (![1, 2, 3, 4, 5].includes(draft.spawnSkill ?? 0)) errors.push("Spawn skill is invalid.");
  for (const field of ["color1", "color2"] as const) if (!Number.isInteger(draft[field]) || (draft[field] ?? -1) < 0 || (draft[field] ?? 99) > 7) errors.push(`${field} must be an integer from 0 to 7.`);
  for (const skill of [1, 4, 5] as const) for (const item of numericAttributes) {
    const value = draft.profiles?.[skill]?.[item.id];
    if (typeof value !== "number" || !Number.isFinite(value) || value < item.min || value > item.max) errors.push(`Skill ${skill}, attribute ${item.id} must be ${item.min}-${item.max}.`);
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: draft as BotDraft };
}

const float = (value: number) => Number.isInteger(value) ? `${value}.0` : value.toFixed(4).replace(/0+$/, "").replace(/\.$/, ".0");

export function generateFiles(draft: BotDraft): { botPath: string; characterPath: string; bot: string; character: string } {
  const checked = validateDraft(draft);
  if (!checked.ok) throw new Error(checked.errors.join("\n"));
  const model = `${draft.model}/${draft.skin}`;
  const head = draft.headModel ? `${draft.headModel}/${draft.headSkin || "default"}` : model;
  const characterPath = `botfiles/bots/${draft.slug}_c.c`;
  const bot = `{\n name "${draft.slug}"\n funname "${draft.displayName}"\n model "${model}"\n headmodel "${head}"\n gender "${draft.gender}"\n color1 "${draft.color1}"\n color2 "${draft.color2}"\n aifile "bots/${draft.slug}_c.c"\n}\n`;
  const special: Record<number, string> = { 0: draft.displayName, 1: draft.gender, 3: draft.weaponWeights, 21: draft.chatFile, 22: draft.chatName, 40: draft.itemWeights };
  const character = [1, 4, 5].map((skill) => `skill ${skill}\n{\n${BOT_ATTRIBUTES.map((item) => ` ${item.id} ${item.id in special ? `"${special[item.id]}"` : float(draft.profiles[skill as Skill][item.id])}`).join("\n")}\n}`).join("\n\n") + "\n";
  if (new TextEncoder().encode(bot).length >= 1024) throw new Error("Generated bot info record must be under 1024 bytes.");
  if (new TextEncoder().encode(character).length >= 8192) throw new Error("Generated character file must be under 8192 bytes.");
  return { botPath: `scripts/${draft.slug}.bot`, characterPath, bot, character };
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
  return (crc ^ 0xffffffff) >>> 0;
}

const u16 = (value: number) => [value & 255, value >>> 8 & 255];
const u32 = (value: number) => [...u16(value), ...u16(value >>> 16)];

export function createPk3(entries: readonly { name: string; content: string }[]): Uint8Array {
  const local: number[] = []; const central: number[] = []; let offset = 0;
  for (const entry of [...entries].sort((a, b) => a.name.localeCompare(b.name))) {
    if (!QPATH.test(entry.name) || entry.name.includes("..") || entry.name.startsWith("/") || qpathBytes(entry.name) >= MAX_QPATH) throw new Error(`PK3 entry “${entry.name}” must be a safe QPATH shorter than ${MAX_QPATH} bytes.`);
    const name = encoder.encode(entry.name); const data = encoder.encode(entry.content); const crc = crc32(data);
    local.push(...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...name, ...data);
    central.push(...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...name);
    offset = local.length;
  }
  return new Uint8Array([...local, ...central, ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(entries.length), ...u16(entries.length), ...u32(central.length), ...u32(local.length), ...u16(0)]);
}

export async function pk3Filename(slug: string, bytes: Uint8Array): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", bytes.slice().buffer);
    const prefix = [...new Uint8Array(digest)].slice(0, 6).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${slug}-${prefix}.pk3`;
  }
  let hash = 2166136261; for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619);
  return `${slug}-fnv${(hash >>> 0).toString(16).padStart(8, "0")}.pk3`;
}
