import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const output = process.argv[2];
if (!output) throw new Error("Usage: generate-map.mjs <output.map>");

function material(texture, scaleX = 0.5, scaleY = scaleX, rotation = 0, shiftX = 0, shiftY = 0) {
  return { texture, scaleX, scaleY, rotation, shiftX, shiftY };
}

function wrapShift(value, textureSize) {
  const wrapped = value % textureSize;
  return Number((wrapped < 0 ? wrapped + textureSize : wrapped).toFixed(3));
}

function centeredTopMaterial(texture, centerX, centerY, width, height, textureSize = 256) {
  const scaleX = width / textureSize;
  const scaleY = height / textureSize;
  return material(
    texture,
    scaleX,
    scaleY,
    0,
    wrapShift(textureSize / 2 - centerX / scaleX, textureSize),
    wrapShift(textureSize / 2 + centerY / scaleY, textureSize),
  );
}

function centeredWallMaterial(texture, centerX, centerZ, width, height, textureSize = 256) {
  const scaleX = width / textureSize;
  const scaleY = height / textureSize;
  return material(
    texture,
    scaleX,
    scaleY,
    0,
    wrapShift(textureSize / 2 - centerX / scaleX, textureSize),
    wrapShift(textureSize / 2 + centerZ / scaleY, textureSize),
  );
}

function face(points, surface) {
  const { texture, scaleX, scaleY, rotation, shiftX, shiftY } = surface;
  return `${points.map((point) => `( ${point.join(" ")} )`).join(" ")} ${texture} ${shiftX} ${shiftY} ${rotation} ${scaleX} ${scaleY}`;
}

function brush([x1, y1, z1, x2, y2, z2], surfaces) {
  const fallback = typeof surfaces === "string"
    ? material(surfaces)
    : surfaces.texture
      ? surfaces
      : surfaces.all ?? material("common/caulk");
  const surface = (side) => surfaces[side] ?? fallback;
  return [
    "{",
    face([[x1, y1, z1], [x1, y2, z1], [x1, y2, z2]], surface("west")),
    face([[x2, y1, z1], [x2, y1, z2], [x2, y2, z2]], surface("east")),
    face([[x1, y1, z1], [x1, y1, z2], [x2, y1, z2]], surface("south")),
    face([[x1, y2, z1], [x2, y2, z1], [x2, y2, z2]], surface("north")),
    face([[x1, y1, z1], [x2, y1, z1], [x2, y2, z1]], surface("bottom")),
    face([[x1, y1, z2], [x1, y2, z2], [x2, y2, z2]], surface("top")),
    "}",
  ].join("\n");
}

const CAULK = material("common/caulk");
const SKY = material("skies/skybox", 1);
const FLOOR = material("base_floor/clang_floor", 1);
const TRIM = material("base_trim/pewter_shiney", 0.75);
const DECK = { all: TRIM, top: FLOOR };

function entity(properties, brushes = []) {
  return [
    "{",
    ...Object.entries(properties).map(([key, value]) => `"${key}" "${value}"`),
    ...brushes,
    "}",
  ].join("\n");
}

const worldBrushes = [
  brush([-1400, -900, -48, 1400, 900, 0], { all: CAULK, top: FLOOR }),
  brush([-1400, -900, 640, 1400, 900, 672], SKY),
  brush([-1432, -900, 0, -1400, 900, 640], SKY),
  brush([1400, -900, 0, 1432, 900, 640], SKY),
  brush([-1400, -932, 0, 1400, -900, 640], SKY),
  brush([-1400, 900, 0, 1400, 932, 640], SKY),

  // Floating decks turn the hub into a movement playground without blocking sightlines.
  brush([-320, -260, 224, 320, 260, 248], DECK),
  brush([-980, -310, 152, -540, 310, 176], DECK),
  brush([540, -310, 152, 980, 310, 176], DECK),
  brush([-360, 470, 152, 360, 710, 176], DECK),
  brush([-360, -710, 152, 360, -470, 176], DECK),

  // Slim supports and illuminated trim give the open decks an arena silhouette.
  brush([-300, -240, 0, -260, -200, 224], TRIM),
  brush([260, -240, 0, 300, -200, 224], TRIM),
  brush([-300, 200, 0, -260, 240, 224], TRIM),
  brush([260, 200, 0, 300, 240, 224], TRIM),
];

const entities = [
  entity({
    classname: "worldspawn",
    message: "Q3JS Transit Hub // Safe Social Arena",
    music: "music/sonic1",
  }, worldBrushes),
  entity({ classname: "info_player_intermission", origin: "0 -120 430", angles: "18 90 0" }),
  entity({ classname: "light", origin: "0 0 540", light: "1400", _color: "0.3 0.55 1" }),
  entity({ classname: "light", origin: "-850 0 390", light: "850", _color: "0.05 0.8 1" }),
  entity({ classname: "light", origin: "850 0 390", light: "850", _color: "1 0.35 0.08" }),
  entity({ classname: "light", origin: "0 600 390", light: "700", _color: "0.65 0.2 1" }),
  entity({ classname: "light", origin: "0 -600 390", light: "700", _color: "0.15 1 0.55" }),
  entity({ classname: "light", origin: "0 0 105", light: "650", _color: "0.1 0.75 1" }),
  entity({ classname: "light", origin: "-760 0 90", light: "420", _color: "0.05 0.8 1" }),
  entity({ classname: "light", origin: "760 0 90", light: "420", _color: "1 0.3 0.05" }),
  entity({ classname: "light", origin: "0 580 90", light: "420", _color: "0.6 0.15 1" }),
  entity({ classname: "light", origin: "0 -580 90", light: "420", _color: "0.1 1 0.5" }),
];

const spawnPoints = [
  [-1220, -650, 32, 35], [-900, -650, 32, 55], [-580, -650, 32, 70],
  [580, -650, 32, 110], [900, -650, 32, 125], [1220, -650, 32, 145],
  [-1220, 650, 32, 325], [-900, 650, 32, 305], [-580, 650, 32, 290],
  [580, 650, 32, 250], [900, 650, 32, 235], [1220, 650, 32, 215],
  [-1220, 0, 32, 0], [1220, 0, 32, 180],
  [-430, -360, 32, 55], [430, -360, 32, 125], [-430, 360, 32, 305], [430, 360, 32, 235],
  [-180, 0, 280, 0], [180, 0, 280, 180],
];
for (const [x, y, z, angle] of spawnPoints) {
  entities.push(entity({ classname: "info_player_deathmatch", origin: `${x} ${y} ${z}`, angle }));
}

const portalX = [-1120, -800, -480, -160, 160, 480, 800, 1120];
for (let slot = 0; slot < 16; slot += 1) {
  const north = slot < 8;
  const x = portalX[slot % 8];
  const y = north ? 815 : -815;
  const triggerBounds = north
    ? [x - 110, 760, 0, x + 110, 865, 250]
    : [x - 110, -865, 0, x + 110, -760, 250];
  const panelBounds = north
    ? [x - 120, 866, 8, x + 120, 896, 256]
    : [x - 120, -896, 8, x + 120, -866, 256];

  const portalMaterial = centeredWallMaterial("base_door/shinymetaldoor", x, 132, 240, 248);
  worldBrushes.push(brush(panelBounds, {
    all: TRIM,
    north: portalMaterial,
    south: portalMaterial,
  }));
  entities.push(
    entity({
      classname: "target_print",
      targetname: `portal_${slot}`,
      message: `Q3JS_PORTAL_${slot}`,
      spawnflags: "4",
    }),
    entity({ classname: "misc_q3js_portal", origin: `${x} ${y} 170`, count: slot }),
    entity(
      { classname: "trigger_multiple", target: `portal_${slot}`, wait: "2" },
      [brush(triggerBounds, "common/trigger")],
    ),
    entity({
      classname: "light",
      origin: `${x} ${north ? 745 : -745} 310`,
      light: "260",
      _color: slot % 2 === 0 ? "0.05 0.8 1" : "1 0.35 0.08",
    }),
  );
}

function launchPad(id, [x, y, z], [targetX, targetY, targetZ]) {
  const padMaterial = centeredTopMaterial("sfx/clangdark_bounce", x, y, 128, 128);
  worldBrushes.push(brush(
    [x - 64, y - 64, z - 8, x + 64, y + 64, z],
    { all: TRIM, bottom: CAULK, top: padMaterial },
  ));
  entities.push(
    entity(
      { classname: "trigger_push", target: `jump_apex_${id}` },
      [brush([x - 58, y - 58, z, x + 58, y + 58, z + 36], "common/trigger")],
    ),
    entity({
      classname: "target_position",
      targetname: `jump_apex_${id}`,
      origin: `${targetX} ${targetY} ${targetZ}`,
    }),
    entity({ classname: "light", origin: `${x} ${y} ${z + 54}`, light: "220", _color: "0.2 0.9 1" }),
  );
}

// Four floor pads converge on the high central deck.
launchPad("southwest", [-1080, -520, 8], [-520, -250, 500]);
launchPad("southeast", [1080, -520, 8], [520, -250, 500]);
launchPad("northwest", [-1080, 520, 8], [-520, 250, 500]);
launchPad("northeast", [1080, 520, 8], [520, 250, 500]);

// Central pads throw players onto the four surrounding decks and back into the crowd.
launchPad("west", [-230, 0, 256], [-500, 0, 520]);
launchPad("east", [230, 0, 256], [500, 0, 520]);
launchPad("north", [0, 190, 256], [0, 430, 520]);
launchPad("south", [0, -190, 256], [0, -430, 520]);

// Rebuild worldspawn after portal panels have been appended.
entities[0] = entity({
  classname: "worldspawn",
  message: "Q3JS Transit Hub // Safe Social Arena",
  music: "music/sonic1",
}, worldBrushes);

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `// Generated by generate-map.mjs\n${entities.join("\n")}\n`);
