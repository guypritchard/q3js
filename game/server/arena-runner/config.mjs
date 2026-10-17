import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';

const namePattern = /^[a-z0-9][a-z0-9_-]{0,31}$/;
export function validateConfig(input) {
  if (!input || !Array.isArray(input.arenas) || input.arenas.length < 1 || input.arenas.length > 4) {
    throw new Error('Configure between one and four arenas.');
  }
  const ids = new Set();
  const arenas = input.arenas.map(arena => {
    if (!arena || typeof arena.id !== 'string' || !namePattern.test(arena.id) || ids.has(arena.id)) throw new Error('Invalid or duplicate arena id.');
    ids.add(arena.id);
    if (typeof arena.name !== 'string' || !/^[A-Za-z0-9 _-]{1,64}$/.test(arena.name)) throw new Error('Invalid arena name.');
    if (!Array.isArray(arena.maps) || arena.maps.length < 1 || arena.maps.length > 32 || arena.maps.some(map => typeof map !== 'string' || !namePattern.test(map))) throw new Error('Invalid map playlist.');
    const integer = (name, fallback, min, max) => {
      const value = arena[name] ?? fallback;
      if (!Number.isInteger(value) || value < min || value > max) throw new Error(`Invalid ${name}.`);
      return value;
    };
    const maxClients = integer('maxClients', 12, 1, 32);
    if (arena.autostart !== undefined && typeof arena.autostart !== 'boolean') throw new Error('Invalid autostart.');
    return { id: arena.id, name: arena.name, maps: [...arena.maps], maxClients,
      autostart: arena.autostart ?? true,
      bots: integer('bots', 4, 0, maxClients), fraglimit: integer('fraglimit', 20, 1, 1000),
      timelimit: integer('timelimit', 12, 1, 120) };
  });
  return { arenas };
}

export function arenaConfig(arena) {
  return [
    `set sv_hostname "${arena.name}"`, `set sv_maxclients ${arena.maxClients}`,
    'set sv_pure 1', 'set sv_allowDownload 0', 'set bot_enable 1', `set bot_minplayers ${arena.bots}`,
    'set g_gametype 0', `set fraglimit ${arena.fraglimit}`, `set timelimit ${arena.timelimit}`,
    ...arena.maps.map((map, i) => `set rotation${i} "map ${map}; set nextmap vstr rotation${(i + 1) % arena.maps.length}"`),
    'vstr rotation0', '',
  ].join('\n');
}

// Resolve all content before spawning a worker; no user-controlled file paths
// are accepted over HTTP. MEMFS copies are deliberately bounded for this POC.
export async function resolveAssets(directory, filenames) {
  if (!Array.isArray(filenames) || filenames.length < 1 || filenames.length > 32) throw new Error('Configure 1-32 baseq3 PK3 filenames.');
  const root = await realpath(directory);
  let total = 0;
  const seen = new Set();
  const assets = [];
  for (const filename of filenames) {
    if (typeof filename !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,159}\.pk3$/.test(filename) || filename.includes('..') || seen.has(filename.toLowerCase())) throw new Error('Invalid or duplicate PK3 filename.');
    seen.add(filename.toLowerCase());
    const source = await realpath(path.join(root, filename));
    const relative = path.relative(root, source);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('PK3 escapes asset directory.');
    const info = await stat(source);
    total += info.size;
    if (!info.isFile() || info.size > 768 * 1024 * 1024 || total > 1024 * 1024 * 1024) throw new Error('PK3 size budget exceeded.');
    assets.push({ source, name: filename, size: info.size });
  }
  return assets;
}
