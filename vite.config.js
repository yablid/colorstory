import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
        'style-guide': './style-guide.html',
        editor: './editor.html'
      }
    }
  }
});
