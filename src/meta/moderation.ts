// The /admin "Denúncias" tab (spec docs/superpowers/specs/2026-10-15-denuncias-admin-design.md): what the server sends
// and the actions the admin can take. Shared by the server (Node ESM) and the page.

export type ModerationAction = 'rename' | 'ban' | 'unban' | 'dismiss';
export const MODERATION_ACTIONS: readonly ModerationAction[] = ['rename', 'ban', 'unban', 'dismiss'];

/** one reported account waiting for a decision */
export interface PendingReport {
  userId: string;
  /** the current name (null: it was already taken away) */
  username: string | null;
  /** the name in the reports when it is not the current one (the player renamed after being reported) */
  reportedAs?: string;
  /** reports (one per person) */
  count: number;
  first: string;
  last: string;
  /** who reported, latest first (up to 3) */
  by: string[];
}

/** one decision, latest first */
export interface Decision {
  userId: string | null;
  /** the name when it was decided */
  username: string | null;
  action: ModerationAction;
  reports: number;
  at: string;
  /** the account's name now (after a forced rename: the new one, once chosen) */
  nowName?: string | null;
  /** a ban still in force, and the latest of that account: the line offers Desfazer */
  banned?: boolean;
}

export interface ModerationView {
  pending: PendingReport[];
  decided: Decision[];
}
