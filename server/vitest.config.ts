import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // The first test also pays for starting the server; slow laptops and CI need the headroom.
    testTimeout: 20_000,
  },
});
