import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * `npm run dev` serves the playground; `npm run build` emits the library.
 * One config, because the playground exercises the same source the library
 * ships rather than a copy of it.
 */
export default defineConfig({
  plugins: [react()],
  root: 'playground',
  build: {
    outDir: here('dist'),
    emptyOutDir: false,
    lib: { entry: here('src/index.ts'), formats: ['es'], fileName: () => 'index.js' },
    rollupOptions: {
      external: [/^react($|\/)/, /^react-dom($|\/)/, /^@radix-ui\//, 'lucide-react'],
    },
  },
  server: { port: 5173 },
});
