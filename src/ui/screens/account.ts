// Account screens (V3 part 1, mockups approved 2026-10-12): sign in, choose a username, which progress to keep,
// change the username and delete the account. Thin DOM pieces: the decisions live in src/account.
import { RANK_NAMES, rankOf } from '../../meta/career';
import type { Profile } from '../../meta/profile';
import { CAR_IDS, owns } from '../../meta/shop';
import { USERNAME_RE, USERNAME_TEXT } from '../../meta/username';
import type { UsernameIssue } from '../../account/api';
import { btn, h, mount, openModal, type Disposable } from './dom';
import { SCREEN_ICONS } from './icons';
import './screens.css';
import './account.css';

const n = (v: number) => v.toLocaleString('pt-BR');
const NOT_SAVED = 'Não deu para salvar agora. Confira a internet e tente de novo.';

/** "Termos" and "Política de privacidade", opened outside the game */
function legalLinks(parent: HTMLElement): void {
  const link = (href: string, text: string) => {
    const a = h('a', 'account-link', text);
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  };
  parent.append(link('/termos', 'Termos'), ' e a ', link('/privacidade', 'Política de privacidade'));
}

function screen(root: HTMLElement, cls: string, card: HTMLElement, focus?: HTMLElement, plate = false): Disposable {
  const s = h('section', `screen screen-account ${cls}`);
  s.setAttribute('aria-label', 'Polícia × Ladrão');
  if (plate) {
    const p = h('h1', 'title-plate');
    p.append('Polícia ', h('span', 'title-x', '×'), ' ', h('span', 'title-line', 'Ladrão'));
    s.append(p);
  }
  s.append(card);
  return mount(root, s, focus);
}

// ---------- 1. Entrar ----------
export function renderSignIn(
  root: HTMLElement,
  p: {
    /** draws Google's button; undefined on localhost, where `devSignIn` is a plain button instead */
    mountButton?(slot: HTMLElement): Promise<void>;
    devSignIn?(): void;
    /** no internet and never signed in on this phone */
    offline?: boolean;
    onRetry?(): void;
    error?: string;
  },
): Disposable {
  const card = h('div', 'screen-card account-card');
  const error = h('p', 'account-error', p.error ?? '');
  error.setAttribute('role', 'alert');
  let focus: HTMLElement | undefined;
  if (p.offline) {
    const retry = btn('Tentar de novo', 'is-primary', () => p.onRetry?.());
    card.append(
      h('h2', 'account-heading', 'Conecte-se para entrar pela primeira vez'),
      h('p', 'account-text', 'Depois do primeiro login, o jogo funciona mesmo sem internet.'),
      retry,
    );
    focus = retry;
  } else {
    card.append(
      h('h2', 'account-heading', 'Entre para jogar'),
      h('p', 'account-text', 'Seu progresso, suas compras e seus recordes ficam salvos na sua conta e vão com você para outro celular.'),
    );
    const slot = h('div', 'account-google');
    if (p.devSignIn) {
      focus = btn('Entrar (conta de teste)', 'is-primary', p.devSignIn);
      slot.append(focus);
    } else if (p.mountButton) {
      p.mountButton(slot).catch(() => (error.textContent = 'Não deu para carregar o login do Google. Confira a internet.'));
    }
    const legal = h('p', 'account-legal', 'Ao entrar você aceita os ');
    legalLinks(legal);
    legal.append('.');
    card.append(slot, error, legal);
  }
  if (p.offline) card.append(error);
  return screen(root, 'screen-signin', card, focus, true);
}

// ---------- 2. Nome de usuário ----------
/**
 * The username field: says right away whether the name is free, and submits it. `submit` answers the problem or null.
 * Used on first sign-in and by "Trocar nome".
 */
export function usernameForm(p: {
  initial?: string;
  check(name: string): Promise<UsernameIssue | null>;
  submit(name: string): Promise<UsernameIssue | 'offline' | null>;
  label: string;
  extra?: HTMLElement[];
}): { form: HTMLFormElement; input: HTMLInputElement } {
  const form = h('form', 'account-form');
  const field = h('label', 'account-field');
  field.append(h('span', 'account-at', '@'));
  const input = h('input', 'account-input');
  input.value = p.initial ?? '';
  input.maxLength = 16;
  input.autocomplete = 'off';
  input.autocapitalize = 'off';
  input.spellcheck = false;
  input.setAttribute('aria-label', 'Nome de usuário');
  const status = h('span', 'account-status');
  status.setAttribute('role', 'status');
  field.append(input, status);
  const go = h('button', 'screen-btn is-primary', p.label);
  go.type = 'submit';
  const say = (text: string, ok = false) => {
    status.textContent = text;
    status.classList.toggle('is-ok', ok);
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  let asked = '';
  const check = () => {
    const name = input.value.trim();
    clearTimeout(timer);
    if (!name || name === p.initial) return say('');
    if (!USERNAME_RE.test(name)) return say(USERNAME_TEXT.format);
    timer = setTimeout(() => {
      asked = name;
      p.check(name).then(
        (issue) => asked === name && say(issue ? USERNAME_TEXT[issue] : 'disponível', !issue),
        () => asked === name && say(''),
      );
    }, 350);
  };
  input.addEventListener('input', check);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = input.value.trim();
    if (!USERNAME_RE.test(name)) return say(USERNAME_TEXT.format);
    go.disabled = true;
    clearTimeout(timer);
    void p.submit(name).then(
      (issue) => {
        go.disabled = false;
        if (issue) say(issue === 'offline' ? NOT_SAVED : USERNAME_TEXT[issue]);
      },
      () => ((go.disabled = false), say(NOT_SAVED)),
    );
  });
  form.append(field, ...(p.extra ?? []), go);
  return { form, input };
}

const USERNAME_HELP = 'Aparece no ranking global. De 3 a 16 letras, números ou _. Dá para trocar uma vez a cada 30 dias.';

export function renderUsername(
  root: HTMLElement,
  p: Parameters<typeof usernameForm>[0] & {
    /** the name the admin took away (mockup approved 2026-10-15): the screen says why it asks for another */
    notice?: string;
  },
): Disposable {
  const card = h('div', 'screen-card account-card');
  const { form, input } = usernameForm(p);
  card.append(h('h2', 'account-heading', p.notice ? 'Escolha outro nome' : 'Escolha seu nome de usuário'));
  if (p.notice) {
    const notice = h('p', 'account-notice', 'Seu nome ');
    notice.append(
      h('b', '', `@${p.notice}`),
      ' foi considerado ofensivo e saiu do ranking. Escolha outro para continuar; seu progresso e seus recordes continuam com você.',
    );
    card.append(notice);
  }
  card.append(h('p', 'account-text', USERNAME_HELP), form);
  return screen(root, 'screen-username', card, input);
}

// ---------- Conta suspensa ----------
/** A banned account (mockup approved 2026-10-15): why, how to contest, another account, or deleting this one. */
export function renderSuspended(root: HTMLElement, p: { username: string | null; onOtherAccount(): void }): Disposable {
  const card = h('div', 'screen-card account-card');
  const text = h('p', 'account-text', p.username ? 'A conta ' : 'Sua conta ');
  if (p.username) text.append(h('b', '', `@${p.username}`), ' ');
  const terms = h('a', 'account-link', 'Termos');
  terms.href = '/termos';
  terms.target = '_blank';
  terms.rel = 'noopener';
  text.append('foi suspensa por não seguir os ', terms, ' (nome ofensivo). Se acha que foi um engano, escreva para diogotocci@gmail.com.');
  const other = btn('Entrar com outra conta', '', p.onOtherAccount);
  const del = h('a', 'account-link account-note', 'Excluir esta conta');
  del.href = '/excluir-conta';
  del.target = '_blank';
  del.rel = 'noopener';
  card.append(h('h2', 'account-heading', 'Conta suspensa'), text, other, del);
  return screen(root, 'screen-suspended', card, other, true);
}

/** "Trocar nome" from the profile dialog */
export function openRename(host: HTMLElement, p: Parameters<typeof usernameForm>[0] & { onClose(): void }): () => void {
  const dialog = h('div', 'progress-dialog account-dialog');
  const cancel = btn('Cancelar', 'is-quiet', () => close());
  const { form, input } = usernameForm({ ...p, extra: [] });
  form.append(cancel);
  dialog.append(h('h2', 'account-heading', 'Trocar nome de usuário'), h('p', 'account-text', USERNAME_HELP), form);
  const close = openModal(host, dialog, 'Trocar nome de usuário', p.onClose);
  input.focus();
  input.select();
  return close;
}

// ---------- 3. Qual progresso manter ----------
const carCount = (p: Profile) => CAR_IDS.filter((c) => owns(p, `car:${c}`)).length;

function progressCard(p: Profile, title: string, onPick: () => void): HTMLButtonElement {
  const b = h('button', 'account-choice');
  b.type = 'button';
  const coins = h('span', 'account-choice-coins');
  coins.insertAdjacentHTML('afterbegin', SCREEN_ICONS.coin);
  coins.append(n(p.coins));
  // the prestige stars first: ★1 Recruta is ahead of a Delegado without stars
  const side = (role: 'police' | 'thief', label: string) => {
    const stars = p.career.prestige[role];
    return h(
      'span',
      `account-choice-rank is-${role}`,
      `${label}: ${stars ? `★${stars} ` : ''}${RANK_NAMES[role][rankOf(p.career.xp[role]) - 1] ?? ''}`,
    );
  };
  const cars = carCount(p);
  b.append(
    h('span', 'account-choice-title', title),
    coins,
    side('police', 'Polícia'),
    side('thief', 'Ladrão'),
    h('span', 'account-choice-more', `${cars} ${cars === 1 ? 'carro' : 'carros'} · ${n(p.stats.matches)} partidas`),
  );
  b.addEventListener('click', onPick);
  return b;
}

export function renderChooseProgress(
  root: HTMLElement,
  p: { local: Profile; cloud: Profile; onKeep(which: 'local' | 'cloud'): void },
): Disposable {
  const card = h('div', 'screen-card account-card is-wide');
  let which: 'local' | 'cloud' = 'local';
  const keep = btn('', 'is-primary', () => {
    keep.disabled = true;
    p.onKeep(which);
  });
  const pick = (w: 'local' | 'cloud') => {
    which = w;
    local.setAttribute('aria-pressed', String(w === 'local'));
    cloud.setAttribute('aria-pressed', String(w === 'cloud'));
    keep.textContent = w === 'local' ? 'Manter o deste celular' : 'Manter o da conta';
  };
  const local = progressCard(p.local, 'Neste celular', () => pick('local'));
  const cloud = progressCard(p.cloud, 'Na sua conta', () => pick('cloud'));
  pick('local');
  const row = h('div', 'account-choices');
  row.append(local, cloud);
  card.append(
    h('h2', 'account-heading', 'Você tem progresso em dois lugares'),
    row,
    keep,
    h('p', 'account-note', 'O outro progresso é descartado.'),
  );
  return screen(root, 'screen-keep', card, keep);
}

// ---------- 5. Excluir conta ----------
export function openDeleteAccount(
  host: HTMLElement,
  p: { confirmText: string; onDelete(typed: string): Promise<'ok' | 'wrong' | 'offline'>; onClose(): void },
): () => void {
  const dialog = h('div', 'progress-dialog account-dialog is-danger');
  const list = h('ul', 'account-list');
  for (const t of [
    'Some o progresso: moedas, carros, carreira e maestria.',
    'Seu nome de usuário e seus recordes saem do ranking global.',
    'Não dá para desfazer.',
  ])
    list.append(h('li', '', t));
  const ask = h('p', 'account-text', 'Para confirmar, digite ');
  ask.append(h('b', '', p.confirmText), ':');
  const form = h('form', 'account-form');
  const input = h('input', 'account-input is-plain');
  input.autocomplete = 'off';
  input.autocapitalize = 'off';
  input.spellcheck = false;
  input.setAttribute('aria-label', `Digite ${p.confirmText}`);
  const error = h('p', 'account-error');
  error.setAttribute('role', 'alert');
  const go = h('button', 'screen-btn is-danger', 'Excluir para sempre');
  go.type = 'submit';
  go.disabled = true;
  const matches = () => input.value.trim().toLowerCase() === p.confirmText.toLowerCase();
  input.addEventListener('input', () => (go.disabled = !matches()));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!matches()) return;
    go.disabled = true;
    void p.onDelete(input.value.trim()).then((r) => {
      if (r === 'ok') return;
      go.disabled = false;
      error.textContent = r === 'offline' ? 'Não deu para excluir agora. Confira a internet e tente de novo.' : 'O texto não confere.';
    });
  });
  const row = h('div', 'progress-actions');
  row.append(
    btn('Cancelar', '', () => close()),
    go,
  );
  form.append(input, error, row);
  dialog.append(h('h2', 'account-heading', 'Excluir sua conta?'), list, ask, form);
  const close = openModal(host, dialog, 'Excluir sua conta?', p.onClose);
  input.focus();
  return close;
}
