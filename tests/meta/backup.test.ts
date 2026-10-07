import { describe, expect, it } from 'vitest';
import { BACKUP_ERROR_TEXT, decodeBackup, encodeBackup } from '../../src/meta/backup';
import { emptyProfile, type Profile } from '../../src/meta/profile';

const sample: Profile = {
  v: 1,
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
    expect(decodeBackup(forged({ ...sample, v: 2 }))).toEqual({ ok: false, error: 'invalid' });
    expect(decodeBackup(forged({ ...sample, coins: -5 }))).toEqual({ ok: false, error: 'invalid' });
    expect(decodeBackup(forged({ ...sample, coins: 1e12 }))).toEqual({ ok: false, error: 'invalid' });
  });

  it('every error has the player-facing text', () => {
    for (const k of ['format', 'checksum', 'invalid'] as const)
      expect(BACKUP_ERROR_TEXT[k]).toBe('Código incompleto ou com erro. Copie de novo no outro aparelho.');
  });
});
