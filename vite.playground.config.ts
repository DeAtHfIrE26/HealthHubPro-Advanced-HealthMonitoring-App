import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/** Builds the playground as a deployable static site. */
export default defineConfig({
  plugins: [react()],
  root: 'playground',
  base: './',
  build: { outDir: fileURLToPath(new URL('dist-playground', import.meta.url)), emptyOutDir: true },
});
