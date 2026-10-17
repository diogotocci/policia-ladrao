import { expect, test, type Page } from '@playwright/test';
import { emptyProfile } from '../src/meta/profile';

// Maps (mockups approved 2026-10-17): each map runs with no errors under the draw-call budget; a map is picked on the
// side screen once unlocked and the match starts there.
type G = { snapshot(): { time: number }; drawCalls(): number };
const game = (page: Page) => page.evaluate(() => (window as unknown as { __game: G }).__game.drawCalls());
const waitSim = (page: Page, t: number) =>
  page.waitForFunction((target) => (window as unknown as { __game: G }).__game.snapshot().time >= target, t, {
    timeout: 120_000,
    polling: 50,
  });

const errors: string[] = [];
test.beforeEach(async ({ page }) => {
  errors.length = 0;
  page.on('console', (m) => {
    const type = m.type();
    const text = m.text();
    if (type === 'warning' && /GL Driver Message|GPU stall/.test(text)) return;
    if (type === 'error' || type === 'warning') errors.push(`${type}: ${text}`);
  });
  page.on('pageerror', (e) => errors.push(e.message));
});
test.afterEach(() => expect(errors).toEqual([]));

for (const [map, lap] of [
  ['paris', 650],
  ['rio', 0],
  ['ny', 750],
  ['ny', 2350],
] as const) {
  test(`${map} (${lap} m into the loop) runs under the draw-call budget`, async ({ page }) => {
    await page.goto(`/?debug&seed=3&quality=high&map=${map}&lap=${lap}`);
    await page.waitForFunction(() => '__game' in window);
    await waitSim(page, 3);
    let max = 0;
    for (let i = 0; i < 6; i++) {
      max = Math.max(max, await game(page));
      await page.waitForTimeout(250);
    }
    expect(max).toBeGreaterThan(0);
    expect(max).toBeLessThan(110);
  });
}

test('with 20 wins Paris is picked on the side screen, remembered, and the match starts there', async ({ page }) => {
  const profile = JSON.stringify({ ...emptyProfile(), welcomeGranted: true, stats: { ...emptyProfile().stats, wins: 20 } });
  await page.addInitScript((p) => {
    localStorage.setItem('pl.howto.v1', '1');
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('pl.profile.v3', p);
      sessionStorage.setItem('seeded', '1');
    }
  }, profile);
  await page.goto('/?app&quality=low&mute&debug&traffic=0');
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.getByRole('button', { name: 'Jogar Perseguição' }).click();
  await page.getByRole('button', { name: /Trocar mapa/ }).click();
  await expect(page.getByRole('radio', { name: /Rio de Janeiro/ })).toHaveAttribute('aria-disabled', 'true');
  await page.getByRole('radio', { name: 'Paris' }).click();
  await expect(page.getByRole('button', { name: /Mapa: Paris/ })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.getByRole('button', { name: 'Jogar Perseguição' }).click();
  await expect(page.getByRole('button', { name: /Mapa: Paris/ })).toBeVisible();
  await page.getByRole('button', { name: 'Jogar de polícia' }).click();
  await page.waitForFunction(() => '__game' in window, null, { timeout: 60_000 });
  await expect(page.locator('canvas')).toBeVisible();
});
