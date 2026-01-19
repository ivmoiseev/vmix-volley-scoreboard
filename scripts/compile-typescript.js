#!/usr/bin/env node
/**
 * Скрипт для компиляции TypeScript файлов в JavaScript перед сборкой
 * Это необходимо, так как tsx не может работать в production из-за esbuild в ASAR
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, rmSync, readdirSync, statSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('[compile-typescript] Начало компиляции TypeScript файлов...');

try {
  // Компилируем TypeScript файлы
  // Используем tsc для компиляции только файлов из src/shared и src/main
  console.log('[compile-typescript] Запуск tsc...');
  
  execSync('npx tsc --build tsconfig.build.json', {
    cwd: projectRoot,
    stdio: 'inherit',
  });
  
  console.log('[compile-typescript] ✓ Компиляция завершена успешно');
  console.log('[compile-typescript] JavaScript файлы созданы рядом с TypeScript файлами');
  console.log('[compile-typescript] В production будут использоваться .js файлы вместо .ts');
} catch (error) {
  console.error('[compile-typescript] Ошибка при компиляции TypeScript:', error.message);
  process.exit(1);
}
