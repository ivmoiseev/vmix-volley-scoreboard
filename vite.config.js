import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      // Включаем поддержку React 18
      jsxRuntime: 'automatic',
    }),
  ],
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
        // Убеждаемся, что все модули правильно обработаны
        generatedCode: {
          constBindings: true,
        },
      },
    },
    commonjsOptions: {
      // Включаем обработку CommonJS модулей, включая React, React Router и все их зависимости
      include: [
        /src\/shared\/.*/,
        /node_modules\/react/,
        /node_modules\/react-dom/,
        /node_modules\/react-router/,
        /node_modules\/react-router-dom/,
        /node_modules\/scheduler/,
      ],
      transformMixedEsModules: true,
      // Принудительно преобразуем все CommonJS в ESM
      strictRequires: true,
      // Обрабатываем все require() вызовы
      requireReturnsDefault: 'auto',
    },
    // Убеждаемся, что все зависимости правильно обработаны
    target: 'esnext',
    minify: 'esbuild',
  },
  optimizeDeps: {
    // Включаем обработку CommonJS модулей в зависимостях
    include: ['src/shared/vmix-field-utils.js', 'react', 'react-dom', 'react-router-dom'],
    esbuildOptions: {
      // Поддержка React 18
      jsx: 'automatic',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Принудительно используем ESM версию React
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
    // strictPort: false - позволяет переключиться на другой порт, если 5173 занят
  },
});

