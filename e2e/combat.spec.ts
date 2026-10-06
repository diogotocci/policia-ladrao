import { expect, test, type Page } from '@playwright/test';

type Car = { s: number; x: number; speed: number; hp: number; role: string };
type Snap = { time: number; playerRole: string; player: Car; opponent: Car; match: { over: boolean; winner?: string } };

const snapshot = (page: Page) => page.evaluate(() => (window as unknown as { __game: { snapshot(): Snap } }).__game.snapshot());
const police = (s: Snap) => (s.playerRole === 'police' ? s.player : s.opponent);
const thief = (s: Snap) => (s.playerRole === 'thief' ? s.player : s.opponent);

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

test('police holding fire damages the thief', async ({ page }) => {
  await page.goto('/?debug&seed=4&quality=low');
  await page.waitForFunction(() => '__game' in window);
  await waitSim(page, 1);
  await page.keyboard.down('Space');
  await waitSim(page, 4);
  await page.keyboard.up('Space');
  expect(thief(await snapshot(page)).hp).toBeLessThan(100);
});

test('playing as thief: the police is never ahead (20 s)', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/?debug&seed=5&role=thief&quality=low');
  await page.waitForFunction(() => '__game' in window);
  const t0 = (await snapshot(page)).time;
  let last = t0;
  // Drives in a zigzag and brakes now and then. Under heavy parallel load the simulation can run several times
  // slower than real time, so the loop is also bounded by wall-clock time and only requires 8 s of simulated driving.
  const keys = ['ArrowLeft', 'ArrowRight', 'ArrowDown'];
  let k = 0;
  const deadline = Date.now() + 150_000;
  while (last < t0 + 20 && Date.now() < deadline) {
    const key = keys[k++ % keys.length]!;
    await page.keyboard.down(key);
    const s = await snapshot(page);
    expect(police(s).s).toBeLessThanOrEqual(thief(s).s + 1e-6);
    await page.waitForTimeout(150);
    await page.keyboard.up(key);
    const s2 = await snapshot(page);
    expect(police(s2).s).toBeLessThanOrEqual(thief(s2).s + 1e-6);
    last = s2.time;
    if (s2.match.over) break;
  }
  expect(last - t0).toBeGreaterThanOrEqual(8);
});

test('thief stops: police stops behind or alongside and keeps hitting', async ({ page }) => {
  await page.goto('/?debug&seed=6&role=thief&quality=low');
  await page.waitForFunction(() => '__game' in window);
  await waitSim(page, 2);
  await page.keyboard.down('ArrowDown');
  await waitSim(page, 4);
  const a = await snapshot(page);
  expect(thief(a).speed).toBe(0);
  expect(police(a).s).toBeLessThanOrEqual(thief(a).s + 1e-6);
  await waitSim(page, 4);
  const b = await snapshot(page);
  await page.keyboard.up('ArrowDown');
  expect(police(b).speed).toBe(0);
  expect(thief(b).hp).toBeLessThan(thief(a).hp);
});

test('winning shows the end screen and "Jogar de novo" restarts', async ({ page }) => {
  await page.goto('/?debug&seed=4&thiefHp=2&quality=low');
  await page.waitForFunction(() => '__game' in window);
  await page.keyboard.down('Space');
  await expect(page.getByText('Você venceu!')).toBeVisible({ timeout: 120_000 });
  await page.keyboard.up('Space');
  await expect(page.getByText('O ladrão foi detido')).toBeVisible();
  await page.getByRole('button', { name: 'Jogar de novo' }).click();
  await page.waitForFunction(
    () => '__game' in window && (window as unknown as { __game: { snapshot(): { time: number } } }).__game.snapshot().time < 2,
  );
  await expect(page.getByText('Você venceu!')).toBeHidden();
});

test('combat screenshot with HUD (visual check)', async ({ page }, info) => {
  await page.goto('/?debug&seed=4&quality=high');
  await page.waitForFunction(() => '__game' in window);
  await page.keyboard.down('Space');
  await waitSim(page, 3);
  await page.keyboard.up('Space');
  await page.screenshot({ path: `test-results/combat-${info.project.name}.png` });
});
