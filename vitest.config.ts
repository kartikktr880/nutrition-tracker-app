import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'tests/**/*.test.ts',
      'components/__tests__/**/*.test.tsx',
      'src/__tests__/**/*.test.tsx'
    ],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['scripts/**/*.ts'],
      exclude: ['scripts/**/*.d.ts']
    }
  },
  resolve: {
    extensions: ['.ts', '.js', '.tsx']
  }
}); 