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
    cssCodeSplit: false,
    outDir: 'dist'
  }
});
