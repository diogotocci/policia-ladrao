// Progress backup code (V2 part 1): "PL1-" + base32 (RFC 4648, no padding) of the profile as a compact JSON array + CRC32,
// in blocks of 4. The CRC catches a code pasted incomplete or mistyped; it does not stop deliberate edits.
import { parseProfile, type Profile } from './profile';
import { CAR_IDS, CATALOG, NEON_IDS, SOUND_IDS, defaultEquipped } from './shop';
import { ACHIEVEMENTS, COUNTER_KEYS, emptyCareer } from './career';

const PREFIX = 'PL1-';
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const CRC_LEN = 8;

export type BackupError = 'format' | 'checksum' | 'invalid';
export type BackupResult = { ok: true; profile: Profile } | { ok: false; error: BackupError };

const ERROR = 'Código incompleto ou com erro. Copie de novo no outro aparelho.';
export const BACKUP_ERROR_TEXT: Record<BackupError, string> = { format: ERROR, checksum: ERROR, invalid: ERROR };

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): string {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return ((c ^ 0xffffffff) >>> 0).toString(16).toUpperCase().padStart(CRC_LEN, '0');
}

function toBase32(bytes: Uint8Array): string {
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (const b of bytes) {
    buffer = (buffer << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(buffer << (5 - bits)) & 31];
  return out;
}

function fromBase32(text: string): Uint8Array | undefined {
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of text) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) return undefined;
    buffer = ((buffer << 5) | v) & 0xfff; // keep only the bits still to be emitted
    bits += 5;
    if (bits >= 8) {
      out.push((buffer >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Uint8Array.from(out);
}

const blocks = (s: string) => s.match(/.{1,4}/g)?.join('-') ?? '';

// compact payload: a JSON array instead of the object keeps the code short enough to read and paste.
// v1: 8 fields. v2 (shop) adds the catalog positions bought and what is in use, as indexes.
const pack = (p: Profile) => {
  const side = (r: 'police' | 'thief') => [
    CAR_IDS.indexOf(p.equipped[r].car),
    p.equipped[r].neon ? NEON_IDS.indexOf(p.equipped[r].neon) : -1,
    p.equipped[r].sound ? SOUND_IDS.indexOf(p.equipped[r].sound) : -1,
  ];
  const base = [
    p.v,
    p.coins,
    p.stats.matches,
    p.stats.wins,
    p.stats.escapes,
    p.stats.arrests,
    p.stats.coinsEarned,
    p.welcomeGranted ? 1 : 0,
  ];
  const c = p.career;
  // nothing bought, the defaults in use and no career yet: the short form (same length as before the shop)
  if (
    p.owned.length === 0 &&
    JSON.stringify(p.equipped) === JSON.stringify(defaultEquipped()) &&
    JSON.stringify(c) === JSON.stringify(emptyCareer())
  )
    return base;
  return [
    ...base,
    p.owned.map((id) => CATALOG.findIndex((i) => i.id === id)).filter((i) => i >= 0),
    [...side('police'), ...side('thief'), CAR_IDS.map((x) => p.equipped.paint[x] ?? 0).join(''), p.equipped.plate],
    // v3 (career): xp, counters, achievements (positions), today's challenges, streak, unseen
    [
      c.xp.police,
      c.xp.thief,
      COUNTER_KEYS.map((k) => c.counters[k]),
      c.achieved.map((id) => ACHIEVEMENTS.findIndex((a) => a.id === id)).filter((i) => i >= 0),
      c.daily.date,
      c.daily.progress,
      c.streak.last,
      c.streak.days,
      c.unseen,
    ],
  ];
};
const at = <T>(list: readonly T[], i: unknown): T | null =>
  typeof i === 'number' && Number.isInteger(i) && i >= 0 && i < list.length ? list[i]! : null;
function unpack(a: unknown): unknown {
  if (!Array.isArray(a) || (a.length !== 8 && a.length !== 10 && a.length !== 11)) return undefined;
  const [v, coins, matches, wins, escapes, arrests, coinsEarned, welcome, ownedIdx, eq, car] = a as unknown[];
  if (welcome !== 0 && welcome !== 1) return undefined;
  const base = { v, coins, stats: { matches, wins, escapes, arrests, coinsEarned }, welcomeGranted: welcome === 1 };
  if (a.length === 8) return v === 1 ? base : { ...base, owned: [] }; // v1, or later with nothing from the shop or career
  if (!Array.isArray(ownedIdx) || !Array.isArray(eq) || eq.length !== 8 || typeof eq[6] !== 'string') return undefined;
  const owned = ownedIdx.map((i) => at(CATALOG, i)?.id).filter((x) => x !== undefined);
  const side = (o: number) => ({ car: at(CAR_IDS, eq[o]), neon: at(NEON_IDS, eq[o + 1]), sound: at(SOUND_IDS, eq[o + 2]) });
  const paint = Object.fromEntries(CAR_IDS.map((c, i) => [c, Number((eq[6] as string)[i] ?? 0)]));
  const out = { ...base, owned, equipped: { police: side(0), thief: side(3), paint, plate: eq[7] } };
  if (a.length === 10) return out; // v2: the career starts from the stats
  if (!Array.isArray(car) || car.length !== 9 || !Array.isArray(car[2]) || !Array.isArray(car[3])) return undefined;
  const career = {
    xp: { police: car[0], thief: car[1] },
    counters: Object.fromEntries(COUNTER_KEYS.map((k, i) => [k, (car[2] as unknown[])[i]])),
    achieved: (car[3] as unknown[]).map((i) => at(ACHIEVEMENTS, i)?.id).filter((x) => x !== undefined),
    daily: { date: car[4], progress: car[5] },
    streak: { last: car[6], days: car[7] },
    unseen: car[8],
  };
  return { ...out, career };
}

export function encodeBackup(profile: Profile): string {
  const bytes = new TextEncoder().encode(JSON.stringify(pack(profile)));
  return PREFIX + blocks(toBase32(bytes) + crc32(bytes));
}

export function decodeBackup(code: string): BackupResult {
  const clean = code.replace(/\s+/g, '').toUpperCase();
  if (!clean.startsWith(PREFIX)) return { ok: false, error: 'format' };
  const body = clean.slice(PREFIX.length).replace(/-/g, '');
  if (body.length <= CRC_LEN) return { ok: false, error: 'format' };
  const bytes = fromBase32(body.slice(0, -CRC_LEN));
  if (!bytes) return { ok: false, error: 'format' };
  if (crc32(bytes) !== body.slice(-CRC_LEN)) return { ok: false, error: 'checksum' };
  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return { ok: false, error: 'invalid' };
  }
  const profile = parseProfile(unpack(raw));
  return profile ? { ok: true, profile } : { ok: false, error: 'invalid' };
}
