// vite.config.js
import { defineConfig } from 'vite';
// 🔑 use the named import, not default
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './',
  plugins: [
    viteSingleFile(),      // ← call the named export
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html'
    }
  }
});
