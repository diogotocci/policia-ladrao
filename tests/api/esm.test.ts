// The Vercel functions run as plain Node ES modules, file by file (no bundler): every relative import reachable from
// api/ must name its file with .js, or the function fails with ERR_MODULE_NOT_FOUND in production (found on 0.25.0's preview).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../..');
const IMPORT = /(?:import|export)[^'";]*?from\s+['"](\.[^'"]+)['"]|^import\s+['"](\.[^'"]+)['"]/gm;

function routes(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? routes(join(dir, e.name)) : e.name.endsWith('.ts') ? [join(dir, e.name)] : [],
  );
}

describe('server code is valid Node ESM', () => {
  it('every relative import reachable from api/ ends in .js and points at a real file', () => {
    const seen = new Set<string>();
    const stack = routes(join(ROOT, 'api'));
    const bad: string[] = [];
    while (stack.length) {
      const file = stack.pop()!;
      if (seen.has(file)) continue;
      seen.add(file);
      for (const m of readFileSync(file, 'utf8').matchAll(IMPORT)) {
        const spec = (m[1] ?? m[2])!;
        const target = normalize(join(dirname(file), spec.replace(/\.js$/, '.ts')));
        if (!spec.endsWith('.js') || !existsSync(target)) bad.push(`${file.slice(ROOT.length + 1)}: ${spec}`);
        else stack.push(target);
      }
    }
    expect(bad).toEqual([]);
    expect(seen.size).toBeGreaterThan(10); // api/, its _lib and the game rules it shares (src/meta, src/sim)
  });
});
