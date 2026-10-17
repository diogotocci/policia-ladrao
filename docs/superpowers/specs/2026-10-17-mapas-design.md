# 0.38.0: maps

Approved by Diogo on 2026-10-17 from the mockups (Rio, Paris with the Champ de Mars, New York in a loop with Central
Park, Loja › Mapas, option B on the side screen).

## Rules

- The maps change only the scenery. Road, curves, speed bumps, items and AI stay the same.
- Map list and unlocks. Only wins count, on any map and any side (`profile.stats.wins`); no coins.

  | Map | Unlock |
  |---|---|
  | Cidade | from the start |
  | Paris | 20 wins |
  | Rio de Janeiro | 30 wins |
  | Nova York | 40 wins |

- One global ranking for all maps (no new filter).
- The pick is kept on the device (`pl.map.v1`); a locked or unknown value falls back to Cidade.
- The win that unlocks a map adds a `map` career event; the end screen says "Novo mapa liberado: Paris!".

## Scenery (`src/meta/maps.ts`, `src/render/mapThemes.ts`, `mapDecor.ts`, `backdrop.ts`)

- Each map is a loop of stretches. Every length is a multiple of the 50 m render chunk, so a chunk never mixes two looks.
- Stretches:
  - Paris: avenue (700 m) and the Champ de Mars park (500 m).
  - Rio: the beach avenue (1000 m).
  - New York, about 90 s per lap: Brooklyn (800 m), Times Square (800 m), Central Park (800 m) and the Brooklyn Bridge (600 m), then Brooklyn again.
- Per stretch:
  - the facade texture, which sides have buildings and their heights;
  - the street texture (Copacabana waves, the bridge walkways);
  - the wide ground beyond the sidewalks (sand and sea, grass, river);
  - the props.
- Per map: sky, fog and light. New York is late afternoon, so the windows and panels of Times Square glow.
- Landmarks are a backdrop that stays ahead of the camera past the fog: Christ the Redeemer and the Sugarloaf, the
  Eiffel Tower, Manhattan's skyline. The road curves and never ends, so a landmark cannot be a fixed place.
- Performance:
  - props use one instanced mesh per kind for all chunks, re-laid every 50 m;
  - the extra materials are compiled during "Preparando a partida" through a hidden material bank;
  - draw calls at medium quality are about 79 (Cidade) and 83-90 (maps).

## Screens

- Side screen: a "Mapa: Paris · trocar" pill under the difficulty opens a sheet with the four maps. Locked ones show
  the wins needed and cannot be picked.
- Loja › Mapas: a picture of the map, its line, the progress bar and "Faltam N vitórias".
- Thumbnails: real screenshots of each map in `public/maps/*.jpg`, about 35 KB each.
- Debug only: `?debug&map=ny&lap=2400` starts on a map, N m into its loop.
