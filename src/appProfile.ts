// Shop and Carreira actions on the profile: each one changes it, saves it and clicks; the screen gets the result.
import { claimReward, type Profile } from './meta/profile';
import { buy, setPlate, use } from './meta/shop';

export function profileActions(p: {
  get(): Profile;
  /** keeps and saves the new profile */
  set(next: Profile): void;
  cue(): void;
  admin(): boolean;
}) {
  const change = (next: Profile, ok: boolean) => {
    if (ok) {
      p.set(next);
      p.cue();
    }
  };
  return {
    onBuy(id: string): Profile {
      const r = buy(p.get(), id, { admin: p.admin() });
      change(r.profile, r.ok);
      return p.get();
    },
    onUse: (id: string): Profile => (p.set(use(p.get(), id)), p.get()),
    onPlate: (text: string): Profile => (p.set(setPlate(p.get(), text)), p.get()),
    onClaim(id: string) {
      const before = p.get();
      const r = claimReward(before, id);
      change(r.profile, r.coins > 0 || r.profile !== before);
      return { career: p.get().career, coins: p.get().coins };
    },
  };
}
