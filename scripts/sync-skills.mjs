// Espelha .agents/skills (fonte da verdade) em .claude/skills (lido pelo Claude Code).
// Uso: node scripts/sync-skills.mjs
import { cpSync, existsSync, readdirSync, rmSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, ".agents", "skills");
const dst = join(root, ".claude", "skills");

mkdirSync(dst, { recursive: true });
const wanted = new Set(readdirSync(src, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name));

for (const name of readdirSync(dst)) {
  if (!wanted.has(name)) rmSync(join(dst, name), { recursive: true, force: true });
}
for (const name of wanted) {
  if (!existsSync(join(src, name, "SKILL.md"))) continue;
  cpSync(join(src, name), join(dst, name), { recursive: true, force: true });
}
console.log(`sync-skills: ${wanted.size} skills espelhadas em .claude/skills`);
