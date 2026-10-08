import { expect, test } from '@playwright/test';
import { emptyProfile } from '../src/meta/profile';

// V2 part 4: buy a car in the shop and play with it (spec §7)
const errors: string[] = [];
test.beforeEach(async ({ page }) => {
  errors.length = 0;
  const profile = JSON.stringify({ ...emptyProfile(), coins: 5000, welcomeGranted: true });
  await page.addInitScript((p) => {
    localStorage.setItem('pl.howto.v1', '1');
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('pl.profile.v2', p);
      sessionStorage.setItem('seeded', '1');
    }
  }, profile);
  page.on('console', (m) => {
    const type = m.type();
    const text = m.text();
    if (type === 'warning' && /GL Driver Message|GPU stall/.test(text)) return;
    if (type === 'error' || type === 'warning') errors.push(`${type}: ${text}`);
  });
  page.on('pageerror', (e) => errors.push(e.message));
});
test.afterEach(() => expect(errors).toEqual([]));

test('buy the Esportivo, see it on the side choice and start a match with it', async ({ page }, info) => {
  await page.goto('/?app&quality=low&mute&debug&traffic=0');
  await page.getByRole('button', { name: 'Loja' }).click();
  await expect(page.getByRole('heading', { name: 'Loja' })).toBeVisible();
  await page.locator('.shop-row', { hasText: 'Esportivo' }).click();
  await page.getByRole('button', { name: 'Comprar · 800' }).click();
  await expect(page.getByText('Saldo depois: 4.200')).toBeVisible();
  await page.getByRole('button', { name: 'Comprar e usar' }).click();
  await expect(page.locator('.shop-wallet')).toHaveText('4.200');
  await page.screenshot({ path: `test-results/shop-${info.project.name}.png` });
  await page.getByRole('button', { name: 'Voltar' }).click();
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.getByRole('button', { name: 'Jogar Perseguição' }).click();
  await expect(page.getByRole('button', { name: 'Esportivo: trocar carro na loja' })).toBeVisible();
  // the purchase survives a reload
  await page.reload();
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.getByRole('button', { name: 'Jogar Perseguição' }).click();
  await expect(page.getByRole('button', { name: 'Esportivo: trocar carro na loja' })).toBeVisible();
  await page.locator('[data-role="police"]').click();
  await page.waitForFunction(() => '__game' in window && !document.querySelector('.screen-countdown'), null, { timeout: 60_000 });
});

test('"trocar" opens the shop on that side and Voltar returns to the side choice', async ({ page }) => {
  await page.goto('/?app&quality=low&mute');
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.getByRole('button', { name: 'Jogar Perseguição' }).click();
  await page.getByRole('button', { name: 'Sedã: trocar carro na loja' }).click();
  await expect(page.getByRole('radio', { name: 'Ladrão' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('tab', { name: 'Buzina' })).toBeVisible();
  await page.getByRole('button', { name: 'Voltar' }).click();
  await expect(page.getByRole('heading', { name: 'Escolha seu lado' })).toBeVisible();
});
