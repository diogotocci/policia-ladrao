import { expect, test, type Page } from '@playwright/test';

type Snap = { time: number; player: { hp: number }; opponent: { hp: number }; events: { type: string }[] };
type Visuals = { particles: number; gunners: { police: boolean; thief: boolean }; muted: boolean };
type Game = { snapshot(): Snap; drawCalls(): number; mirrorDrawCalls(): number; visuals(): Visuals };
const game = (page: Page) =>
  page.evaluate(() => {
    const g = (window as unknown as { __game: Game }).__game;
    return { snap: g.snapshot(), draws: g.drawCalls(), mirror: g.mirrorDrawCalls(), visuals: g.visuals() };
  });
const waitSim = async (page: Page, seconds: number) => {
  const t0 = (await game(page)).snap.time;
  await page.waitForFunction((target) => (window as unknown as { __game: Game }).__game.snapshot().time >= target, t0 + seconds, {
    timeout: 150_000,
    polling: 50,
  });
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

test('both cars wrecked (≤ 20 hp): smoke, gunner and damage stay under the draw-call budget (high)', async ({ page }, info) => {
  await page.goto('/?debug&seed=1&quality=high&policeHp=15&thiefHp=15');
  await page.waitForFunction(() => '__game' in window);
  await waitSim(page, 2);
  // pior caso numa janela de ~2 s de simulação, com fumaça e o atirador da polícia na tela
  let max = 0;
  let smoke = 0;
  for (let i = 0; i < 8; i++) {
    const g = await game(page);
    max = Math.max(max, g.draws);
    smoke = Math.max(smoke, g.visuals.particles);
    expect(g.visuals.gunners.police).toBe(true);
    expect(g.visuals.gunners.thief).toBe(false); // ladrão da IA sem arma
    await waitSim(page, 0.25);
  }
  expect(smoke).toBeGreaterThan(0);
  expect(max).toBeGreaterThan(0);
  expect(max).toBeLessThan(100);
  await page.screenshot({ path: `test-results/visual-wrecked-${info.project.name}.png` });
});

test('thief with the rear gun: gunner in the window, mirror pass reported separately', async ({ page }, info) => {
  await page.goto('/?debug&seed=2&role=thief&quality=high&give=gun&thiefHp=35');
  await page.waitForFunction(() => '__game' in window);
  await waitSim(page, 3);
  const { draws, mirror, visuals } = await game(page);
  expect(draws).toBeLessThan(100);
  expect(mirror).toBeGreaterThan(0); // polícia atrás: retrovisor ligado
  expect(visuals.gunners.thief).toBe(true);
  await page.screenshot({ path: `test-results/visual-thief-gunner-${info.project.name}.png` });
});

test('sound toggle: button and M key, choice is remembered; ?mute starts muted', async ({ page }) => {
  await page.goto('/?debug&seed=1&quality=low&traffic=0');
  await page.waitForFunction(() => '__game' in window);
  const btn = page.locator('button.sound-toggle');
  await expect(btn).toHaveAttribute('aria-label', 'Som ligado');
  await btn.click(); // 1º gesto: cria o áudio
  await expect(btn).toHaveAttribute('aria-label', 'Som desligado');
  await page.keyboard.press('KeyM');
  await expect(btn).toHaveAttribute('aria-label', 'Som ligado');
  await page.keyboard.press('Space'); // tiros com som tocando
  await waitSim(page, 1);
  await btn.click();
  await page.reload();
  await page.waitForFunction(() => '__game' in window);
  await expect(page.locator('button.sound-toggle')).toHaveAttribute('aria-label', 'Som desligado');
  await page.goto('/?debug&seed=1&quality=low&traffic=0&mute');
  await page.evaluate(() => localStorage.removeItem('pl.sound'));
  await page.reload();
  await page.waitForFunction(() => '__game' in window);
  await expect(page.locator('button.sound-toggle')).toHaveAttribute('aria-label', 'Som desligado');
  expect((await game(page)).visuals.muted).toBe(true);
});
