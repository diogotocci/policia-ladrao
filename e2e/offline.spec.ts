import { expect, test } from '@playwright/test';

test('right after the first visit the game opens offline (everything precached at install)', async ({ page, context }) => {
  await page.goto('/?app&quality=low&mute');
  await expect(page.locator('.screen-title')).toBeVisible();
  // wait for the service worker to take over the page
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((r) => navigator.serviceWorker.addEventListener('controllerchange', () => r(), { once: true }));
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.screen-title')).toBeVisible();
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.getByRole('button', { name: 'Jogar Perseguição' }).click();
  await expect(page.locator('.screen-choose')).toBeVisible();
  await context.setOffline(false);
});

test('?debug never registers the service worker (tests and debugging stay fresh)', async ({ page }) => {
  await page.goto('/?debug&seed=1&quality=low&traffic=0');
  await page.waitForFunction(() => '__game' in window);
  await page.waitForTimeout(500);
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
});
