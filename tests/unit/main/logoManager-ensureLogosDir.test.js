/**
 * Тесты для проверки создания папки logos и миграции в production режиме
 * 
 * Проверяем:
 * 1. Создание папки logos, если она не существует
 * 2. Корректная работа ensureLogosDir при повторных вызовах
 * 3. Импорт app из electron работает корректно (критично для production)
 */

import { describe, test, beforeEach, afterEach, expect, vi } from 'vitest';
import path from 'path';
import { promises as fs } from 'fs';

// Используем mockPath для доступа внутри vi.mock()
const mockPath = path;

// Моки должны быть установлены ДО импорта модулей
vi.mock('electron', () => ({
  app: {
    isPackaged: false, // По умолчанию dev режим
  },
}));

// Мокируем pathUtils
vi.mock('../../../src/main/utils/pathUtils.ts', () => ({
  getLogosDir: vi.fn(),
  getExtraResourcesLogosDir: vi.fn(() => null),
}));

// Моки для server.ts чтобы избежать проблем с uuid
vi.mock('../../../src/main/server.ts', () => ({}));

describe('logoManager - ensureLogosDir', () => {
  let testLogosDir;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Создаем временную директорию для тестов
    testLogosDir = mockPath.join(process.cwd(), 'tests', 'temp-test-logos');
    
    // Очищаем тестовую директорию
    try {
      await fs.rm(testLogosDir, { recursive: true, force: true });
    } catch (error) {
      // Игнорируем ошибки
    }
    
    // Настраиваем мок getLogosDir
    const { getLogosDir } = await import('../../../src/main/utils/pathUtils.ts');
    vi.mocked(getLogosDir).mockReturnValue(testLogosDir);
  });
  
  afterEach(async () => {
    // Очищаем тестовую директорию после тестов
    try {
      await fs.rm(testLogosDir, { recursive: true, force: true });
    } catch (error) {
      // Игнорируем ошибки
    }
  });

  test('ensureLogosDir должен создавать папку logos, если она не существует', async () => {
    // Импортируем logoManager
    const logoManager = await import('../../../src/main/logoManager.ts');
    
    // Проверяем, что папка не существует
    try {
      await fs.access(testLogosDir);
      // Если папка существует, удаляем её
      await fs.rm(testLogosDir, { recursive: true, force: true });
    } catch {
      // Папка не существует - это нормально
    }
    
    // Вызываем ensureLogosDir
    await logoManager.ensureLogosDir();
    
    // Проверяем, что папка создана
    await expect(fs.access(testLogosDir)).resolves.not.toThrow();
    
    // Проверяем, что это директория
    const stats = await fs.stat(testLogosDir);
    expect(stats.isDirectory()).toBe(true);
  });

  test('ensureLogosDir должен корректно работать при повторных вызовах', async () => {
    // Импортируем logoManager
    const logoManager = await import('../../../src/main/logoManager.ts');
    
    // Первый вызов
    await logoManager.ensureLogosDir();
    await expect(fs.access(testLogosDir)).resolves.not.toThrow();
    
    // Второй вызов - не должно быть ошибки
    await expect(logoManager.ensureLogosDir()).resolves.not.toThrow();
    
    // Третий вызов - не должно быть ошибки
    await expect(logoManager.ensureLogosDir()).resolves.not.toThrow();
    
    // Проверяем, что папка все еще существует
    await expect(fs.access(testLogosDir)).resolves.not.toThrow();
  });

  test('ensureLogosDir должен использовать app из electron для проверки production режима', async () => {
    // Импортируем electron и logoManager
    const electron = await import('electron');
    const logoManager = await import('../../../src/main/logoManager.ts');
    
    // Проверяем, что app доступен (критично для исправления бага)
    expect(electron.app).toBeDefined();
    expect(electron.app.isPackaged).toBeDefined();
    
    // Вызываем ensureLogosDir - не должно быть ошибки из-за отсутствия app
    await expect(logoManager.ensureLogosDir()).resolves.not.toThrow();
  });

  test('ensureLogosDir должен работать в production режиме (isPackaged = true)', async () => {
    // Настраиваем мок для production режима
    const electron = await import('electron');
    vi.mocked(electron.app).isPackaged = true;
    
    // Импортируем logoManager
    const logoManager = await import('../../../src/main/logoManager.ts');
    
    // Вызываем ensureLogosDir - не должно быть ошибки
    await expect(logoManager.ensureLogosDir()).resolves.not.toThrow();
    
    // Проверяем, что папка создана
    await expect(fs.access(testLogosDir)).resolves.not.toThrow();
  });
});
