import { describe, expect, it } from 'vitest';
import { emptyProfile } from '../../src/meta/profile';
import { CORRUPT_KEY, loadProfile, PROFILE_KEY, saveProfile } from '../../src/storage/profileStore';

const memory = (): Storage => {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, String(v)),
  };
};

describe('profile store', () => {
  it('saves and loads', () => {
    const s = memory();
    const p = { ...emptyProfile(), coins: 300 };
    expect(saveProfile(s, p)).toBe(true);
    expect(s.getItem(PROFILE_KEY)).not.toBeNull();
    expect(loadProfile(s)).toEqual({ profile: p, persistent: true });
  });

  it('nothing saved yet: empty profile', () => {
    expect(loadProfile(memory())).toEqual({ profile: emptyProfile(), persistent: true });
  });

  it('a broken profile is kept aside and a new one starts', () => {
    const s = memory();
    s.setItem(PROFILE_KEY, '{"v":1,"coins":');
    expect(loadProfile(s).profile).toEqual(emptyProfile());
    expect(s.getItem(CORRUPT_KEY)).toBe('{"v":1,"coins":');
  });

  it('storage that throws: save returns false, load is not persistent, nothing throws', () => {
    const broken = {
      ...memory(),
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    } as Storage;
    expect(saveProfile(broken, emptyProfile())).toBe(false);
    expect(loadProfile(broken)).toEqual({ profile: emptyProfile(), persistent: false });
    expect(loadProfile(undefined)).toEqual({ profile: emptyProfile(), persistent: false });
    expect(saveProfile(undefined, emptyProfile())).toBe(false);
  });
});
