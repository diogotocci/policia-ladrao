# 0.37.0: Garagem fix, prestige and the analog stick

Approved by Diogo on 2026-10-16 from the mockups (Garagem, Patente with Prestigiar, the confirmation, after the
prestige, the global ranking with stars, the end screen notice, the Opções screen and the stick in the match).

## 1. Garagem

The mastery text and the needle ran over the level number on the dial.

- The dial shows only the level number.
- The needle is a short mark on the arc, not a line from the centre.
- "Maestria N · XP / next XP" (or "Maestria máxima · XP") and a progress bar go to the reward box under the dial.

## 2. Prestige (per side)

- Available when the side is at the top rank (Delegado / Chefão) and has fewer than 10 stars.
- "Prestigiar ★N" in Carreira › Patente, with a confirmation.
- On confirm the side goes back to rank 1 (XP 0), gains one star and 3.000 coins.
- Rank rewards still waiting for "Resgatar" on that side are paid with it.
- Cars, wheels, paints and everything unlocked stay. Items unlocked by a rank count as unlocked for a side with a star.
- Climbing the ranks again pays no coins and leaves nothing to claim (`rank` event with `again`).
- The end screen says "Nova patente!" for those, and shows a notice when the side reaches the top rank with a star still to earn.
- The stars show on the insignia, next to the side name, and before the rank on the global ranking.
  The record carries `prestige` (new `records.prestige` column, default 0; older phones send none).
  A record with more than 10 stars is suspect.
- Profile: `career.prestige {police, thief}`; the backup code keeps it (career block, position 10).
- Merging two copies: per side, the copy with more stars wins with its own XP. With the same stars, the most XP wins.
  Rank claims of a side that earned a star in the other copy are dropped (the prestige paid them).
- Admin panel: a prestige is tracked as a `claim` event with id `prestige:<side>:<stars>`.

## 3. Steering (Opções)

- A gear on the title opens Opções: "Controle do carro (celular)", Setas (default) or Analógico.
- The choice is kept on the device (`pl.steering.v1`).
- Analógico: a floating stick on the left half of the screen, below the HUD bars.
  - It shows under the finger.
  - Only the horizontal distance counts, linear after a 12% dead zone, full lock at 56 px.
  - A faint stick rests at the bottom left as a hint.
  - Brake, fire and the special stay on the right.
- `Intents.steer` (-1..1) is optional; the arrows (keyboard) win over it.
- A side hit needs `|steer| >= 0.5` towards the other car, so a light touch is a lane change, not a ram.
- Como jogar and the loading tips explain the control chosen. `?stick` forces the stick (e2e, trying on a phone).
