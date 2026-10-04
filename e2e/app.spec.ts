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
  // muda só o container (sem evento de resize na janela), como o iOS faz ao abrir o app instalado / girar
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
  const aspect = await page.evaluate(() => (window as unknown as { __game: { visuals(): { cameraAspect: number } } }).__game.visuals().cameraAspect);
  expect(aspect).toBeCloseTo(600 / 390, 2);
});
