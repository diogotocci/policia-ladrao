import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('app version', () => {
  it('package.json version is plain SemVer (MAJOR.MINOR.PATCH), shown on the title screen', () => {
    const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string };
    expect(version).toMatch(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
  });
});
