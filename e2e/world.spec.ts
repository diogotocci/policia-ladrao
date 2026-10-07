import { expect, test, type Page } from '@playwright/test';
import { BALANCE } from '../src/config/balance';
import { bumpsBetween } from '../src/sim/track';

type Car = {
  s: number;
  x: number;
  speed: number;
  hp: number;
  airTime: number;
  upgrades: { special: { kind: string; charges: number } | null };
  mystery: unknown;
};
type Snap = {
  time: number;
  playerRole: string;
  player: Car;
  opponent: Car;
  bombs: unknown[];
  hazards: { kind: string }[];
  boxes: { color: string }[];
};

const snapshot = (page: Page) => page.evaluate(() => (window as unknown as { __game: { snapshot(): Snap } }).__game.snapshot());
const waitSim = async (page: Page, seconds: number) => {
  const t0 = (await snapshot(page)).time;
  await page.waitForFunction(
    (target) => (window as unknown as { __game: { snapshot(): { time: number } } }).__game.snapshot().time >= target,
    t0 + seconds,
    { timeout: 150_000, polling: 50 },
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

test('rear-view mirror: shown when playing thief, hidden when playing police', async ({ page }) => {
  await page.goto('/?debug&seed=2&role=thief&quality=low&traffic=0');
  await page.waitForFunction(() => '__game' in window);
  await waitSim(page, 1);
  await expect(page.locator('.rearview-frame')).toBeVisible();
  await page.goto('/?debug&seed=2&quality=low&traffic=0');
  await page.waitForFunction(() => '__game' in window);
  await waitSim(page, 1);
  await expect(page.locator('.rearview-frame')).toBeHidden();
});

test('driving over a speed bump: short jump, ~25% slower, then back to cruise', async ({ page }) => {
  // seed whose 1st speed bump covers the lane where the police spawn (index 1)
  let seed = 1;
  while (!bumpsBetween(seed, 0, 700)[0]!.lanes.includes(1)) seed++;
  await page.goto(`/?debug&seed=${seed}&quality=low&traffic=0`);
  await page.waitForFunction(() => '__game' in window);
  await page.waitForFunction(
    () => (window as unknown as { __game: { snapshot(): Snap } }).__game.snapshot().player.airTime > 0,
    undefined,
    { timeout: 150_000, polling: 16 },
  );
  const inAir = await snapshot(page);
  expect(inAir.player.speed).toBeLessThan(BALANCE.movement.cruise.police * 0.8);
  await waitSim(page, 2.5);
  expect((await snapshot(page)).player.speed).toBeGreaterThan(BALANCE.movement.cruise.police * 0.97);
});

test('thief with a bomb: B drops it and the button disappears', async ({ page }) => {
  await page.goto('/?debug&seed=3&role=thief&quality=low&traffic=0&give=bomb');
  await page.waitForFunction(() => '__game' in window);
  await waitSim(page, 1);
  await page.keyboard.press('KeyB');
  await waitSim(page, 0.2);
  const s = await snapshot(page);
  expect(s.player.upgrades.special).toBeNull();
  expect(s.bombs.length).toBe(1);
  await expect(page.locator('button[data-intent="bomb"]')).toBeHidden();
});

test('thief with oil (V2 part 3): the special button shows the charges and B drops the oil on the road', async ({ page }) => {
  await page.goto('/?debug&seed=3&role=thief&quality=low&traffic=0&give=oil,oil');
  await page.waitForFunction(() => '__game' in window);
  await waitSim(page, 1);
  const special = page.locator('button[data-intent="bomb"]');
  await expect(special).toHaveAttribute('aria-label', 'Especial: óleo (2)');
  await page.keyboard.press('KeyB');
  await waitSim(page, 0.2);
  const s = await snapshot(page);
  expect(s.hazards.map((h) => h.kind)).toEqual(['oil']);
  expect(s.player.upgrades.special).toEqual({ kind: 'oil', charges: 1 });
  await expect(special).toHaveAttribute('aria-label', 'Especial: óleo (1)');
});

test('yellow box (V2 part 3): only yellow boxes with ?mystery=1, and picking one spins the roulette', async ({ page }) => {
  await page.goto('/?debug&seed=5&role=police&quality=low&traffic=0&mystery=1');
  await page.waitForFunction(() => '__game' in window);
  await page.waitForFunction(
    () => (window as unknown as { __game: { snapshot(): { boxes: unknown[] } } }).__game.snapshot().boxes.length > 0,
    null,
    { timeout: 60_000 },
  );
  expect((await snapshot(page)).boxes.every((b) => b.color === 'yellow')).toBe(true);
  // steer onto the next box's lane until the roulette shows (it spins below the time pill)
  const roulette = page.locator('.hud-roulette:not([hidden])');
  for (let i = 0; i < 120 && !(await roulette.isVisible()); i++) {
    const s = await snapshot(page);
    const box = (s.boxes as unknown as { s: number; x: number }[]).filter((b) => b.s > s.player.s).sort((a, b) => a.s - b.s)[0];
    const key = box && box.x < s.player.x - 0.3 ? 'ArrowLeft' : box && box.x > s.player.x + 0.3 ? 'ArrowRight' : undefined;
    if (key) await page.keyboard.down(key);
    await page.waitForTimeout(150);
    if (key) await page.keyboard.up(key);
  }
  await expect(roulette).toBeVisible();
  await expect(roulette).toHaveClass(/is-good|is-bad/, { timeout: 5_000 });
});

test('thief with the rear gun hits the police', async ({ page }) => {
  await page.goto('/?debug&seed=4&role=thief&quality=low&traffic=0&give=gun');
  await page.waitForFunction(() => '__game' in window);
  await waitSim(page, 2);
  await page.keyboard.down('Space');
  await waitSim(page, 6);
  await page.keyboard.up('Space');
  expect((await snapshot(page)).opponent.hp).toBeLessThan(100);
});

test('world screenshot: traffic, boxes, bumps (visual check)', async ({ page }, info) => {
  await page.goto('/?debug&seed=8&quality=high');
  await page.waitForFunction(() => '__game' in window);
  await waitSim(page, 7);
  await page.screenshot({ path: `test-results/world-${info.project.name}.png` });
});
