// Small values kept on the device (never throw: blocked or full storage just forgets them).
export const HOWTO_KEY = 'pl.howto.v1'; // "Como jogar" already closed once
export const INITIALS_KEY = 'pl.initials'; // the last initials saved in the ranking (the plate starts with them)
export const ADMIN_KEY = 'pl.admin'; // admin mode on (testing)

export function openStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function readPref(storage: Storage | undefined, key: string): string {
  try {
    return storage?.getItem(key) ?? '';
  } catch {
    return '';
  }
}

/** Saves a value; an empty one removes the key. */
export function writePref(storage: Storage | undefined, key: string, value: string): void {
  try {
    if (value) storage?.setItem(key, value);
    else storage?.removeItem(key);
  } catch {
    // storage full or blocked: only this session remembers it
  }
}
