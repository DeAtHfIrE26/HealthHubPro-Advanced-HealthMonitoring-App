import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const alias = {
  '@': path.resolve(rootDir, 'client/src'),
  '@shared': path.resolve(rootDir, 'shared'),
};

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        plugins: [react()],
        test: {
          name: 'client',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./test/setup.client.ts'],
          include: ['client/**/*.test.{ts,tsx}'],
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'server',
          environment: 'node',
          globals: true,
          include: ['server/**/*.test.ts', 'shared/**/*.test.ts', 'test/**/*.test.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html'],
      include: ['client/src/**/*.{ts,tsx}', 'server/**/*.ts', 'shared/**/*.ts'],
      exclude: ['**/*.test.*', 'client/src/components/ui/**', '**/*.d.ts'],
    },
  },
});
