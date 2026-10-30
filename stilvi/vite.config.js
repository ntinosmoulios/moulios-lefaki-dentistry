import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  build: {
    outDir: 'dist', assetsInlineLimit: 0, chunkSizeWarningLimit: 900,
    rollupOptions: { input: { main: resolve(import.meta.dirname, 'index.html'), demo: resolve(import.meta.dirname, 'demo.html') } },
  },
})
