// Hook SessionStart: injeta a skill using-superpowers + o índice de skills do projeto no contexto.
// Saída em stdout vira contexto adicional da sessão (Claude Code).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const skillsDir = join(root, '.agents', 'skills');

const descOf = (md) => {
  const fm = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return '';
  const m = fm[1].match(/^description:\s*(>-?|\|-?)?\s*([\s\S]*?)(?=^\w[\w-]*:|$(?![\s\S]))/m);
  return m
    ? m[2]
        .replace(/\s+/g, ' ')
        .replace(/^["']|["']$/g, '')
        .trim()
    : '';
};

const lines = [];
for (const d of readdirSync(skillsDir, { withFileTypes: true })) {
  const f = join(skillsDir, d.name, 'SKILL.md');
  if (d.isDirectory() && existsSync(f)) lines.push(`- ${d.name}: ${descOf(readFileSync(f, 'utf8')).slice(0, 220)}`);
}

const using = readFileSync(join(skillsDir, 'using-superpowers', 'SKILL.md'), 'utf8');
process.stdout.write(
  `<EXTREMELY_IMPORTANT>
Este projeto tem skills em .agents/skills (espelhadas em .claude/skills). Use-as sem o usuário pedir, conforme a tabela do AGENTS.md.
Regra de git: o agente NUNCA commita, faz push ou abre PR — use a skill ship-via-script e gere scratch/NN-<slug>.ps1.

Skills disponíveis:
${lines.join('\n')}

Conteúdo da skill using-superpowers:
${using}
</EXTREMELY_IMPORTANT>
`,
);
