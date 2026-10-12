import { describe, expect, it } from 'vitest';
import { usernameProblem } from '../../src/meta/username';

describe('usernames (spec §4.1)', () => {
  it('3 to 16 letters, digits or _', () => {
    for (const ok of ['abc', 'Diogo_Fuga', 'a1_b2_c3_d4_e5_f', 'PRF191']) expect(usernameProblem(ok)).toBeUndefined();
    for (const bad of ['ab', 'a'.repeat(17), 'com espaço', 'joão', 'x-y', '']) expect(usernameProblem(bad)).toBe('format');
  });
  it('swear words are refused even with _ or digits in the middle; ordinary names pass', () => {
    for (const bad of ['p0rra', 'mer_da', 'FDP_123', 'Fuck', 'b0st4']) expect(usernameProblem(bad)).toBe('blocked');
    for (const ok of ['Rolando', 'Fagner', 'Assis', 'Mafalda', 'Putinha'.replace('Put', 'Pat')])
      expect(usernameProblem(ok)).toBeUndefined();
  });
});
