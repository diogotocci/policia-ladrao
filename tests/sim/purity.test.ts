import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SIM_DIR = join(__dirname, '../../src/sim');

function listTs(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? listTs(p) : p.endsWith('.ts') ? [p] : [];
  });
}

const isImpure = (src: string) =>
  /from ['"]three['"]/.test(src) || /\bdocument\./.test(src) || /\bwindow\./.test(src);

describe('src/sim purity', () => {
  it('detector flags three, document and window usage', () => {
    expect(isImpure("import * as THREE from 'three';")).toBe(true);
    expect(isImpure('document.body.append(x)')).toBe(true);
    expect(isImpure('window.innerWidth')).toBe(true);
    expect(isImpure('const s = car.s + 1;')).toBe(false);
  });

  it('has at least one module', () => {
    expect(listTs(SIM_DIR).length).toBeGreaterThan(0);
  });

  it('never touches three.js, document or window', () => {
    const offenders = listTs(SIM_DIR).filter((file) => isImpure(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
