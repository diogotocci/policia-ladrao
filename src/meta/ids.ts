/** A unique id (matches, events): the server keeps one row per id, so a resend from an offline queue counts once. */
export function newMatchId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
