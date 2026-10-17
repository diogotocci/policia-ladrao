import { defineConfig } from 'vitest/config';

// Two groups (2026-10-17, tests got slow): pure TypeScript suites (no DOM, no module mocks) share their workers
// instead of starting a fresh one per file; DOM and mocked suites keep one isolated worker per file.
const PURE = [
  'tests/sim/**/*.test.ts',
  'tests/meta/**/*.test.ts',
  'tests/storage/**/*.test.ts',
  'tests/pwa/**/*.test.ts',
  'tests/tooling/**/*.test.ts',
];

export default defineConfig({
  test: {
    environment: 'node',
    // the admin account (Vercel sets the real one per environment)
    env: { ADMIN_EMAIL: 'diogotocci@gmail.com' },
    projects: [
      { extends: true, test: { name: 'pure', include: PURE, isolate: false } },
      { extends: true, test: { name: 'isolated', include: ['tests/**/*.test.ts'], exclude: PURE } },
    ],
  },
});
