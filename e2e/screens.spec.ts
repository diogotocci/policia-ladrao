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
  await page.getByRole('button', { name: 'Jogar Perseguição' }).click();
  await page.locator(`[data-role="${side}"]`).click();
  await expect(page.locator('.screen-countdown')).toBeVisible();
  await page.waitForFunction(() => '__game' in window && !document.querySelector('.screen-countdown'), null, { timeout: 60_000 });
};

test('full product flow: title → choose thief → 3-2-1 → play → escape at the time limit → arcade initials → ranking (kept after reload)', async ({
  page,
}) => {
  test.setTimeout(300_000); // a whole match, a reload and two screens: slow with 6 workers on a software GPU
  await page.goto('/?app&quality=low&mute&debug&traffic=0&escape=4'); // escape at 4 s (debug only)
  await expect(page.locator('.screen-title')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Jogar', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.getByRole('button', { name: 'Jogar Perseguição' }).click();
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
  // V3: the Ranking opens on Global; an escape at 4 s (debug) is not believable, so it never shows there
  await expect(page.locator('.ranking-list')).toContainText('Ninguém neste quadro ainda');
  await page.getByRole('radio', { name: 'Neste aparelho' }).click();
  const first = page.locator('.ranking-row').first();
  await expect(first).toContainText('DIO');
  await expect(first).toHaveClass(/is-new/);
  await expect(first).toContainText('🏁');
  await page.reload();
  await page.getByRole('button', { name: 'Ranking' }).click();
  await page.getByRole('radio', { name: 'Neste aparelho' }).click();
  await page.getByRole('tab', { name: 'Ladrão — mais rápidos a vencer' }).click();
  await expect(page.locator('.ranking-row').first()).toContainText('DIO');
});

test('ranking opened from the end screen: Voltar comes back to the end screen and an unsaved record is still waiting', async ({ page }) => {
  await page.goto('/?app&quality=low&mute&debug&traffic=0&escape=4');
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.getByRole('button', { name: 'Jogar Perseguição' }).click();
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
  // the game's canvas is gone; only the two spinning cars of the title screen remain
  expect(await page.locator('canvas').count()).toBe(2);
  expect(await page.locator('.screen-title canvas').count()).toBe(2);
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
  await page.getByRole('button', { name: 'Jogar Perseguição' }).click();
  await page.locator('[data-role="police"]').click();
  await page.waitForFunction(() => '__game' in window && !document.querySelector('.screen-countdown'), null, { timeout: 60_000 });
  await page.goBack();
  await expect(page.locator('.screen-pause')).toBeVisible();
});

test('coins: a finished match pays and the balance survives a reload', async ({ page }) => {
  await page.goto('/?app&quality=low&mute&debug&traffic=0&escape=4');
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.getByRole('button', { name: 'Jogar Perseguição' }).click();
  await page.locator('[data-role="thief"]').click();
  await expect(page.locator('.screen-end')).toBeVisible({ timeout: 150_000 });
  const total = page.locator('.end-reward-total');
  await expect(total).toHaveAttribute('aria-label', /^\+\d+ moedas$/);
  const earned = Number((await total.getAttribute('aria-label'))!.match(/\d+/)![0]);
  expect(earned).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Início' }).click();
  // the career (V2 part 5) adds the streak and any challenge of the day on top of the match coins
  const label = (await page.locator('.title-wallet').getAttribute('aria-label'))!; // "N moedas, sequência de 1 dia"
  const balance = Number(label.match(/^[\d.]+/)![0].replace(/\./g, ''));
  expect(balance).toBeGreaterThanOrEqual(earned + 50);
  await page.reload();
  await expect(page.locator('.title-wallet')).toHaveAttribute('aria-label', label);
});

test('difficulty: Difícil is remembered, pays x1,5 and has its own ranking', async ({ page }) => {
  await page.goto('/?app&quality=low&mute&debug&traffic=0&escape=4');
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.getByRole('button', { name: 'Jogar Perseguição' }).click();
  await page.getByRole('radio', { name: /Difícil/ }).click();
  await page.locator('[data-role="thief"]').click();
  await expect(page.locator('.screen-end')).toBeVisible({ timeout: 150_000 });
  await expect(page.locator('.end-difficulty')).toHaveText('Difícil');
  await expect(page.locator('.end-reward')).toContainText('×1,5');
  await page.locator('.initials').press('Enter');
  await page.getByRole('button', { name: 'Ranking' }).click();
  await expect(page.locator('.screen-ranking [aria-label="Dificuldade"] [aria-checked="true"]')).toHaveText('Difícil');
  await page.getByRole('radio', { name: 'Neste aparelho' }).click();
  await expect(page.locator('.ranking-row').first()).toHaveClass(/is-new/);
  await page.locator('.screen-ranking').getByRole('radio', { name: 'Médio' }).click();
  await expect(page.locator('.ranking-row')).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.getByRole('button', { name: 'Jogar Perseguição' }).click();
  await expect(page.locator('.screen-choose [role="radio"][aria-checked="true"]')).toContainText('Difícil');
});

test('Sobrevivência: no clock, chaos rises, roadworks appear and the match still ends', async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto('/?app&quality=low&mute&debug&traffic=0&mode=survival&chaosEvery=4&thiefHp=60&policeHp=25');
  await page.evaluate(() => localStorage.setItem('pl.howto.v1', '1'));
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.getByRole('button', { name: 'Jogar Sobrevivência' }).click();
  await page.locator('[data-role="police"]').click();
  await page.waitForFunction(() => '__game' in window && !document.querySelector('.screen-countdown'), null, { timeout: 60_000 });
  await expect(page.locator('.hud-time-label')).toHaveText('Tempo');
  await expect(page.locator('.hud-chaos')).toContainText('Caos 3', { timeout: 120_000 });
  type G = { snapshot(): { works: unknown[]; mode: string } };
  await page.waitForFunction(() => (window as unknown as { __game: G }).__game.snapshot().works.length > 0, null, { timeout: 60_000 });
  expect(await page.evaluate(() => (window as unknown as { __game: G }).__game.snapshot().mode)).toBe('survival');
  await expect(page.locator('.screen-end')).toBeVisible({ timeout: 180_000 });
});

test('global ranking (V3 delivery 2): a real win goes up by itself and shows with the username, car and rank', async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto('/?app&quality=low&mute&debug&traffic=0&thiefHp=2');
  await page.evaluate(() => localStorage.setItem('pl.howto.v1', '1'));
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.getByRole('button', { name: 'Jogar Perseguição' }).click();
  await page.locator('[data-role="police"]').click();
  await page.waitForFunction(() => '__game' in window && !document.querySelector('.screen-countdown'), null, { timeout: 60_000 });
  await page.keyboard.down('Space');
  await expect(page.locator('.screen-end')).toContainText('Você venceu!', { timeout: 150_000 });
  await page.keyboard.up('Space');
  // the plate for the phone's ranking is still there; the global one already has the match
  await expect(page.locator('.initials')).toBeVisible();
  await expect(page.locator('.end-record-global')).toHaveText('Ranking global: 1º');
  await page.getByRole('button', { name: 'Ranking' }).click();
  await expect(page.getByRole('radio', { name: 'Global' })).toHaveAttribute('aria-checked', 'true');
  const me = page.locator('.ranking-row.is-me');
  await expect(me).toContainText('@Teste');
  await expect(me).toContainText('(você)');
  await expect(me).toContainText('Viatura');
  await expect(me).toContainText('Recruta');
});

test('global ranking: report a name from its line (confirm, saved, marked after reload); no report on the player own line', async ({
  page,
}) => {
  await page.goto('/?app&quality=low&mute');
  await page.evaluate(() => {
    const rivals = [
      { pos: 1, username: 'turbo_br', time: 41, hp: 90, car: 'caveirao', rank: 7 },
      { pos: 2, username: 'pmdorj', time: 45, hp: 70, car: 'prf', rank: 6 },
    ];
    const account = { id: 'dev-1', email: 'teste@exemplo.com', name: 'Conta de Teste', picture: '', username: 'Teste' };
    localStorage.setItem('pl.dev.api', JSON.stringify({ signedIn: true, account, profile: null, rev: 0, rivals }));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Ranking' }).click();
  const flag = page.getByRole('button', { name: 'Denunciar @pmdorj' });
  await flag.click();
  // the dialog is named by its heading, which changes once the report is sent
  await expect(page.getByRole('dialog', { name: 'Denunciar @pmdorj?' })).toBeVisible();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Denunciar' }).click();
  await expect(page.getByRole('dialog', { name: 'Denúncia enviada' })).toContainText('O nome @pmdorj vai para a revisão');
  await dialog.getByRole('button', { name: 'OK' }).click();
  await expect(page.getByRole('button', { name: '@pmdorj denunciado' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Denunciar @turbo_br' })).toBeEnabled();
  await page.reload();
  await page.getByRole('button', { name: 'Ranking' }).click();
  await expect(page.getByRole('button', { name: '@pmdorj denunciado' })).toBeVisible();
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
});
