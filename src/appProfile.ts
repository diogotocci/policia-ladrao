// Shop and Carreira actions on the profile: each one changes it, saves it and clicks; the screen gets the result.
import { claimReward, type Profile } from './meta/profile';
import { CARS, CAR_IDS, buy, lookOfCar, owns, setPlate, use } from './meta/shop';
import { carThumb } from './render/carThumbs';
import type { GarageCar } from './ui/screens/garage';

export function profileActions(p: {
  get(): Profile;
  /** keeps and saves the new profile */
  set(next: Profile): void;
  cue(): void;
  admin(): boolean;
  /** V3 delivery 3: purchases and claims for the /admin panel */
  track?(type: 'purchase' | 'claim', data: Record<string, unknown>): void;
}) {
  const change = (next: Profile, ok: boolean) => {
    if (ok) {
      p.set(next);
      p.cue();
    }
  };
  return {
    onBuy(id: string): Profile {
      const before = p.get();
      const r = buy(before, id, { admin: p.admin() });
      change(r.profile, r.ok);
      // the admin's free picks are marked, so the panel does not count them as purchases
      if (r.ok) p.track?.('purchase', { item: id, price: before.coins - r.profile.coins, ...(p.admin() ? { admin: true } : {}) });
      return p.get();
    },
    onUse: (id: string): Profile => (p.set(use(p.get(), id)), p.get()),
    onPlate: (text: string): Profile => (p.set(setPlate(p.get(), text)), p.get()),
    onClaim(id: string) {
      const before = p.get();
      const r = claimReward(before, id);
      change(r.profile, r.coins > 0 || r.profile !== before);
      if (r.profile !== before) p.track?.('claim', { id, coins: r.coins });
      return { career: p.get().career, coins: p.get().coins };
    },
  };
}

/** The cars owned, police first, for Carreira › Garagem (V2 part 6); their pictures are drawn when shown. */
export function garageCars(profile: Profile): GarageCar[] {
  return CAR_IDS.filter((c) => owns(profile, `car:${c}`))
    .sort((a, b) => Number(CARS[a].role === 'thief') - Number(CARS[b].role === 'thief'))
    .map((c) => ({
      id: c,
      name: CARS[c].name,
      role: CARS[c].role,
      color: lookOfCar(profile, c).paint,
      thumb: () => carThumb(CARS[c].role, lookOfCar(profile, c)),
    }));
}
