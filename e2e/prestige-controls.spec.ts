import { expect, test, type Page } from '@playwright/test';
import { emptyCareer } from '../src/meta/career';
import { emptyProfile } from '../src/meta/profile';

// 0.37.0 (mockups approved 2026-10-16): Opções with the analog stick, and prestige in Carreira › Patente
type Snap = { time: number; player: { x: number; steer: number } };
const snapshot = (page: Page) => page.evaluate(() => (window as unknown as { __game: { snapshot(): Snap } }).__game.snapshot());
const waitSim = async (page: Page, seconds: number) => {
  const t0 = (await snapshot(page)).time;
  await page.waitForFunction(
    (target) => (window as unknown as { __game: { snapshot(): { time: number } } }).__game.snapshot().time >= target,
    t0 + seconds,
    { timeout: 120_000, polling: 50 },
  );
};

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

test('Opções: the choice is kept; Analógico replaces the arrows in the match', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('pl.howto.v1', '1'));
  await page.goto('/?app&quality=low&mute');
  await page.getByRole('button', { name: 'Opções' }).click();
  await expect(page.getByRole('heading', { name: 'Opções' })).toBeVisible();
  await expect(page.getByRole('radio', { name: /Setas/ })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('radio', { name: /Analógico/ }).click();
  await page.getByRole('button', { name: 'Voltar' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Opções' }).click();
  await expect(page.getByRole('radio', { name: /Analógico/ })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Voltar' }).click();
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.getByRole('button', { name: 'Jogar Perseguição' }).click();
  await page.getByRole('button', { name: 'Jogar de polícia' }).click();
  await expect(page.locator('.touch-stick-zone')).toBeAttached({ timeout: 60_000 });
  await expect(page.locator('[data-intent="left"]')).toHaveCount(0);
  await expect(page.locator('[data-intent="brake"]')).toBeAttached();
});

test('the stick steers: dragging left moves the car left, letting go stops it', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile-landscape', 'the touch controls show on touch screens only');
  await page.goto('/?debug&stick&seed=4&quality=low&traffic=0&curves=0');
  await page.waitForFunction(() => '__game' in window);
  await waitSim(page, 0.5);
  const zone = (await page.locator('.touch-stick-zone').boundingBox())!;
  const x0 = (await snapshot(page)).player.x;
  const y = zone.y + zone.height / 2;
  await page.mouse.move(zone.x + zone.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(zone.x + zone.width / 2 - 80, y, { steps: 4 });
  await expect(page.locator('.touch-stick')).toHaveClass(/is-on/);
  await waitSim(page, 0.5);
  const x1 = (await snapshot(page)).player.x;
  expect(x1).toBeLessThan(x0 - 1);
  expect((await snapshot(page)).player.steer).toBe(-1);
  await page.mouse.up();
  await expect(page.locator('.touch-stick')).not.toHaveClass(/is-on/);
  await waitSim(page, 0.2);
  expect((await snapshot(page)).player.steer).toBe(0); // (the car may still bounce off the sidewalk)
});

test('prestige: at Delegado the police goes back to Recruta with ★1 and 3.000 coins', async ({ page }) => {
  const profile = JSON.stringify({
    ...emptyProfile(),
    coins: 100,
    welcomeGranted: true,
    career: { ...emptyCareer(), xp: { police: 12_500, thief: 0 } },
  });
  await page.addInitScript((p) => {
    localStorage.setItem('pl.howto.v1', '1');
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('pl.profile.v3', p);
      sessionStorage.setItem('seeded', '1');
    }
  }, profile);
  await page.goto('/?app&quality=low&mute');
  await page.getByRole('button', { name: 'Carreira' }).click();
  await page.getByRole('tab', { name: 'Patente' }).click();
  await page.getByRole('button', { name: /Prestigiar ★1/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Prestigiar' });
  await expect(dialog).toContainText('Você volta para Recruta');
  await dialog.getByRole('button', { name: 'Prestigiar' }).click();
  const police = page.locator('.career-rank-col.is-police');
  await expect(police.locator('.career-rank-info b')).toHaveText('Recruta');
  await expect(police.locator('.career-star')).toHaveText('★1');
  await expect(page.locator('.career-wallet')).toHaveText('3.100');
  await page.reload(); // saved
  await page.getByRole('button', { name: 'Carreira' }).click();
  await page.getByRole('tab', { name: 'Patente' }).click();
  await expect(page.locator('.career-rank-col.is-police .career-star')).toHaveText('★1');
});
