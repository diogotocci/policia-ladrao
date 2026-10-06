import { createRequire } from 'node:module';
import { ESLint, RuleTester } from 'eslint';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const maxFileLines = require('../../eslint-rules/max-file-lines.cjs');

describe('local/max-file-lines', () => {
  it('counts only lines with code (comments and blank lines are free)', () => {
    const tester = new RuleTester();
    tester.run('max-file-lines', maxFileLines, {
      valid: [{ code: '// a\n// b\n\nconst a = 1;\nconst b = 2;', options: [{ max: 2 }] }],
      invalid: [{ code: 'const a = 1;\nconst b = 2;\nconst c = 3;', options: [{ max: 2 }], errors: [{ messageId: 'tooLong' }] }],
    });
  });
});

// Loading the full ESLint config takes a few seconds on Windows: one shared instance and a generous timeout.
describe('architecture boundary', { timeout: 60_000 }, () => {
  let eslint: ESLint | undefined;
  const lint = async (code: string, filePath: string) => {
    eslint ??= new ESLint({ cwd: process.cwd() });
    const [result] = await eslint.lintText(code, { filePath });
    return result!.messages.filter((m) => m.severity === 2).map((m) => m.ruleId);
  };

  it('src/sim cannot import Three.js, presentation layers or read browser globals', async () => {
    expect(await lint("import * as THREE from 'three';\nexport const v = THREE.REVISION;\n", 'src/sim/example.ts')).toContain(
      'no-restricted-imports',
    );
    expect(await lint("import { createHud } from '../ui/hud';\nexport const h = createHud;\n", 'src/sim/example.ts')).toContain(
      'no-restricted-imports',
    );
    expect(await lint('export const w = window.innerWidth;\n', 'src/sim/example.ts')).toContain('no-restricted-globals');
  });

  it('the same imports are fine outside the simulation', async () => {
    expect(await lint("import * as THREE from 'three';\nexport const v = THREE.REVISION;\n", 'src/render/example.ts')).toEqual([]);
  });

  it('production source must not log to the console', async () => {
    expect(await lint("console.log('x');\n", 'src/ui/example.ts')).toContain('no-console');
  });
});
