// V3 delivery 3: the /admin panel page on the localhost fake (example numbers).
import { expect, test } from '@playwright/test';

test('admin panel: tiles, chart with hover, bars, and the period chips', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/admin.html');
  await expect(page.locator('.tile').first()).toContainText('Contas criadas');
  await expect(page.locator('.tile')).toHaveCount(5);
  await expect(page.locator('.plot .line')).toHaveCount(2);
  const box = (await page.locator('.plot').boundingBox())!;
  const at = { x: box.width * 0.6, y: box.height * 0.5 };
  // a finger taps on the phone; the mouse hovers on the computer
  if (test.info().project.use.hasTouch) await page.locator('.plot').tap({ position: at });
  else await page.mouse.move(box.x + at.x, box.y + at.y);
  await expect(page.locator('.tip')).toBeVisible();
  await expect(page.locator('.tip')).toContainText('Ativos');
  await page.getByRole('radio', { name: '7 dias' }).click();
  await expect(page.getByRole('radio', { name: '7 dias' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('.tile').nth(3)).toContainText('Partidas em 7 dias');
  expect(errors).toEqual([]);
});
