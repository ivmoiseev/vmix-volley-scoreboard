import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  root: path.resolve(__dirname, './src/renderer'),
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    // Для Electron используем относительные пути
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Используем относительные пути для корректной работы в Electron
        format: 'es',
      },
    },
    commonjsOptions: {
      // Включаем обработку CommonJS модулей
      include: [/src\/shared\/.*/],
      transformMixedEsModules: true,
    },
  },
  optimizeDeps: {
    // Включаем обработку CommonJS модулей в зависимостях
    include: ['src/shared/vmix-field-utils.js'],
  },
  server: {
    port: 5173,
    // strictPort: false - позволяет переключиться на другой порт, если 5173 занят
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

