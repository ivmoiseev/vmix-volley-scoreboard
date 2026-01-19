/**
 * Entry point для Electron main process
 * 
 * В dev режиме: tsx загружен через NODE_OPTIONS, TypeScript файлы компилируются на лету
 * В production: TypeScript файлы скомпилированы в JavaScript перед сборкой
 * 
 * Этот файл просто импортирует main.js - в production все уже скомпилировано в .js
 */

// Проверяем, загружен ли tsx через NODE_OPTIONS (dev режим)
const tsxAlreadyLoaded = process.env.NODE_OPTIONS && process.env.NODE_OPTIONS.includes('tsx');

if (tsxAlreadyLoaded) {
  console.log('[main-entry] Dev режим: tsx загружен через NODE_OPTIONS');
} else {
  console.log('[main-entry] Production режим: используем скомпилированные JavaScript файлы');
}

// Импортируем основной файл main.js
// В production все TypeScript файлы уже скомпилированы в .js
await import('./main.js');
