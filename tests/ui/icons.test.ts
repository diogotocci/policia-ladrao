import { describe, expect, it } from 'vitest';
import { ICONS } from '../../src/ui/icons';

describe('HUD icons (drawn SVG, same on every phone)', () => {
  it('sound on, sound off and pause are inline SVGs that follow the text colour', () => {
    for (const k of ['soundOn', 'soundOff', 'pause'] as const) {
      expect(ICONS[k]).toMatch(/^<svg[^>]*viewBox="0 0 24 24"/);
      expect(ICONS[k]).toContain('currentColor');
      expect(ICONS[k]).toContain('aria-hidden="true"');
    }
  });
});
