import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

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

test('splash: shows right away, then fades out once the title is ready; iPhone launch images exist', async ({ page, request }) => {
  // is in the HTML itself (shows before the JS); on a slow machine it may already be gone when goto returns
  const html = await (await request.get('/?app')).text();
  expect(html).toContain('id="splash"');
  expect(html).toContain('Ladrão');
  await page.goto('/?app');
  await expect(page.getByRole('button', { name: 'Jogar', exact: true })).toBeVisible();
  await expect(page.locator('#splash')).toHaveCount(0, { timeout: 4000 });
  const imgs = await page.locator('link[rel="apple-touch-startup-image"]').evaluateAll((ls) => ls.map((l) => l.getAttribute('href')!));
  expect(imgs.length).toBeGreaterThanOrEqual(10);
  for (const src of imgs.slice(0, 3)) expect((await request.get(src)).ok(), src).toBe(true);
});

test('title screen footer shows the app version from package.json', async ({ page }) => {
  const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };
  await page.goto('/?app');
  await expect(page.locator('.title-version')).toHaveText(`v${version}`);
});

test('installable webapp: manifest (fullscreen, landscape) and icons are served', async ({ page, request }) => {
  await page.goto('/?debug&seed=1&quality=low&traffic=0');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBe('/manifest.webmanifest');
  const res = await request.get(href!);
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest.display).toBe('fullscreen');
  expect(manifest.orientation).toBe('landscape');
  expect(manifest.start_url).toBe('/');
  for (const icon of manifest.icons as { src: string; sizes: string }[]) {
    const r = await request.get(icon.src);
    expect(r.ok(), icon.src).toBe(true);
    expect(r.headers()['content-type']).toContain('image/png');
  }
  expect((await request.get('/icons/apple-touch-icon.png')).ok()).toBe(true);
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
});

test('no zoom: viewport locked and a quick double tap is swallowed', async ({ page }) => {
  await page.goto('/?debug&seed=1&quality=low&traffic=0');
  await page.waitForFunction(() => '__game' in window);
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /user-scalable=no/);
  const prevented = await page.evaluate(() => {
    const fire = () => {
      const e = new Event('touchend', { bubbles: true, cancelable: true });
      document.body.dispatchEvent(e);
      return e.defaultPrevented;
    };
    return [fire(), fire()];
  });
  expect(prevented).toEqual([false, true]);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).touchAction)).toBe('none');
});

test('the picture never stretches: a size change without a resize event (iOS standalone) is picked up', async ({ page }) => {
  await page.goto('/?debug&seed=1&quality=low&traffic=0');
  await page.waitForFunction(() => '__game' in window);
  // changes only the container (no window resize event), as iOS does when opening the installed app / rotating
  await page.evaluate(() => {
    const app = document.getElementById('app')!;
    app.style.width = '600px';
    app.style.height = '390px';
  });
  await page.waitForFunction(
    () => {
      const c = document.querySelector('canvas')!;
      return Math.abs(c.width / c.height - 600 / 390) < 0.02;
    },
    null,
    { timeout: 15_000 },
  );
  const aspect = await page.evaluate(
    () => (window as unknown as { __game: { visuals(): { cameraAspect: number } } }).__game.visuals().cameraAspect,
  );
  expect(aspect).toBeCloseTo(600 / 390, 2);
});

test('first visit: "Como jogar" opens by itself on the side choice; after Entendi it stays closed', async ({ page }) => {
  await page.goto('/?app&quality=low&mute');
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  const howTo = page.getByRole('dialog', { name: 'Como jogar' });
  await expect(howTo).toBeVisible();
  await expect(howTo).toContainText('O carro acelera sozinho');
  await howTo.getByRole('button', { name: 'Próximo' }).click();
  await expect(howTo).toContainText('Quem vence');
  await howTo.getByRole('button', { name: 'Entendi' }).click();
  await expect(howTo).toHaveCount(0);
  await page.getByRole('button', { name: 'Voltar' }).click();
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await expect(page.locator('.choose-card')).toHaveCount(2);
  await expect(page.locator('.howto')).toHaveCount(0);
  await page.getByRole('button', { name: 'Como jogar' }).click();
  await expect(howTo).toBeVisible();
});

test('Como jogar: a real finger swipe turns the page and back (mobile)', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'touch only');
  await page.goto('/?app&quality=low&mute');
  await page.getByRole('button', { name: 'Como jogar' }).click();
  const current = page.locator('.howto-dot[aria-current="true"]');
  await expect(current).toHaveAttribute('aria-label', 'Página 1 de 2');
  const cdp = await page.context().newCDPSession(page);
  const swipe = async (x0: number, x1: number) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: 200 }] });
    for (let i = 1; i <= 8; i++)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + ((x1 - x0) * i) / 8, y: 200 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  await swipe(600, 250);
  await expect(current).toHaveAttribute('aria-label', 'Página 2 de 2');
  await expect(page.getByRole('button', { name: 'Próximo' })).toBeHidden();
  await swipe(250, 600);
  await expect(current).toHaveAttribute('aria-label', 'Página 1 de 2');
  await expect(page.getByRole('button', { name: 'Anterior' })).toBeHidden();
});
