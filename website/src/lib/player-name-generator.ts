const PLAYER_NAME_PREFIXES = [
    "Aero",
    "Alpha",
    "Arc",
    "Ash",
    "Blaze",
    "Blitz",
    "Bolt",
    "Chaos",
    "Cipher",
    "Cinder",
    "Cold",
    "Comet",
    "Core",
    "Crimson",
    "Cryo",
    "Delta",
    "Dread",
    "Echo",
    "Ember",
    "Flux",
    "Frost",
    "Ghost",
    "Glitch",
    "Grim",
    "Havoc",
    "Hex",
    "Hyper",
    "Ion",
    "Jolt",
    "Lunar",
    "Magma",
    "Metal",
    "Nova",
    "Omega",
    "Onyx",
    "Phantom",
    "Plasma",
    "Prime",
    "Pulse",
    "Pyro",
    "Quantum",
    "Razor",
    "Rocket",
    "Shadow",
    "Solar",
    "Storm",
    "Titan",
    "Turbo",
    "Vortex",
    "Zero",
];

const PLAYER_NAME_CORES = [
    "Apex",
    "Arrow",
    "Barrage",
    "Beacon",
    "Blade",
    "Burst",
    "Cannon",
    "Circuit",
    "Clutch",
    "Crash",
    "Crown",
    "Dash",
    "Drift",
    "Drive",
    "Engine",
    "Falcon",
    "Fang",
    "Forge",
    "Frame",
    "Fury",
    "Grid",
    "Halo",
    "Hammer",
    "Horizon",
    "Impulse",
    "Inferno",
    "Jaguar",
    "Laser",
    "Matrix",
    "Meteor",
    "Nebula",
    "Nitro",
    "Orbit",
    "Phaser",
    "Quake",
    "Raptor",
    "Reactor",
    "Rocket",
    "Rogue",
    "Rush",
    "Sector",
    "Shard",
    "Shock",
    "Siege",
    "Signal",
    "Spark",
    "Specter",
    "Strike",
    "Surge",
    "Switch",
    "Tempest",
    "Thruster",
    "Vector",
    "Venom",
    "Warp",
    "Wolf",
];

const PLAYER_NAME_SUFFIXES = [
    "Ace",
    "Agent",
    "Archer",
    "Bandit",
    "Baron",
    "Breaker",
    "Bruiser",
    "Captain",
    "Champion",
    "Chief",
    "Crusher",
    "Duelist",
    "Enforcer",
    "Ghost",
    "Gladiator",
    "Guardian",
    "Gunner",
    "Hacker",
    "Hunter",
    "Juggernaut",
    "Knight",
    "Legend",
    "Marshal",
    "Merc",
    "Nomad",
    "Outlaw",
    "Paladin",
    "Pilot",
    "Predator",
    "Raider",
    "Ranger",
    "Reaper",
    "Rider",
    "Ronin",
    "Scout",
    "Sentinel",
    "Shaman",
    "Sniper",
    "Soldier",
    "Specter",
    "Striker",
    "Tech",
    "Titan",
    "Tracker",
    "Trooper",
    "Vanguard",
    "Viper",
    "Warden",
    "Warlock",
    "Wolf",
];

const PLAYER_NAME_SEPARATORS = ["", "", "", "", "-", "_", "."];

function pickRandom<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
}

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chance(probability: number) {
    return Math.random() < probability;
}

function createRandomTag() {
    const style = randomInt(0, 3);
    if (style === 0) return String(randomInt(10, 99));
    if (style === 1) return String(randomInt(100, 999));
    if (style === 2) return randomInt(0, 255).toString(16).toUpperCase().padStart(2, "0");
    return "";
}

export function createRandomPlayerName() {
    const separator = pickRandom(PLAYER_NAME_SEPARATORS);
    const parts = [pickRandom(PLAYER_NAME_PREFIXES), pickRandom(PLAYER_NAME_CORES), pickRandom(PLAYER_NAME_SUFFIXES)];

    if (chance(0.35)) {
        parts.splice(2, 0, pickRandom(PLAYER_NAME_CORES));
    }

    const numericTag = createRandomTag();
    const baseName = parts.join(separator);

    return `${baseName}${numericTag}`;
}
