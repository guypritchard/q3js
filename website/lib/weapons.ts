export type WeaponRange = "Melee" | "Close" | "Mid" | "Long";

export interface WeaponModel {
  file: string;
  attachments?: readonly { file: string; tag: string }[];
  compositeAlpha?: boolean;
  fallbackTexture: string;
  textures: Readonly<Record<string, string>>;
  label: string;
}

export interface Weapon {
  slug: string;
  name: string;
  shortName: string;
  number: number;
  meansOfDeath: readonly number[];
  range: WeaponRange;
  damage: string;
  fireRate: string;
  dps: string;
  projectileSpeed: string;
  ammo: string;
  accent: string;
  intro: string;
  overview: string;
  bestFor: readonly string[];
  techniques: readonly { title: string; body: string }[];
  counters: readonly { title: string; body: string }[];
  model: WeaponModel;
}

const asset = (slug: string, file: string) => `/assets/weapons/${slug}/${file}`;

export const weapons = [
  {
    slug: "gauntlet",
    name: "Gauntlet",
    shortName: "GAUNTLET",
    number: 1,
    meansOfDeath: [2],
    range: "Melee",
    damage: "50",
    fireRate: "2.5 / sec",
    dps: "125",
    projectileSpeed: "Instant contact",
    ammo: "Unlimited",
    accent: "#f1c84b",
    intro: "No ammo. No distance. No excuses.",
    overview: "The Gauntlet is every player's permanent last resort and the loudest possible flex. Its short trace hits for 50 damage, but getting close enough against an armed opponent is the real challenge. Use movement, corners, and spawn timing to turn a desperate tool into a humiliating finish.",
    bestFor: ["Silent corner traps", "Finishing weak opponents", "Ammo-free spawn pressure"],
    techniques: [
      { title: "Cut the corner", body: "Hide the approach and begin the swing before you clear the edge. The trace lands the moment a target enters reach." },
      { title: "Ride their movement", body: "Strafe with the opponent instead of chasing their crosshair. Matching direction keeps you in contact for the follow-up hit." },
      { title: "Make noise useful", body: "The motor announces your position. Rev it deliberately to force a rushed escape into a teammate or a prepared firing lane." },
    ],
    counters: [
      { title: "Keep one body length", body: "A single clean backward strafe denies the trace. Do not let a doorway remove your escape route." },
      { title: "Use knockback", body: "Rockets, plasma, and lightning all break contact while dealing damage. Aim low enough to push the attacker away." },
    ],
    model: {
      file: asset("gauntlet", "gauntlet.md3"),
      attachments: [{ file: asset("gauntlet", "gauntlet_barrel.md3"), tag: "tag_barrel" }],
      fallbackTexture: asset("gauntlet", "gauntlet1.jpg"),
      textures: {
        gauntlet1: asset("gauntlet", "gauntlet1.jpg"),
        gauntlet2: asset("gauntlet", "gauntlet2.png"),
        gauntlet3: asset("gauntlet", "gauntlet3.jpg"),
        gauntlet4: asset("gauntlet", "gauntlet4.jpg"),
      },
      label: "Original Quake III Gauntlet model",
    },
  },
  {
    slug: "machinegun",
    name: "Machinegun",
    shortName: "MACHINEGUN",
    number: 2,
    meansOfDeath: [3],
    range: "Mid",
    damage: "7 / bullet",
    fireRate: "10 / sec",
    dps: "70",
    projectileSpeed: "Hitscan",
    ammo: "Bullets",
    accent: "#d6a65a",
    intro: "Reliable pressure from the first second.",
    overview: "The default spawn weapon is accurate enough to matter at every practical distance. Seven damage per bullet looks modest, but steady tracking converts it into dependable pressure, clean finishes, and item denial while you route toward stronger weapons.",
    bestFor: ["Long-range chip damage", "Finishing low-health targets", "Contesting item pickups"],
    techniques: [
      { title: "Lead with tracking", body: "Hold the crosshair through the target rather than flicking at each shot. The fixed rhythm rewards smooth, sustained aim." },
      { title: "Finish the stack", body: "Switch to the Machinegun when a rail or rocket leaves an opponent weak. It removes the risk of waiting through a heavy weapon reload." },
      { title: "Deny the exit", body: "At range, aim where the opponent must cross. Even one bullet resets momentum and reveals the route they chose." },
    ],
    counters: [
      { title: "Break line of sight", body: "Its damage depends on exposure time. Move between hard cover instead of taking a long open duel." },
      { title: "Force burst damage", body: "Close decisively with shotgun or rockets, or answer from range with rail. Do not trade slow chip damage on equal terms." },
    ],
    model: {
      file: asset("machinegun", "machinegun.md3"),
      attachments: [{ file: asset("machinegun", "machinegun_barrel.md3"), tag: "tag_barrel" }],
      fallbackTexture: asset("machinegun", "machinegun.jpg"),
      textures: { machinegun: asset("machinegun", "machinegun.jpg") },
      label: "Original Quake III Machinegun model",
    },
  },
  {
    slug: "shotgun",
    name: "Shotgun",
    shortName: "SHOTGUN",
    number: 3,
    meansOfDeath: [1],
    range: "Close",
    damage: "10 × 11 pellets",
    fireRate: "1 / sec",
    dps: "Up to 110",
    projectileSpeed: "Hitscan spread",
    ammo: "Shells",
    accent: "#e6c28c",
    intro: "One blast can end the argument.",
    overview: "Eleven pellets leave the barrel in a deterministic spread, each dealing 10 damage. At point-blank range that is enough to erase a fresh spawn, while at distance the same spread makes the Shotgun a useful finisher rather than a primary dueling tool.",
    bestFor: ["Point-blank burst damage", "Doorway ambushes", "Reliable finishing shots"],
    techniques: [
      { title: "Center the pattern", body: "Aim at the chest so the outer pellets remain on the model. Headshots do not add damage in Quake III." },
      { title: "Peek on rhythm", body: "Expose yourself only for the blast, then use the one-second reload behind cover. The weapon is built for discrete trades." },
      { title: "Swap after splash", body: "A direct rocket followed by an immediate Shotgun blast is often faster and safer than waiting for a second rocket." },
    ],
    counters: [
      { title: "Open the distance", body: "Every step away spreads the pellet pattern over more empty space. Long sightlines sharply reduce its ceiling." },
      { title: "Punish the reload", body: "The full second between shots is your attack window. Push after the blast, not before it." },
    ],
    model: {
      file: asset("shotgun", "shotgun.md3"),
      fallbackTexture: asset("shotgun", "shotgun.jpg"),
      textures: {
        shotgun_laser: asset("shotgun", "shotgun_laser.jpg"),
        shotgun: asset("shotgun", "shotgun.jpg"),
      },
      label: "Original Quake III Shotgun model",
    },
  },
  {
    slug: "grenade-launcher",
    name: "Grenade Launcher",
    shortName: "GRENADE",
    number: 4,
    meansOfDeath: [4, 5],
    range: "Mid",
    damage: "100 direct / splash",
    fireRate: "1.25 / sec",
    dps: "125",
    projectileSpeed: "700 ups",
    ammo: "Grenades",
    accent: "#6db65d",
    intro: "Control the route before they take it.",
    overview: "Grenades arc, bounce, and detonate after 2.5 seconds if they do not hit a target first. That delayed threat makes the launcher a prediction and area-control weapon: fill a doorway, punish a chase, or bank a shot into a room before you expose yourself.",
    bestFor: ["Area denial", "Bank shots around cover", "Breaking predictable chases"],
    techniques: [
      { title: "Bank the unseen shot", body: "Use walls and door frames to place damage where direct-fire weapons cannot reach. Listen for the bounce to read the path." },
      { title: "Layer the floor", body: "Stagger grenades across an exit rather than stacking them in one spot. Separate timers keep the lane dangerous longer." },
      { title: "Fire behind the push", body: "When an opponent rushes, send the grenade past them. Retreating now means crossing the explosion they just ignored." },
    ],
    counters: [
      { title: "Take vertical space", body: "The arc and bounce are easiest to predict on the floor. Ledges and jump pads reduce the useful splash area." },
      { title: "Do not chase the trail", body: "A retreating launcher user wants you inside the delayed explosions. Pause, reroute, or attack from another angle." },
    ],
    model: {
      file: asset("grenade-launcher", "grenadel.md3"),
      fallbackTexture: asset("grenade-launcher", "grenadel.jpg"),
      textures: { grenadel: asset("grenade-launcher", "grenadel.jpg") },
      label: "Original Quake III Grenade Launcher model",
    },
  },
  {
    slug: "rocket-launcher",
    name: "Rocket Launcher",
    shortName: "ROCKET",
    number: 5,
    meansOfDeath: [6, 7],
    range: "Mid",
    damage: "100 direct / splash",
    fireRate: "1.25 / sec",
    dps: "125",
    projectileSpeed: "900 ups",
    ammo: "Rockets",
    accent: "#df583f",
    intro: "Own the floor. Own the fight.",
    overview: "Quake III's signature weapon combines 100 direct damage with a 120-unit splash radius and heavy knockback. The projectile is slow enough to dodge in open space, so strong rocket play is about predicting landings, clipping corners, and controlling where the opponent can safely move next.",
    bestFor: ["Mid-range duels", "Splash damage around cover", "Rocket jumps and knockback"],
    techniques: [
      { title: "Aim at the destination", body: "Fire at the floor or wall where the opponent is moving, not at their current body. Nearby splash is better than a clean miss." },
      { title: "Build the pop-up", body: "Place the first rocket at their feet, read the knockback arc, then send the second into the landing path." },
      { title: "Trade health for route speed", body: "A downward rocket jump converts health and armor into vertical access. Use it when the item or position is worth more than the stack." },
    ],
    counters: [
      { title: "Stay off flat floors", body: "Use ledges, stairs, and irregular terrain to shrink the shootable surface around your feet." },
      { title: "Change direction late", body: "The projectile commits early. A sharp air-control or strafe change after the shot often turns direct damage into a miss." },
    ],
    model: {
      file: asset("rocket-launcher", "rocketl.md3"),
      fallbackTexture: asset("rocket-launcher", "rocketl.jpg"),
      textures: {
        rocketl2: asset("rocket-launcher", "rocketl2.jpg"),
        rocketl: asset("rocket-launcher", "rocketl.jpg"),
      },
      label: "Original Quake III Rocket Launcher model",
    },
  },
  {
    slug: "lightning-gun",
    name: "Lightning Gun",
    shortName: "LIGHTNING",
    number: 6,
    meansOfDeath: [11],
    range: "Mid",
    damage: "8 / tick",
    fireRate: "20 / sec",
    dps: "160",
    projectileSpeed: "Hitscan beam",
    ammo: "Cells",
    accent: "#67b7ff",
    intro: "Track cleanly. Keep them in the beam.",
    overview: "The Lightning Gun applies eight damage every 50 milliseconds along a continuous, finite-range trace. Its high sustained output only exists while the crosshair stays attached, making smooth tracking and movement synchronization more important than isolated flicks.",
    bestFor: ["Close-to-mid tracking", "Pinning airborne opponents", "Sustained knockback pressure"],
    techniques: [
      { title: "Mirror the strafe", body: "Match the target's lateral rhythm with your own movement. This reduces the amount of mouse correction needed to hold the beam." },
      { title: "Pin the jump", body: "Continuous knockback can suspend an airborne opponent. Keep the beam slightly under center mass to delay their landing." },
      { title: "Pre-aim the exit", body: "Begin firing as the target clears cover. The instant trace converts every early millisecond into real damage." },
    ],
    counters: [
      { title: "Break the beam", body: "Small pieces of hard cover erase its sustained-DPS advantage. Fight in short peeks rather than continuous exposure." },
      { title: "Exit its reach", body: "Railgun and Machinegun remain useful beyond the finite beam. Back into open distance before taking the duel." },
    ],
    model: {
      file: asset("lightning-gun", "lightning.md3"),
      fallbackTexture: asset("lightning-gun", "lightning2.jpg"),
      textures: {
        lightning2: asset("lightning-gun", "lightning2.jpg"),
        trail2: asset("lightning-gun", "trail2.jpg"),
        glass: asset("lightning-gun", "glass.jpg"),
        button: asset("lightning-gun", "button.jpg"),
      },
      label: "Original Quake III Lightning Gun model",
    },
  },
  {
    slug: "railgun",
    name: "Railgun",
    shortName: "RAILGUN",
    number: 7,
    meansOfDeath: [10],
    range: "Long",
    damage: "100",
    fireRate: "1 shot / 1.5 sec",
    dps: "66.7",
    projectileSpeed: "Hitscan",
    ammo: "Slugs",
    accent: "#53d6d0",
    intro: "One line. One instant. One hundred damage.",
    overview: "The Railgun fires an instant 100-damage trace that can pass through multiple players. Its long reload makes every miss expensive, but its range and burst damage let it finish fights before shorter-range weapons can answer. Positioning creates the shot; aim cashes it in.",
    bestFor: ["Long sightlines", "Opening and finishing damage", "Punishing predictable movement"],
    techniques: [
      { title: "Hold the angle", body: "Let the opponent enter a prepared crosshair. A stable shot is more repeatable than chasing a fast target across the screen." },
      { title: "Read the landing", body: "Jump arcs have limited air control. Wait for the apex or landing point, then fire at the most constrained moment." },
      { title: "Swap during reload", body: "The 1.5-second cycle is enough time to apply damage with another weapon. Rail, switch, pressure, then return when ready." },
    ],
    counters: [
      { title: "Deny the clean rhythm", body: "Vary strafe length and crouch timing. Repeating the same dodge interval gives the shooter an easy prediction." },
      { title: "Collapse the distance", body: "Use cover to approach, then force a close fight during the long reload with lightning, plasma, or rockets." },
    ],
    model: {
      file: asset("railgun", "railgun.md3"),
      fallbackTexture: asset("railgun", "railgun1.jpg"),
      textures: {
        "railgun3.glow": asset("railgun", "railgun3.glow.jpg"),
        "railgun2.glow": asset("railgun", "railgun2.glow.jpg"),
        railgun4: asset("railgun", "railgun4.jpg"),
        railgun3: asset("railgun", "railgun3.jpg"),
        railgun2: asset("railgun", "railgun2.glow.jpg"),
        railgun1: asset("railgun", "railgun1.jpg"),
      },
      label: "Original Quake III Railgun model",
    },
  },
  {
    slug: "plasma-gun",
    name: "Plasma Gun",
    shortName: "PLASMA",
    number: 8,
    meansOfDeath: [8, 9],
    range: "Mid",
    damage: "20 direct / 15 splash",
    fireRate: "10 / sec",
    dps: "Up to 200",
    projectileSpeed: "2,000 ups",
    ammo: "Cells",
    accent: "#bf67ff",
    intro: "Turn a doorway into a wall of energy.",
    overview: "Fast 20-damage bolts arrive every tenth of a second, each carrying a small 15-damage splash. Plasma has the highest practical direct-hit output in the standard arsenal, but the projectiles still demand leading and become easier to dodge as distance grows.",
    bestFor: ["Close-range damage races", "Doorway suppression", "Plasma climbing"],
    techniques: [
      { title: "Paint the route", body: "Lay a stream across the path the opponent must take. Ten bolts per second let you adjust the wall continuously." },
      { title: "Lead, then correct", body: "Start ahead of lateral movement and walk the stream onto the target. Do not aim every bolt as a separate shot." },
      { title: "Climb with splash", body: "Fire at the wall while jumping against it to gain height. Repeated self-knockback can reach routes that look closed." },
    ],
    counters: [
      { title: "Create distance", body: "At long range the bolt travel time is obvious. Change direction after the stream commits and answer with hitscan." },
      { title: "Avoid narrow exits", body: "Doorways maximize both direct hits and splash. Wait out the stream or choose an opening with more lateral room." },
    ],
    model: {
      file: asset("plasma-gun", "plasma.md3"),
      fallbackTexture: asset("plasma-gun", "plasma.jpg"),
      textures: {
        plasma_glo: asset("plasma-gun", "plasma_glo.jpg"),
        plasma_glass: asset("plasma-gun", "plasma_glo.jpg"),
        plasma: asset("plasma-gun", "plasma.jpg"),
      },
      label: "Original Quake III Plasma Gun model",
    },
  },
  {
    slug: "bfg10k",
    name: "BFG10K",
    shortName: "BFG10K",
    number: 9,
    meansOfDeath: [12, 13],
    range: "Mid",
    damage: "100 direct / splash",
    fireRate: "5 / sec",
    dps: "500",
    projectileSpeed: "2,000 ups",
    ammo: "BFG cells",
    accent: "#55e86e",
    intro: "Overkill, delivered five times a second.",
    overview: "The BFG10K launches rocket-strength projectiles at plasma-gun speed and cadence. Direct hits and splash both reach 100 damage, making the rare pickup overwhelmingly powerful. Its constraints are availability, ammunition, and the danger of catching your own blast at close range.",
    bestFor: ["Breaking stacked opponents", "Locking down rooms", "Decisive power-weapon runs"],
    techniques: [
      { title: "Spend it to secure control", body: "Rare ammo has value only when fired. Use the opening barrage to take the room, then collect the next major item safely." },
      { title: "Sweep the floor", body: "Aim successive shots across escape routes. Rocket-sized splash at five shots per second leaves almost no stable ground." },
      { title: "Respect your own radius", body: "The 120-unit blast damages the shooter. Back away from walls and opponents before committing to full fire." },
    ],
    counters: [
      { title: "Do not enter the room", body: "The weapon dominates enclosed space. Force its owner to cross a longer sightline where you can rail before the barrage arrives." },
      { title: "Track the ammo", body: "BFG ammunition disappears quickly at five cells per second. Survive the first burst and pressure immediately when it stops." },
    ],
    model: {
      file: asset("bfg10k", "bfg.md3"),
      attachments: [{ file: asset("bfg10k", "bfg_barrel.md3"), tag: "tag_barrel" }],
      compositeAlpha: true,
      fallbackTexture: asset("bfg10k", "bfg.png"),
      textures: {
        bfg_k: asset("bfg10k", "bfg_k.png"),
        bfg_e: asset("bfg10k", "envmapbfg.jpg"),
        bfg: asset("bfg10k", "bfg.png"),
      },
      label: "Original Quake III BFG10K model",
    },
  },
] as const satisfies readonly Weapon[];

export type WeaponSlug = (typeof weapons)[number]["slug"];

export function getWeapon(slug: string): Weapon | undefined {
  return weapons.find((weapon) => weapon.slug === slug);
}

export function getAdjacentWeapons(slug: string): { previous: Weapon; next: Weapon } {
  const index = Math.max(0, weapons.findIndex((weapon) => weapon.slug === slug));
  return {
    previous: weapons[(index - 1 + weapons.length) % weapons.length],
    next: weapons[(index + 1) % weapons.length],
  };
}
