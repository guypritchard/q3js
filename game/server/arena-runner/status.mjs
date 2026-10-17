const text = (value, length = 128) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, length);

export function parseStatus(packet) {
  if (!(packet instanceof Uint8Array) || packet.length > 16384 || packet.length < 20) return undefined;
  if (!packet.subarray(0, 4).every(byte => byte === 255)) return undefined;
  const lines = new TextDecoder().decode(packet.subarray(4)).split('\n');
  if (lines.shift() !== 'statusResponse') return undefined;
  const fields = (lines.shift() ?? '').split('\\');
  const values = Object.create(null);
  for (let i = 1; i + 1 < fields.length; i += 2) values[fields[i]] = fields[i + 1];
  if (!/^[A-Za-z0-9_/-]{1,64}$/.test(values.mapname ?? '')) return undefined;
  const number = (key, max = 100000) => Math.max(0, Math.min(max, Number.parseInt(values[key], 10) || 0));
  const users = lines.slice(0, 32).flatMap(line => {
    const match = /^(-?\d{1,10}) (\d{1,8}) "(.*)"$/.exec(line);
    return match ? [{ score: Number(match[1]), ping: Math.min(9999, Number(match[2])), name: text(match[3], 64) }] : [];
  });
  return { map: values.mapname, users, players: users.length,
    info: { sv_hostname: text(values.sv_hostname), mapname: values.mapname, g_gametype: number('g_gametype', 7),
      fraglimit: number('fraglimit'), timelimit: number('timelimit'), sv_maxclients: number('sv_maxclients', 32),
      g_needpass: number('g_needpass', 1), fs_game: text(values.fs_game, 64),
      gamename: text(values.gamename, 64), com_gamename: text(values.com_gamename, 64) || 'Quake3Arena',
      com_protocol: number('com_protocol', 1000), version: text(values.version), users, players: users.length, ping: 0 } };
}
