import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // the admin account (Vercel sets the real one per environment)
    env: { ADMIN_EMAIL: 'diogotocci@gmail.com' },
  },
});
