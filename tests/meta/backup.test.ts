import { describe, expect, it } from 'vitest';
import { BACKUP_ERROR_TEXT, decodeBackup, encodeBackup } from '../../src/meta/backup';
import { careerFromStats } from '../../src/meta/career';
import { emptyProfile, type Profile } from '../../src/meta/profile';

const sample: Profile = {
  ...emptyProfile(),
  coins: 1240,
  stats: { matches: 37, wins: 21, escapes: 14, arrests: 7, coinsEarned: 2890 },
  welcomeGranted: true,
};

describe('backup code', () => {
  it('round-trips a profile', () => {
    expect(decodeBackup(encodeBackup(sample))).toEqual({ ok: true, profile: sample });
    expect(decodeBackup(encodeBackup(emptyProfile()))).toEqual({ ok: true, profile: emptyProfile() });
  });

  it('format: PL1- then base32 and a hex CRC in blocks of 4 joined by hyphens', () => {
    const code = encodeBackup(sample);
    expect(code.startsWith('PL1-')).toBe(true);
    const body = code.slice(4);
    for (const block of body.split('-')) expect(block).toMatch(/^[A-Z2-7]{1,4}$|^[0-9A-F]{1,4}$|^[A-Z2-7]*[0-9A-F]*$/);
    expect(
      body
        .split('-')
        .slice(0, -1)
        .every((b) => b.length === 4),
    ).toBe(true);
  });

  it('stays short: under 100 characters even for a big profile (the object form was ~200)', () => {
    const big: Profile = {
      ...sample,
      coins: 999_999,
      stats: { matches: 9999, wins: 9999, escapes: 9999, arrests: 9999, coinsEarned: 9_999_999 },
    };
    expect(encodeBackup(big).length).toBeLessThan(100);
  });

  it('accepts spaces, line breaks and lowercase pasted in', () => {
    const code = encodeBackup(sample);
    const messy = ` ${code.slice(0, 10)}\n ${code.slice(10).toLowerCase()} `;
    expect(decodeBackup(messy)).toEqual({ ok: true, profile: sample });
  });

  it('a truncated code or one changed character is rejected', () => {
    const code = encodeBackup(sample);
    const cut = decodeBackup(code.slice(0, code.length - 6));
    expect(cut.ok).toBe(false);
    const i = 9; // inside the data
    const swapped = code.slice(0, i) + (code[i] === 'A' ? 'B' : 'A') + code.slice(i + 1);
    expect(decodeBackup(swapped)).toEqual({ ok: false, error: 'checksum' });
    expect(decodeBackup('hello')).toEqual({ ok: false, error: 'format' });
    expect(decodeBackup('')).toEqual({ ok: false, error: 'format' });
  });

  it('a well-formed code with an invalid profile (future version, negative coins) is rejected', () => {
    const forged = (o: object) => encodeBackup(o as Profile);
    expect(decodeBackup(forged({ ...sample, v: 4 }))).toEqual({ ok: false, error: 'invalid' });
    expect(decodeBackup(forged({ ...sample, coins: -5 }))).toEqual({ ok: false, error: 'invalid' });
    expect(decodeBackup(forged({ ...sample, coins: 1e12 }))).toEqual({ ok: false, error: 'invalid' });
  });

  it('every error has the player-facing text', () => {
    for (const k of ['format', 'checksum', 'invalid'] as const)
      expect(BACKUP_ERROR_TEXT[k]).toBe('Código incompleto ou com erro. Copie de novo no outro aparelho.');
  });
});

describe('backup code v2 (shop, V2 part 4)', () => {
  it('round-trips items bought and in use', () => {
    const p: Profile = {
      ...sample,
      owned: ['car:caveirao', 'paint:caveirao:2', 'neon:police:roxo', 'sound:dupla', 'plate', 'car:moto'],
      equipped: {
        police: { car: 'caveirao', neon: 'roxo', sound: null },
        thief: { car: 'moto', neon: null, sound: 'dupla' },
        paint: { caveirao: 2 },
        plate: 'DIO2026',
        finish: {},
        sticker: {},
      },
    };
    const back = decodeBackup(encodeBackup(p));
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(back.profile.owned.sort()).toEqual([...p.owned].sort());
    expect(back.profile.equipped).toEqual(p.equipped);
  });

  it('a v1 code (8 fields) still restores, with nothing bought', () => {
    // encoded by 0.15.x: [1, coins, matches, wins, escapes, arrests, coinsEarned, welcome]
    const bytes = new TextEncoder().encode(JSON.stringify([1, 1240, 37, 21, 14, 7, 2890, 1]));
    const code = legacyCode(bytes);
    const r = decodeBackup(code);
    expect(r).toEqual({
      ok: true,
      profile: { ...emptyProfile(), coins: 1240, stats: sample.stats, welcomeGranted: true, career: careerFromStats(sample.stats) },
    });
  });

  it('unknown positions and items in use that were not bought are dropped', () => {
    const p: Profile = {
      ...sample,
      owned: ['car:blazer'],
      equipped: { ...sample.equipped, police: { car: 'blazer', neon: null, sound: null } },
    };
    const r = decodeBackup(encodeBackup({ ...p, equipped: { ...p.equipped, thief: { car: 'van', neon: 'rosa', sound: 'corneta' } } }));
    expect(r.ok && r.profile.equipped.thief).toEqual({ car: 'seda', neon: null, sound: null });
    expect(r.ok && r.profile.equipped.police.car).toBe('blazer');
  });
});

/** Same encoding as encodeBackup, for a raw payload (the format of older versions). */
function legacyCode(bytes: Uint8Array): string {
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (const b of bytes) {
    buffer = (buffer << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += ALPHA[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHA[(buffer << (5 - bits)) & 31];
  let c = 0xffffffff;
  for (const b of bytes) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  const crc = ((c ^ 0xffffffff) >>> 0).toString(16).toUpperCase().padStart(8, '0');
  return 'PL1-' + ((out + crc).match(/.{1,4}/g) ?? []).join('-');
}

describe('backup code v3 (career, V2 part 5)', () => {
  it('round-trips the career', () => {
    const p: Profile = {
      ...sample,
      owned: ['car:picape'],
      career: {
        xp: { police: 1580, thief: 360 },
        counters: { ...sample.career.counters, matches: 40, arrests: 14, roadblocks: 3, bestStreak: 3 },
        achieved: ['arrest10', 'play10'],
        daily: { date: '2026-10-08', progress: [2, 0, 7] },
        streak: { last: '2026-10-08', days: 3 },
        claims: ['ach:arrest10', 'daily:2026-10-08:0'],
        carXp: {},
      },
    };
    const r = decodeBackup(encodeBackup(p));
    expect(r.ok && r.profile.career).toEqual(p.career);
  });
});

describe('backup code with mastery (V2 part 6)', () => {
  it('round-trips mastery XP, finishes and stickers; a code from before (no such fields) still restores', () => {
    const p: Profile = {
      ...sample,
      owned: ['car:esportivo', 'finish:esportivo:fosco', 'sticker:seda:2', 'finish:seda:lendaria'],
      equipped: {
        ...sample.equipped,
        police: { car: 'esportivo', neon: null, sound: null },
        finish: { esportivo: 'fosco', seda: 'lendaria' },
        sticker: { seda: 2 },
      },
      career: { ...sample.career, carXp: { esportivo: 2600, seda: 15000 }, claims: [] },
    };
    const back = decodeBackup(encodeBackup(p));
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(back.profile.equipped.finish).toEqual({ esportivo: 'fosco', seda: 'lendaria' });
    expect(back.profile.equipped.sticker).toEqual({ seda: 2 });
    expect(back.profile.career.carXp).toEqual({ esportivo: 2600, seda: 15000 });
    // a code written by 0.20.x: 8 entries in use and 9 in the career
    const zeros = Array(13).fill(0);
    const legacy = [
      3,
      500,
      4,
      2,
      1,
      1,
      900,
      1,
      [0],
      [1, -1, -1, 0, -1, -1, '00000000', ''],
      [300, 200, zeros, [], '', [0, 0, 0], '', 0, []],
    ];
    const old = decodeBackup(legacyCode(new TextEncoder().encode(JSON.stringify(legacy))));
    expect(old.ok).toBe(true);
    if (!old.ok) return;
    expect(old.profile.equipped.police.car).toBe('esportivo');
    expect(old.profile.equipped.finish).toEqual({});
    expect(old.profile.career.carXp).toEqual({});
    expect(old.profile.career.xp).toEqual({ police: 300, thief: 200 });
  });
});
