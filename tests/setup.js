/**
 * Настройка тестового окружения
 * Выполняется перед каждым тестом
 */

// Увеличиваем таймаут для тестов (по умолчанию 5 секунд)
jest.setTimeout(10000);

// Моки для Electron API (если нужно)
global.electronAPI = global.electronAPI || {
  getVersion: jest.fn(),
  createMatch: jest.fn(),
  openMatchDialog: jest.fn(),
  saveMatch: jest.fn(),
  saveMatchDialog: jest.fn(),
  getVMixConfig: jest.fn(),
  setVMixConfig: jest.fn(),
  testVMixConnection: jest.fn(),
  updateVMixInput: jest.fn(),
  updateVMixInputFields: jest.fn(),
  showVMixOverlay: jest.fn(),
  hideVMixOverlay: jest.fn(),
  getVMixOverlayState: jest.fn(),
  startMobileServer: jest.fn(),
  stopMobileServer: jest.fn(),
  getMobileServerInfo: jest.fn(),
  generateMobileSession: jest.fn(),
  getSavedMobileSession: jest.fn(),
  setMobileMatch: jest.fn(),
  isMobileServerRunning: jest.fn(),
  getNetworkInterfaces: jest.fn(),
  setSelectedIP: jest.fn(),
  setCurrentMatch: jest.fn(),
  markMatchSaved: jest.fn(),
  swapTeams: jest.fn(),
  getAutoSaveSettings: jest.fn(),
  setAutoSaveSettings: jest.fn(),
};

// Моки для window объекта
global.window = global.window || {
  electronAPI: global.electronAPI,
  location: {
    hostname: 'localhost',
  },
  history: {
    replaceState: jest.fn(),
  },
};

// Моки для document (для тестов DOM)
if (typeof document === 'undefined') {
  global.document = {
    createElement: jest.fn(() => ({
      textContent: '',
      innerHTML: '',
      style: {},
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      firstChild: null,
    })),
    getElementById: jest.fn(),
  };
}

// Подавление console.warn и console.error в тестах (опционально)
// Раскомментируйте, если нужно скрыть логи в тестах
// global.console = {
//   ...console,
//   warn: jest.fn(),
//   error: jest.fn(),
// };
