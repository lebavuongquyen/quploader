import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        callbacks: resolve(__dirname, 'callbacks.html'),
        headless: resolve(__dirname, 'headless.html'),
        docs: resolve(__dirname, 'docs.html')
      }
    }
  },
  server: {
    port: 5173,
    host: true,
    cors: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
