import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/quploader.ts'),
      name: 'QUploader',
      fileName: () => 'quploader.min.js',
      formats: ['iife']
    },
    rollupOptions: {
      external: ['jquery'],
      output: {
        globals: {
          jquery: '$'
        }
      }
    },
    cssCodeSplit: false
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
