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
    // Inline the logo so the single-file build stays self-contained.
    assetsInlineLimit: 100000,
    rollupOptions: {
      input: 'index.html'
    }
  }
});
