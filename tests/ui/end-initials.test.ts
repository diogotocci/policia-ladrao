// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { renderEnd } from '../../src/ui/screens/screens';

describe('initials remembered (playtest 2026-10-09)', () => {
  it('the record plate starts with the last initials saved', () => {
    const root = document.createElement('div');
    document.body.append(root);
    const onSave = vi.fn();
    renderEnd(root, {
      role: 'police',
      result: { winner: 'police', time: 40 },
      qualifies: true,
      lastInitials: 'DIO',
      onSave,
      onAgain: vi.fn(),
      onChangeSide: vi.fn(),
      onRanking: vi.fn(),
      onHome: vi.fn(),
    });
    expect([...root.querySelectorAll('.initials-slot')].map((x) => x.textContent)).toEqual(['D', 'I', 'O']);
    (root.querySelector('.end-save') as HTMLButtonElement).click();
    expect(onSave).toHaveBeenCalledWith('DIO');
    root.remove();
  });
});
