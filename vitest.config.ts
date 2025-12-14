import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use happy-dom for DOM simulation (faster than jsdom)
    environment: 'happy-dom',

    // Global test setup
    globals: true,

    // Test file patterns
    include: ['src/**/*.{test,spec}.{js,ts}'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/main.ts', // Main entry point - tested via E2E
        'src/core/constants.ts', // Just data
      ],
    },

    // Timeout for async tests
    testTimeout: 10000,
  },
});
