import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Source lives in site/. The build is written to the repository root so that
// GitHub Pages / Cloudflare Pages can serve it directly with no build settings.
export default defineConfig({
  root: 'site',
  base: './',
  plugins: [react()],
  build: {
    outDir: '..',
    emptyOutDir: false,
    target: 'es2020',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'site/index.html'),
        tour: resolve(import.meta.dirname, 'site/tour.html')
      }
    }
  }
});
