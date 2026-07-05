import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  // Relative assets work both at a custom domain and under /repository-name/ on GitHub Pages.
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        admin: resolve(import.meta.dirname, 'admin.html'),
        submit: resolve(import.meta.dirname, 'submit.html'),
      },
    },
  },
});
