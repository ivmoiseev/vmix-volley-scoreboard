/**
 * Конфигурация Jest для тестирования
 */

export default {
  // Тестовое окружение
  // Используем jsdom для тестов React компонентов, node для остальных
  testEnvironment: 'jsdom',
  
  // Поддержка ES модулей
  extensionsToTreatAsEsm: ['.js'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  
  // Корневая директория проекта
  rootDir: '.',
  
  // Папки для поиска тестов
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/tests/**/*.test.js',
  ],
  
  // Папки, которые нужно игнорировать
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/release/',
  ],
  
  // Модули, которые нужно трансформировать (для ES6 модулей в node_modules)
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)',
  ],
  
  // Настройки для модулей
  moduleFileExtensions: ['js', 'jsx', 'json', 'ts', 'tsx'],
  
  // Расширения для разрешения модулей
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  
  // Трансформация файлов
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  
  // Настройки для покрытия кода
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
    '!src/**/__tests__/**',
    '!src/renderer/index.jsx',
    '!src/main/main.js', // Точка входа Electron
  ],
  
  // Порог покрытия кода
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
    // Для критических модулей - выше порог
    'src/shared/volleyballRules.js': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'src/shared/matchUtils.js': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // Папка для отчетов о покрытии
  coverageDirectory: 'coverage',
  
  // Форматы отчетов
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Настройки для модулей
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Мокируем TypeScript файлы
    '^.*/types/Match$': '<rootDir>/tests/__mocks__/Match.js',
  },
  
  // Настройки для setup файлов
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Очистка моков между тестами
  clearMocks: true,
  
  // Восстановление моков между тестами
  restoreMocks: true,
  
  // Вербозность
  verbose: true,
  
  // Настройки для JUnit reporter (для CI/CD)
  reporters: [
    'default',
    // JUnit XML reporter будет добавлен через CLI флаг или переменную окружения
  ],
  
  // Настройки для jest-junit
  // Эти настройки применяются только если jest-junit установлен
  // и используется через --reporters=jest-junit
};
