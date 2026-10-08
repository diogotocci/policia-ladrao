import { describe, expect, it } from 'vitest';
import { emptyProfile } from '../../src/meta/profile';
import { CORRUPT_KEY, loadProfile, PROFILE_KEY, PROFILE_V1_KEY, saveProfile } from '../../src/storage/profileStore';

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

describe('profile store v2 key (V2 part 4)', () => {
  const memory2 = (): Storage => {
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

  it('reads a v1 profile from the old key, saves to the new one and never touches the old', () => {
    const s = memory2();
    const v1 = JSON.stringify({
      v: 1,
      coins: 700,
      stats: { matches: 2, wins: 1, escapes: 1, arrests: 0, coinsEarned: 700 },
      welcomeGranted: true,
    });
    s.setItem(PROFILE_V1_KEY, v1);
    const { profile } = loadProfile(s);
    expect(profile.coins).toBe(700);
    expect(profile.v).toBe(3);
    saveProfile(s, { ...profile, coins: 100 });
    expect(s.getItem(PROFILE_V1_KEY)).toBe(v1); // an older build still open keeps its own progress
    expect(loadProfile(s).profile.coins).toBe(100); // the v2 key wins
    expect(PROFILE_KEY).toBe('pl.profile.v3');
  });
});
