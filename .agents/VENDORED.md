# Skills vendorizadas manualmente

Não são rastreadas por `skills-lock.json` (o `npx skills` não resolve os caminhos `../../references` delas).

| Skills | Origem | Commit | Licença |
|---|---|---|---|
| game-studio, web-game-foundations, phaser-2d-game, game-ui-frontend, game-playtest, three-webgl-game | openai/plugins → `plugins/game-studio/skills` | 5fd93af4cd0c623e020d0cc7e9ce178b4ac1f70f | MIT (plugin.json) |
| ship-via-script | local (este projeto) | — | — |

Ajustes feitos: referências `../../references/*.md` copiadas para `game-studio/references/` e caminhos reescritos; three-webgl-game adicionada na entrega 1 com suas referências; react-three-fiber-game, web-3d-asset-pipeline e sprite-pipeline não instaladas (links marcados "não instalado").
Para atualizar: clonar openai/plugins, recopiar as 5 pastas, repetir os ajustes e rodar `node scripts/sync-skills.mjs`.
