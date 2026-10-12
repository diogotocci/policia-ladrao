// V3 part 1: the account flow on the localhost fake server (no Google, no database): sign in, username, profile,
// change name, Sair and Excluir minha conta; and the pages outside the game that the Play listing links to.
import { expect, test } from '@playwright/test';

test('first time: sign in, choose a username, rename it, delete the account', async ({ page }) => {
  await page.goto('/?app&login&quality=low&mute');
  await expect(page.getByRole('heading', { name: 'Entre para jogar' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Política de privacidade' })).toHaveAttribute('href', '/privacidade');
  await page.getByRole('button', { name: 'Entrar (conta de teste)' }).click();

  await expect(page.getByRole('heading', { name: 'Escolha seu nome de usuário' })).toBeVisible();
  const name = page.getByLabel('Nome de usuário');
  await name.fill('ladrao');
  await expect(page.getByRole('status')).toHaveText('Esse nome já está em uso.');
  await name.fill('Diogo_Fuga');
  await expect(page.getByRole('status')).toHaveText('disponível');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('button', { name: 'Jogar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Perfil' }).click();
  const profile = page.getByRole('dialog', { name: 'Seu perfil' });
  await expect(profile).toContainText('@Diogo_Fuga');
  await expect(profile).toContainText('Conta de Teste · teste@exemplo.com');

  await profile.getByRole('button', { name: 'Trocar nome' }).click();
  const rename = page.getByRole('dialog', { name: 'Trocar nome de usuário' });
  await rename.getByLabel('Nome de usuário').fill('Diogo191');
  await rename.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('dialog', { name: 'Seu perfil' })).toContainText('@Diogo191');

  // a reload keeps the account (90-day session) and goes straight to the title
  await page.reload();
  await expect(page.getByRole('button', { name: 'Jogar', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Perfil' }).click();
  await page.getByRole('button', { name: 'Excluir minha conta' }).click();
  const del = page.getByRole('dialog', { name: 'Excluir sua conta?' });
  await expect(del).toContainText('Não dá para desfazer.');
  const forever = del.getByRole('button', { name: 'Excluir para sempre' });
  await expect(forever).toBeDisabled();
  await del.getByLabel('Digite Diogo191').fill('Diogo191');
  await forever.click();
  await expect(page.getByRole('heading', { name: 'Entre para jogar' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Entre para jogar' })).toBeVisible();
});

test('Sair goes back to the sign-in screen; signing in again brings the progress back', async ({ page }) => {
  await page.goto('/?app&quality=low&mute');
  await expect(page.getByRole('button', { name: 'Jogar', exact: true })).toBeVisible();
  const coins = await page.locator('.title-wallet').getAttribute('aria-label');
  await page.getByRole('button', { name: 'Perfil' }).click();
  await page.getByRole('dialog', { name: 'Seu perfil' }).getByRole('button', { name: 'Sair' }).click();
  await expect(page.getByRole('heading', { name: 'Entre para jogar' })).toBeVisible();
  await page.getByRole('button', { name: 'Entrar (conta de teste)' }).click();
  await expect(page.locator('.title-wallet')).toHaveAttribute('aria-label', coins!);
});

test('privacy, terms and delete-account pages exist outside the game', async ({ request }) => {
  for (const [path, text] of [
    ['/privacidade.html', 'Política de privacidade'],
    ['/termos.html', 'Termos de uso'],
    ['/excluir-conta.html', 'Excluir sua conta'],
  ] as const) {
    const res = await request.get(path);
    expect(res.ok(), path).toBe(true);
    expect(await res.text()).toContain(text);
  }
});
