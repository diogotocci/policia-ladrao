import { expect, test, type Page } from '@playwright/test';

type G = { snapshot(): { time: number; match: { over: boolean } }; drawCalls(): number };
const simTime = (page: Page) => page.evaluate(() => (window as unknown as { __game: G }).__game.snapshot().time);

const errors: string[] = [];
test.beforeEach(async ({ page }) => {
  errors.length = 0;
  // "Como jogar" opens by itself on the first visit (covered in app.spec.ts); these tests go straight to the cards
  await page.addInitScript(() => localStorage.setItem('pl.howto.v1', '1'));
  page.on('console', (m) => {
    const type = m.type();
    const text = m.text();
    if (type === 'warning' && /GL Driver Message|GPU stall/.test(text)) return;
    if (type === 'error' || type === 'warning') errors.push(`${type}: ${text}`);
  });
  page.on('pageerror', (e) => errors.push(e.message));
});
test.afterEach(() => expect(errors).toEqual([]));

const startAs = async (page: Page, side: 'police' | 'thief', extra = '') => {
  await page.goto(`/?app&quality=low&mute&debug&traffic=0${extra}`);
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.locator(`[data-role="${side}"]`).click();
  await expect(page.locator('.screen-countdown')).toBeVisible();
  await page.waitForFunction(() => '__game' in window && !document.querySelector('.screen-countdown'), null, { timeout: 60_000 });
};

test('full product flow: title → choose thief → 3-2-1 → play → escape at the time limit → arcade initials → ranking (kept after reload)', async ({
  page,
}) => {
  await page.goto('/?app&quality=low&mute&debug&traffic=0&escape=4'); // escape at 4 s (debug only)
  await expect(page.locator('.screen-title')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Jogar', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await expect(page.locator('.choose-card')).toHaveCount(2);
  await page.locator('[data-role="thief"]').click();
  await expect(page.locator('.countdown-number')).toHaveText(/[123]/);
  // the simulation does not advance during the countdown
  const t0 = await simTime(page);
  await page.waitForTimeout(800);
  if (await page.locator('.screen-countdown').isVisible()) expect(await simTime(page)).toBe(t0);
  await expect(page.locator('.screen-end')).toBeVisible({ timeout: 150_000 });
  await expect(page.locator('.screen-end')).toContainText('Você venceu!');
  await expect(page.locator('.screen-end')).toContainText('Fugiu!');
  await expect(page.locator('.initials')).toBeFocused();
  await page.keyboard.type('dio');
  await page.keyboard.press('Enter');
  await expect(page.locator('.end-saved')).toBeVisible();
  await page.getByRole('button', { name: 'Ranking' }).click();
  const first = page.locator('.ranking-row').first();
  await expect(first).toContainText('DIO');
  await expect(first).toHaveClass(/is-new/);
  await expect(first).toContainText('🏁');
  await page.reload();
  await page.getByRole('button', { name: 'Ranking' }).click();
  await page.getByRole('tab', { name: 'Ladrão — mais rápidos a vencer' }).click();
  await expect(page.locator('.ranking-row').first()).toContainText('DIO');
});

test('ranking opened from the end screen: Voltar comes back to the end screen and an unsaved record is still waiting', async ({ page }) => {
  await page.goto('/?app&quality=low&mute&debug&traffic=0&escape=4');
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.locator('[data-role="thief"]').click();
  await expect(page.locator('.screen-end')).toBeVisible({ timeout: 150_000 });
  await expect(page.locator('.initials')).toBeVisible();
  await page.getByRole('button', { name: 'Ranking' }).click();
  await expect(page.locator('.screen-ranking')).toBeVisible();
  await page.getByRole('button', { name: 'Voltar' }).click();
  await expect(page.locator('.screen-end')).toBeVisible();
  await expect(page.locator('.initials')).toBeVisible(); // the record was not lost
  await page.locator('.initials').press('Enter');
  await expect(page.locator('.end-saved')).toBeVisible();
  await page.getByRole('button', { name: 'Ranking' }).click();
  await page.getByRole('button', { name: 'Voltar' }).click();
  await expect(page.locator('.end-saved')).toBeVisible();
  await expect(page.locator('.initials')).toHaveCount(0);
});

test('pause freezes the game (Esc and the ⏸ button), Continuar resumes', async ({ page }) => {
  await startAs(page, 'police');
  await page.keyboard.press('Escape');
  await expect(page.locator('.screen-pause')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuar' })).toBeFocused();
  const t = await simTime(page);
  await page.waitForTimeout(1200);
  expect(await simTime(page)).toBe(t);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('.screen-pause')).toBeHidden();
  await page.waitForFunction((t0) => (window as unknown as { __game: G }).__game.snapshot().time > t0 + 0.3, t, { timeout: 60_000 });
  await page.getByRole('button', { name: 'Pausar' }).click();
  await expect(page.locator('.screen-pause')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.screen-pause')).toBeHidden();
});

test('restarting 6 times leaks nothing: no errors, one canvas, draw calls stable', async ({ page }) => {
  test.setTimeout(420_000); // each restart recreates WebGL; slow in Chromium without GPU
  await startAs(page, 'police');
  const before = await page.evaluate(() => (window as unknown as { __game: G }).__game.drawCalls());
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Reiniciar' }).click();
    await page.waitForFunction(() => !document.querySelector('.screen-countdown'), null, { timeout: 60_000 });
  }
  await page.waitForTimeout(500);
  expect(await page.locator('canvas').count()).toBe(1);
  const after = await page.evaluate(() => (window as unknown as { __game: G }).__game.drawCalls());
  expect(Math.abs(after - before)).toBeLessThanOrEqual(8);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page.locator('.screen-title')).toBeVisible();
  expect(await page.locator('canvas').count()).toBe(0);
});

test('the browser/Android Back button pauses instead of leaving', async ({ page }) => {
  await startAs(page, 'thief');
  await page.goBack();
  await expect(page.locator('.screen-pause')).toBeVisible();
  expect(page.url()).toContain('?app');
});

test('pressing Back on the title first does not disarm the trap: Back during a match still pauses', async ({ page }) => {
  await page.goto('/?app&quality=low&mute&debug&traffic=0');
  await expect(page.locator('.screen-title')).toBeVisible();
  await page.goto('/?app&quality=low&mute&debug&traffic=0#x'); // an extra history entry so Back does not leave the site
  await page.goBack();
  await expect(page.locator('.screen-title')).toBeVisible();
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.locator('[data-role="police"]').click();
  await page.waitForFunction(() => '__game' in window && !document.querySelector('.screen-countdown'), null, { timeout: 60_000 });
  await page.goBack();
  await expect(page.locator('.screen-pause')).toBeVisible();
});
