import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['scripts/**/*.ts'],
      exclude: ['scripts/**/*.d.ts']
    }
  },
  resolve: {
    extensions: ['.ts', '.js']
  }
}); 