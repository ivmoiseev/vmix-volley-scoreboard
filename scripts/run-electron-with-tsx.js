#!/usr/bin/env node
/**
 * Скрипт для запуска Electron с поддержкой TypeScript через tsx
 * Используется вместо прямого вызова electron с NODE_OPTIONS
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Определяем путь к Electron
// В Windows это electron.cmd, в Unix - electron
const isWindows = process.platform === 'win32';
const projectRoot = join(__dirname, '..');

// Пробуем найти Electron в разных местах
const electronBinName = isWindows ? 'electron.cmd' : 'electron';
const electronPath = join(projectRoot, 'node_modules', '.bin', electronBinName);

let electronCommand;
let electronArgs;

if (existsSync(electronPath)) {
  // Используем прямой путь к Electron
  electronCommand = electronPath;
  electronArgs = [projectRoot];
  console.log('Используется Electron из node_modules/.bin');
} else {
  // Используем npx для запуска electron
  electronCommand = isWindows ? 'npx.cmd' : 'npx';
  electronArgs = ['electron', projectRoot];
  console.log('Используется npx для запуска Electron');
}

// Устанавливаем NODE_OPTIONS для поддержки tsx
// Важно: используем правильный синтаксис для Node.js 20+
const nodeOptions = '--import tsx/esm';

console.log('Запуск Electron с поддержкой TypeScript...');
console.log('NODE_OPTIONS:', nodeOptions);
console.log('Команда:', electronCommand);
console.log('Аргументы:', electronArgs);

// Создаем окружение с NODE_OPTIONS
const env = {
  ...process.env,
  NODE_OPTIONS: nodeOptions,
};

// Запускаем Electron
// Важно: в Windows нужно использовать shell: true для правильной обработки .cmd файлов
const electron = spawn(electronCommand, electronArgs, {
  stdio: 'inherit',
  shell: isWindows, // В Windows используем shell для правильной обработки .cmd
  env: env,
  cwd: projectRoot,
});

electron.on('error', (error) => {
  console.error('Ошибка при запуске Electron:', error);
  console.error('Команда:', electronCommand);
  console.error('Аргументы:', electronArgs);
  console.error('NODE_OPTIONS:', nodeOptions);
  process.exit(1);
});

electron.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`Electron завершился с кодом ${code}`);
  }
  process.exit(code || 0);
});

// Обработка сигналов для корректного завершения
process.on('SIGTERM', () => {
  if (electron && !electron.killed) {
    electron.kill('SIGTERM');
  }
});

process.on('SIGINT', () => {
  if (electron && !electron.killed) {
    electron.kill('SIGINT');
  }
});
