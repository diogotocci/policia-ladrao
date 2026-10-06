import { expect, test, type Page } from '@playwright/test';

type Snapshot = { time: number; player: { s: number; x: number; speed: number; role: string } };

const snapshot = (page: Page) => page.evaluate(() => (window as unknown as { __game: { snapshot(): Snapshot } }).__game.snapshot());
const drawCalls = (page: Page) => page.evaluate(() => (window as unknown as { __game: { drawCalls(): number } }).__game.drawCalls());

/** Waits for N seconds of SIMULATION (not wall clock): robust on slow machines / software GPU. */
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
    // Video driver warnings (e.g. "GL Driver Message ... GPU stall due to ReadPixels") come from the
    // browser/GPU of the machine, not the game — only the app's own warnings fail (THREE.*, our logs).
    if (type === 'warning' && /GL Driver Message|GPU stall/.test(text)) return;
    if (type === 'error' || type === 'warning') errors.push(`${type}: ${text}`);
  });
  page.on('pageerror', (e) => errors.push(e.message));
});

test.afterEach(() => {
  expect(errors).toEqual([]);
});

test('drives on its own to police cruise speed and renders the road', async ({ page }, info) => {
  await page.goto('/?debug&seed=1&quality=high');
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(() => 'window' in globalThis && '__game' in window);
  await waitSim(page, 4);
  const s = await snapshot(page);
  expect(s.player.role).toBe('police');
  // cruise 34 m/s; may be higher with the catch-up turbo (thief more than 20 m away).
  // Samples 1 s and uses the max: a speed bump in the middle (−25%) must not fail the test.
  let max = 0;
  for (let i = 0; i < 10; i++) {
    max = Math.max(max, (await snapshot(page)).player.speed);
    await waitSim(page, 0.1);
  }
  expect(max).toBeGreaterThanOrEqual(33.5);
  expect(max).toBeLessThanOrEqual(34 * 1.35 + 0.5);
  await page.screenshot({ path: `test-results/foundation-${info.project.name}.png` });
});

test('thief cruises at 34 m/s', async ({ page }) => {
  await page.goto('/?debug&seed=1&role=thief&quality=low');
  await page.waitForFunction(() => '__game' in window);
  await waitSim(page, 6);
  expect((await snapshot(page)).player.speed).toBeCloseTo(34, 0);
});

test('keyboard steers left', async ({ page }) => {
  await page.goto('/?debug&seed=1&quality=low');
  await page.waitForFunction(() => '__game' in window);
  await waitSim(page, 0.5);
  const before = (await snapshot(page)).player.x;
  await page.keyboard.down('ArrowLeft');
  await waitSim(page, 0.5);
  await page.keyboard.up('ArrowLeft');
  expect((await snapshot(page)).player.x).toBeLessThan(before - 1);
});

test('touch brake slows the car (mobile)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile-landscape', 'touch only');
  await page.goto('/?debug&seed=1&quality=low');
  await page.waitForFunction(() => '__game' in window);
  const brake = page.locator('button[data-intent="brake"]');
  await expect(brake).toBeVisible();
  await expect(page.locator('button[data-intent="left"]')).toBeVisible();
  await waitSim(page, 5);
  const before = (await snapshot(page)).player.speed;
  await brake.dispatchEvent('pointerdown', { pointerId: 7 });
  await waitSim(page, 1);
  const during = (await snapshot(page)).player.speed;
  await brake.dispatchEvent('pointerup', { pointerId: 7 });
  expect(during).toBeLessThan(before - 10);
});

test('draw calls stay under budget and stable over time (high quality, shadows on)', async ({ page }) => {
  await page.goto('/?debug&seed=1&quality=high');
  await page.waitForFunction(() => '__game' in window);
  await waitSim(page, 3);
  const a = await drawCalls(page);
  await waitSim(page, 5);
  const b = await drawCalls(page);
  expect(a).toBeGreaterThan(0);
  expect(a).toBeLessThan(100);
  expect(Math.abs(a - b)).toBeLessThanOrEqual(5);
});

test('phone held upright: the game draws itself sideways (landscape) and keeps running; buttons still work', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'giro só em tela de toque');
  await page.goto('/?debug&seed=1&quality=low');
  await page.waitForFunction(() => '__game' in window);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const box = await page.locator('#app').boundingBox();
  // rotated: fills the whole screen in portrait, but the container itself is landscape
  expect(box!.width).toBeCloseTo(390, 0);
  expect(box!.height).toBeCloseTo(844, 0);
  const inner = await page.evaluate(() => ({
    w: document.getElementById('app')!.clientWidth,
    h: document.getElementById('app')!.clientHeight,
  }));
  expect(inner.w).toBeGreaterThan(inner.h);
  const t1 = (await snapshot(page)).time;
  await waitSim(page, 0.5);
  expect((await snapshot(page)).time).toBeGreaterThan(t1);
  // the ▶ button (rotated) still responds to touch
  const x0 = (await snapshot(page)).player.x;
  const b = (await page.locator('.touch-btn[data-intent="right"]').boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); // real touch at the screen point (goes through the rotation)
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.up();
  expect((await snapshot(page)).player.x).toBeGreaterThan(x0);
  await expect(page.getByText('Deixe a tela deitada')).toBeHidden();
});

test('desktop window narrower than tall: no rotation, the game waits with a hint', async ({ page, isMobile }) => {
  test.skip(isMobile, 'só no computador');
  await page.goto('/?debug&seed=1&quality=low');
  await page.waitForFunction(() => '__game' in window);
  await page.setViewportSize({ width: 500, height: 800 });
  await expect(page.getByText('Deixe a tela deitada')).toBeVisible();
  await page.waitForTimeout(300);
  const t1 = (await snapshot(page)).time;
  await page.waitForTimeout(800);
  expect((await snapshot(page)).time).toBe(t1);
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.getByText('Deixe a tela deitada')).toBeHidden();
  await waitSim(page, 0.2);
});

test('thief screenshot (visual check)', async ({ page }, info) => {
  await page.goto('/?debug&seed=2&role=thief&quality=high');
  await page.waitForFunction(() => '__game' in window);
  await waitSim(page, 0.1);
  await page.keyboard.down('ArrowRight');
  await waitSim(page, 0.4);
  await page.keyboard.up('ArrowRight');
  await waitSim(page, 2.5);
  // only for the capture: also shows SHOOT and BOMB (hidden in this release)
  await page.evaluate(() => document.querySelectorAll<HTMLElement>('.touch-btn[hidden]').forEach((b) => (b.hidden = false)));
  await page.screenshot({ path: `test-results/foundation-thief-${info.project.name}.png` });
});

test('real multi-touch: two fingers, slide between arrows, lift (mobile)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile-landscape', 'touch only');
  await page.goto('/?debug&seed=1&quality=low');
  await page.waitForFunction(() => '__game' in window);
  const center = async (name: string) => {
    const b = (await page.locator(`button[data-intent="${name}"]`).boundingBox())!;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  const [L, R, B] = [await center('left'), await center('right'), await center('brake')];
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: string, pts: { x: number; y: number; id: number }[]) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts } as never);
  const intents = () => page.evaluate(() => (window as unknown as { __game: { intents(): Record<string, boolean> } }).__game.intents());

  await touch('touchStart', [
    { ...L, id: 1 },
    { ...B, id: 2 },
  ]);
  await expect.poll(intents).toMatchObject({ left: true, right: false, brake: true });

  await touch('touchMove', [
    { ...R, id: 1 },
    { ...B, id: 2 },
  ]);
  await expect.poll(intents).toMatchObject({ left: false, right: true, brake: true });

  // CDP (Chromium): touchEnd lists the points that were released — only finger 1 lifts
  await touch('touchEnd', [{ ...R, id: 1 }]);
  await expect.poll(intents).toMatchObject({ left: false, right: false, brake: true });

  await touch('touchEnd', [{ ...B, id: 2 }]);
  await expect.poll(intents).toMatchObject({ left: false, right: false, brake: false });
});
