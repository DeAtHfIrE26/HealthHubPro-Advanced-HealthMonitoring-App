import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: 'client',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'client/src'),
      '@shared': path.resolve(rootDir, 'shared'),
    },
  },
  build: {
    outDir: path.resolve(rootDir, 'dist'),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        /*
         * Recharts is deliberately NOT given a manual chunk.
         *
         * Naming it promotes it into the entry's preload set, so index.html
         * emitted <link rel="modulepreload"> for it and every visitor
         * downloaded 365 kB of charting library to look at the login form --
         * the exact opposite of what splitting it was meant to achieve.
         * Leaving it unnamed lets it ride along in the already-lazy
         * ActivityChart chunk, which the dashboard fetches on demand in one
         * request instead of two.
         *
         * React stays named: it is needed for the first paint, so preloading
         * it is correct and keeps it cached across app updates.
         */
        manualChunks(id: string) {
          if (/node_modules\/(react|react-dom|scheduler|wouter)\//.test(id)) {
            return 'react';
          }
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
});
