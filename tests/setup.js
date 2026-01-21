/**
 * Настройка тестового окружения
 * Выполняется перед каждым тестом
 */

// Импортируем jest-dom для дополнительных матчеров (работает с Vitest)
import '@testing-library/jest-dom';

// Импортируем vi из vitest для моков
import { vi } from 'vitest';

// В Vitest таймаут настраивается в vite.config.js (testTimeout: 10000)

// Моки для Electron API (если нужно)
global.electronAPI = global.electronAPI || {
  getVersion: vi.fn(),
  createMatch: vi.fn(),
  openMatchDialog: vi.fn(),
  saveMatch: vi.fn(),
  saveMatchDialog: vi.fn(),
  getVMixConfig: vi.fn(),
  setVMixConfig: vi.fn(),
  testVMixConnection: vi.fn(),
  updateVMixInput: vi.fn(),
  updateVMixInputFields: vi.fn(),
  showVMixOverlay: vi.fn(),
  hideVMixOverlay: vi.fn(),
  getVMixOverlayState: vi.fn(),
  startMobileServer: vi.fn(),
  stopMobileServer: vi.fn(),
  getMobileServerInfo: vi.fn(),
  generateMobileSession: vi.fn(),
  getSavedMobileSession: vi.fn(),
  setMobileMatch: vi.fn(),
  isMobileServerRunning: vi.fn(),
  getNetworkInterfaces: vi.fn(),
  setSelectedIP: vi.fn(),
  setCurrentMatch: vi.fn(),
  markMatchSaved: vi.fn(),
  swapTeams: vi.fn(),
  getAutoSaveSettings: vi.fn(),
  setAutoSaveSettings: vi.fn(),
  checkForUpdates: vi.fn(),
  downloadUpdate: vi.fn(),
  installUpdate: vi.fn(),
  getAutoUpdateSettings: vi.fn(),
  setAutoUpdateSettings: vi.fn(),
  onUpdateStatus: vi.fn(() => () => {}), // Возвращает функцию cleanup
  onAutoUpdateSettingsChanged: vi.fn(() => () => {}), // Возвращает функцию cleanup
};

// Моки для window объекта
global.window = global.window || {
  electronAPI: global.electronAPI,
  location: {
    hostname: 'localhost',
  },
  history: {
    replaceState: vi.fn(),
  },
};

// Моки для document (для тестов DOM)
if (typeof document === 'undefined') {
  global.document = {
    createElement: vi.fn(() => ({
      textContent: '',
      innerHTML: '',
      style: {},
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      firstChild: null,
    })),
    getElementById: vi.fn(),
  };
}

// Подавление console.warn и console.error в тестах (опционально)
// Раскомментируйте, если нужно скрыть логи в тестах
// global.console = {
//   ...console,
//   warn: vi.fn(),
//   error: vi.fn(),
// };
