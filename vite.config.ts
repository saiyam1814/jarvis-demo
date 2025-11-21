
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Ensures assets are linked relatively for GitHub Pages
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
