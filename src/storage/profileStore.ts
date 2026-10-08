// Player profile on the device (localStorage). Never throws: a blocked or full storage just stops persisting.
// An older profile is migrated when read and moves to the newest key on the next save.
import { emptyProfile, parseProfile, type Profile } from '../meta/profile';

// Each version has its own key (v2: shop, v3: career): an older build still open (cached app, another tab) reads v1 and keeps
// working with it instead of rejecting the new format and saving an empty profile over it. Old keys are read once and never deleted.
export const PROFILE_KEY = 'pl.profile.v3';
export const PROFILE_V2_KEY = 'pl.profile.v2';
export const PROFILE_V1_KEY = 'pl.profile.v1';
/** a profile that failed validation is kept here instead of being silently lost */
export const CORRUPT_KEY = 'pl.profile.corrupt';

export function loadProfile(storage: Storage | undefined): { profile: Profile; persistent: boolean } {
  if (!storage) return { profile: emptyProfile(), persistent: false };
  let raw: string | null;
  try {
    raw = storage.getItem(PROFILE_KEY) ?? storage.getItem(PROFILE_V2_KEY) ?? storage.getItem(PROFILE_V1_KEY);
  } catch {
    return { profile: emptyProfile(), persistent: false };
  }
  if (raw === null) return { profile: emptyProfile(), persistent: true };
  let parsed: Profile | undefined;
  try {
    parsed = parseProfile(JSON.parse(raw));
  } catch {
    parsed = undefined;
  }
  if (parsed) return { profile: parsed, persistent: true };
  try {
    storage.setItem(CORRUPT_KEY, raw);
  } catch {
    // storage full: the broken text stays under PROFILE_KEY until the next successful save
  }
  return { profile: emptyProfile(), persistent: true };
}

export function saveProfile(storage: Storage | undefined, profile: Profile): boolean {
  if (!storage) return false;
  try {
    storage.setItem(PROFILE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}
