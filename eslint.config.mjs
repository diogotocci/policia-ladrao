// ESLint flat config. Two tiers:
// - error: real bugs, unsafe patterns and architecture invariants that must never ship;
// - warn: size/complexity budgets that push refactoring without blocking.
// Formatting belongs to Prettier (see .prettierrc.json); no style rules here.
import { createRequire } from 'node:module';
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import importX from 'eslint-plugin-import-x';
import security from 'eslint-plugin-security';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const require = createRequire(import.meta.url);
const local = { rules: { 'max-file-lines': require('./eslint-rules/max-file-lines.cjs') } };

/** The simulation is pure TypeScript: no rendering, DOM, audio or browser globals (it runs in tests and could run on a server). */
const SIM_FORBIDDEN_IMPORTS = {
  patterns: [
    { group: ['three', 'three/*'], message: 'src/sim must not depend on Three.js; keep the simulation pure.' },
    {
      group: ['**/render/**', '**/ui/**', '**/audio/**', '**/input/**', '**/pwa/**', '**/storage/**', '**/game', '**/app', '**/main'],
      message: 'src/sim must not import presentation or browser layers.',
    },
  ],
};
const BROWSER_GLOBALS = [
  'window',
  'document',
  'navigator',
  'localStorage',
  'sessionStorage',
  'requestAnimationFrame',
  'performance',
  'location',
  'history',
].map((name) => ({
  name,
  message: 'src/sim and src/config are pure: pass the value in instead of reading a browser global.',
}));

export default defineConfig([
  globalIgnores([
    'dist/**', // build output
    'node_modules/**',
    'coverage/**',
    'test-results/**', // Playwright artifacts
    'playwright-report/**',
    'public/**', // static assets (generated splash images, icons, manifest)
    '.agents/skills/**', // third-party agent skills vendored verbatim
    '.claude/**', // mirror of .agents/skills for Claude Code
    'graphify-out/**', // generated knowledge graph
    'scratch/**', // local ship scripts (gitignored)
  ]),

  js.configs.recommended,
  ...tseslint.configs.strict,

  // Every TypeScript/JavaScript file
  {
    plugins: { 'import-x': importX, security, local },
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      '@typescript-eslint/no-non-null-assertion': 'off', // indexed access under noUncheckedIndexedAccess relies on it
      '@typescript-eslint/no-empty-object-type': 'off',
      'security/detect-eval-with-expression': 'error',
      'import-x/no-duplicates': 'error',
      'import-x/no-self-import': 'error',
      'import-x/first': 'error',
    },
  },

  // Production source: no console output and size/complexity budgets
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-console': 'error',
      complexity: ['warn', 12],
      'max-depth': ['warn', 4],
      'max-statements': ['warn', 20],
      'max-params': ['warn', 4],
      'max-lines-per-function': ['warn', { max: 150, skipBlankLines: true, skipComments: true }],
      'max-nested-callbacks': ['warn', 3],
      'local/max-file-lines': ['warn', { max: 350 }],
      'security/detect-unsafe-regex': 'warn',
    },
  },

  // Architecture: the simulation and the balance table stay pure
  {
    files: ['src/sim/**/*.ts', 'src/config/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', SIM_FORBIDDEN_IMPORTS],
      'no-restricted-globals': ['error', ...BROWSER_GLOBALS],
    },
  },

  // Tests: long scenario functions and nested describe/it are normal
  {
    files: ['tests/**/*.ts', 'e2e/**/*.ts'],
    rules: {
      'max-statements': 'off',
      'max-lines-per-function': 'off',
      'max-nested-callbacks': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Node scripts and agent hooks may print status lines
  {
    files: ['scripts/**/*.mjs', '.agents/hooks/**/*.mjs', 'eslint-rules/**/*.cjs'],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off', '@typescript-eslint/no-require-imports': 'off' },
  },
]);
