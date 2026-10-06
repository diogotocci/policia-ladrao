// SessionStart hook (Claude Code): injects the always-on rules, the project skill index and the using-superpowers skill.
// Whatever this script prints on stdout becomes additional session context.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const skillsDir = join(root, '.agents', 'skills');
const rulesDir = join(root, '.agents', 'rules');

const frontMatter = (md) => md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);

const descriptionOf = (md) => {
  const fm = frontMatter(md);
  if (!fm) return '';
  const m = fm[1].match(/^description:\s*(>-?|\|-?)?\s*([\s\S]*?)(?=^\w[\w-]*:|$(?![\s\S]))/m);
  return m
    ? m[2]
        .replace(/\s+/g, ' ')
        .replace(/^["']|["']$/g, '')
        .trim()
    : '';
};

/** Rules with `trigger: always_on` in their front matter are injected in full. */
const alwaysOnRules = () => {
  if (!existsSync(rulesDir)) return [];
  return readdirSync(rulesDir)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => ({ name, md: readFileSync(join(rulesDir, name), 'utf8') }))
    .filter(({ md }) => /^trigger:\s*always_on\s*$/m.test(frontMatter(md)?.[1] ?? ''))
    .map(({ name, md }) => `### .agents/rules/${name}\n${md.replace(frontMatter(md)?.[0] ?? '', '').trim()}`);
};

const skills = [];
for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
  const file = join(skillsDir, entry.name, 'SKILL.md');
  if (entry.isDirectory() && existsSync(file)) skills.push(`- ${entry.name}: ${descriptionOf(readFileSync(file, 'utf8')).slice(0, 220)}`);
}

const usingSuperpowers = readFileSync(join(skillsDir, 'using-superpowers', 'SKILL.md'), 'utf8');
process.stdout.write(
  `<EXTREMELY_IMPORTANT>
This project has skills in .agents/skills (mirrored in .claude/skills). Use them without waiting to be asked, following .agents/rules/workflow.md.
Git rule: the agent NEVER commits, pushes or opens PRs. Use the ship-via-script skill and write scratch/NN-<slug>.ps1.

## Always-on rules
${alwaysOnRules().join('\n\n')}

## Available skills
${skills.join('\n')}

## using-superpowers skill
${usingSuperpowers}
</EXTREMELY_IMPORTANT>
`,
);
