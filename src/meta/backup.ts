// Progress backup code (V2 part 1): "PL1-" + base32 (RFC 4648, no padding) of the profile as a compact JSON array + CRC32,
// in blocks of 4. The CRC catches a code pasted incomplete or mistyped; it does not stop deliberate edits.
import { parseProfile, type Profile } from './profile';

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

// compact payload: a JSON array instead of the object keeps the code short enough to read and paste
const pack = (p: Profile) => [
  p.v,
  p.coins,
  p.stats.matches,
  p.stats.wins,
  p.stats.escapes,
  p.stats.arrests,
  p.stats.coinsEarned,
  p.welcomeGranted ? 1 : 0,
];
function unpack(a: unknown): unknown {
  if (!Array.isArray(a) || a.length !== 8) return undefined;
  const [v, coins, matches, wins, escapes, arrests, coinsEarned, welcome] = a as unknown[];
  if (welcome !== 0 && welcome !== 1) return undefined;
  return { v, coins, stats: { matches, wins, escapes, arrests, coinsEarned }, welcomeGranted: welcome === 1 };
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
