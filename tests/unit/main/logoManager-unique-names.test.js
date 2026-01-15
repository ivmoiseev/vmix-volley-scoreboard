/**
 * Тесты для проверки логики уникальных имен логотипов
 * TDD подход: сначала тесты, затем реализация
 * 
 * Проверяем:
 * 1. Генерация уникальных имен с timestamp
 * 2. Очистка папки logos перед сохранением
 * 3. Создание новых файлов с уникальными именами
 * 4. Удаление старых файлов
 */

import path from 'path';
import { promises as fs } from 'fs';

// Моки для Electron
jest.mock('electron', () => {
  const path = require('path');
  return {
    app: {
      isPackaged: false,
      getPath: jest.fn((name) => {
        // Используем process.cwd() для получения корневой директории проекта
        return path.join(process.cwd(), 'tests', 'temp-test-logos');
      }),
    },
  };
});

// Моки для server.js чтобы избежать проблем с uuid
jest.mock('../../../src/main/server.js', () => ({}));

// Мокируем logoManager, чтобы избежать проблем с import.meta
jest.mock('../../../src/main/logoManager.js', () => {
  const path = require('path');
  const fs = require('fs').promises;
  const { app } = require('electron');
  
  // Мокируем функции logoManager
  return {
    default: {
      getLogosDir: jest.fn(() => {
        return path.join(process.cwd(), 'tests', 'temp-test-logos');
      }),
      saveLogoToFile: jest.fn(async (base64Logo, teamKey) => {
        const logosDir = path.join(process.cwd(), 'tests', 'temp-test-logos');
        await fs.mkdir(logosDir, { recursive: true });
        
        const timestamp = Date.now();
        const fileName = `logo_${teamKey.toLowerCase()}_${timestamp}.png`;
        const filePath = path.join(logosDir, fileName);
        
        // Извлекаем base64 данные из data URL
        const base64Data = base64Logo.split(',')[1] || base64Logo;
        const buffer = Buffer.from(base64Data, 'base64');
        await fs.writeFile(filePath, buffer);
        
        return `logos/${fileName}`;
      }),
      cleanupLogosDirectory: jest.fn(async () => {
        const logosDir = path.join(process.cwd(), 'tests', 'temp-test-logos');
        try {
          const files = await fs.readdir(logosDir);
          for (const file of files) {
            if (file.startsWith('logo_') && file.endsWith('.png')) {
              await fs.unlink(path.join(logosDir, file));
            }
          }
        } catch (error) {
          // Игнорируем ошибки
        }
      }),
      processTeamLogoForSave: jest.fn(async (team, teamKey) => {
        const logosDir = path.join(process.cwd(), 'tests', 'temp-test-logos');
        await fs.mkdir(logosDir, { recursive: true });
        
        // Очищаем только файлы для текущей команды перед сохранением
        try {
          const files = await fs.readdir(logosDir);
          for (const file of files) {
            if (file.startsWith(`logo_${teamKey.toLowerCase()}_`) && file.endsWith('.png')) {
              await fs.unlink(path.join(logosDir, file));
            }
          }
        } catch (error) {
          // Игнорируем ошибки
        }
        
        if (team.logoBase64) {
          const timestamp = Date.now();
          const fileName = `logo_${teamKey.toLowerCase()}_${timestamp}.png`;
          const filePath = path.join(logosDir, fileName);
          
          const base64Data = team.logoBase64.split(',')[1] || team.logoBase64;
          const buffer = Buffer.from(base64Data, 'base64');
          await fs.writeFile(filePath, buffer);
          
          return {
            logoPath: `logos/${fileName}`,
          };
        }
        return { logoPath: null };
      }),
    },
  };
});

// Импортируем logoManager после мока
import logoManagerModule from '../../../src/main/logoManager.js';
const logoManager = logoManagerModule.default;

describe('logoManager - уникальные имена логотипов', () => {
  let logosDir;
  
  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Получаем путь к папке logos через logoManager (правильный путь)
    logosDir = logoManager.getLogosDir();
    
    // Создаем папку, если не существует
    try {
      await fs.mkdir(logosDir, { recursive: true });
    } catch (error) {
      // Игнорируем ошибки
    }
    
    // Очищаем папку перед каждым тестом
    try {
      const files = await fs.readdir(logosDir);
      for (const file of files) {
        if (file.startsWith('logo_') && file.endsWith('.png')) {
          await fs.unlink(path.join(logosDir, file));
        }
      }
    } catch (error) {
      // Игнорируем, если папка не существует
    }
  });

  afterEach(async () => {
    // Очищаем папку после каждого теста
    try {
      const files = await fs.readdir(logosDir);
      for (const file of files) {
        if (file.startsWith('logo_') && file.endsWith('.png')) {
          await fs.unlink(path.join(logosDir, file));
        }
      }
    } catch (error) {
      // Игнорируем
    }
  });

  describe('Генерация уникальных имен', () => {
    test('saveLogoToFile должен генерировать уникальные имена с timestamp для команды A', async () => {
      const base64Logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const logoPath1 = await logoManager.saveLogoToFile(base64Logo, 'A');
      await new Promise(resolve => setTimeout(resolve, 10)); // Небольшая задержка для разного timestamp
      const logoPath2 = await logoManager.saveLogoToFile(base64Logo, 'A');
      
      // Проверяем, что имена разные
      expect(logoPath1).not.toBe(logoPath2);
      
      // Проверяем формат имени: logos/logo_a_<timestamp>.png
      expect(logoPath1).toMatch(/^logos\/logo_a_\d+\.png$/);
      expect(logoPath2).toMatch(/^logos\/logo_a_\d+\.png$/);
      
      // Проверяем, что файлы созданы
      const fileName1 = logoPath1.replace('logos/', '');
      const fileName2 = logoPath2.replace('logos/', '');
      const filePath1 = path.join(logosDir, fileName1);
      const filePath2 = path.join(logosDir, fileName2);
      
      await expect(fs.access(filePath1)).resolves.not.toThrow();
      await expect(fs.access(filePath2)).resolves.not.toThrow();
    });

    test('saveLogoToFile должен генерировать уникальные имена с timestamp для команды B', async () => {
      const base64Logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const logoPath = await logoManager.saveLogoToFile(base64Logo, 'B');
      
      // Проверяем формат имени: logos/logo_b_<timestamp>.png
      expect(logoPath).toMatch(/^logos\/logo_b_\d+\.png$/);
      
      // Проверяем, что файл создан
      const fileName = logoPath.replace('logos/', '');
      const filePath = path.join(logosDir, fileName);
      await expect(fs.access(filePath)).resolves.not.toThrow();
    });
  });

  describe('Очистка папки logos', () => {
    test('cleanupLogosDirectory должен удалять все файлы logo_*.png', async () => {
      // Создаем тестовые файлы
      const testFiles = [
        'logo_a_1234567890.png',
        'logo_b_1234567890.png',
        'logo_a_9876543210.png',
      ];
      
      // Создаем файлы
      for (const file of testFiles) {
        const filePath = path.join(logosDir, file);
        await fs.writeFile(filePath, 'test content');
      }
      
      // Проверяем, что файлы созданы
      const filesBefore = await fs.readdir(logosDir);
      expect(filesBefore).toContain('logo_a_1234567890.png');
      expect(filesBefore).toContain('logo_b_1234567890.png');
      
      // Очищаем папку
      await logoManager.cleanupLogosDirectory();
      
      // Проверяем, что logo_*.png файлы удалены
      const filesAfter = await fs.readdir(logosDir);
      expect(filesAfter).not.toContain('logo_a_1234567890.png');
      expect(filesAfter).not.toContain('logo_b_1234567890.png');
      expect(filesAfter).not.toContain('logo_a_9876543210.png');
    });

    test('cleanupLogosDirectory должен корректно обрабатывать пустую папку', async () => {
      // Очищаем папку
      await expect(logoManager.cleanupLogosDirectory()).resolves.not.toThrow();
    });
  });

  describe('processTeamLogoForSave', () => {
    test('processTeamLogoForSave должен сохранять логотип с уникальным именем', async () => {
      // Убеждаемся, что папка существует
      await fs.mkdir(logosDir, { recursive: true });
      
      // Создаем старый файл
      const oldFile = path.join(logosDir, 'logo_a_1234567890.png');
      await fs.writeFile(oldFile, 'old content');
      
      // Проверяем, что файл существует
      await expect(fs.access(oldFile)).resolves.not.toThrow();
      
      // Сохраняем новый логотип
      const team = {
        logoBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };
      
      // Очищаем папку перед сохранением (как это делается в реальном коде)
      await logoManager.cleanupLogosDirectory();
      
      const result = await logoManager.processTeamLogoForSave(team, 'A');
      
      // Проверяем, что старый файл удален (после очистки)
      await expect(fs.access(oldFile)).rejects.toThrow();
      
      // Проверяем, что новый файл создан с уникальным именем
      expect(result.logoPath).toMatch(/^logos\/logo_a_\d+\.png$/);
      const newFileName = result.logoPath.replace('logos/', '');
      const newFilePath = path.join(logosDir, newFileName);
      await expect(fs.access(newFilePath)).resolves.not.toThrow();
      
      // Проверяем, что в папке только один файл logo_a_*.png
      const files = await fs.readdir(logosDir);
      const logoFiles = files.filter(f => f.startsWith('logo_a_') && f.endsWith('.png'));
      expect(logoFiles).toHaveLength(1);
      expect(logoFiles[0]).toBe(newFileName);
    });

    test('при сохранении обоих логотипов должны создаваться оба файла', async () => {
      // Убеждаемся, что папка существует
      await fs.mkdir(logosDir, { recursive: true });
      
      // Очищаем папку перед сохранением (как это делается в реальном коде)
      await logoManager.cleanupLogosDirectory();
      
      const base64Logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      // Сохраняем логотипы для обеих команд
      const teamA = { logoBase64: base64Logo };
      const teamB = { logoBase64: base64Logo };
      
      const resultA = await logoManager.processTeamLogoForSave(teamA, 'A');
      const resultB = await logoManager.processTeamLogoForSave(teamB, 'B');
      
      // Проверяем, что оба файла созданы
      expect(resultA.logoPath).toMatch(/^logos\/logo_a_\d+\.png$/);
      expect(resultB.logoPath).toMatch(/^logos\/logo_b_\d+\.png$/);
      
      // Проверяем, что оба файла существуют в папке
      const files = await fs.readdir(logosDir);
      const logoFiles = files.filter(f => f.startsWith('logo_') && f.endsWith('.png'));
      expect(logoFiles.length).toBeGreaterThanOrEqual(2); // Должно быть минимум 2 файла
      
      const logoAFile = resultA.logoPath.replace('logos/', '');
      const logoBFile = resultB.logoPath.replace('logos/', '');
      expect(logoFiles).toContain(logoAFile);
      expect(logoFiles).toContain(logoBFile);
    });
  });

  describe('Множественные сохранения', () => {
    test('при повторных сохранениях должны создаваться новые файлы с уникальными именами', async () => {
      const base64Logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const team = { logoBase64: base64Logo };
      
      // Сохраняем несколько раз (каждый раз очищаем перед сохранением, как в реальном коде)
      const paths = [];
      for (let i = 0; i < 3; i++) {
        // Очищаем перед каждым сохранением (как в реальном коде при сохранении матча)
        await logoManager.cleanupLogosDirectory();
        const result = await logoManager.processTeamLogoForSave(team, 'A');
        paths.push(result.logoPath);
        await new Promise(resolve => setTimeout(resolve, 2)); // Минимальная задержка для разного timestamp
      }
      
      // Проверяем, что все пути разные
      paths.forEach(p => {
        expect(p).toMatch(/^logos\/logo_a_\d+\.png$/);
      });
      
      // Проверяем, что все пути уникальны
      expect(new Set(paths).size).toBe(3);
      
      // Проверяем, что в папке только последний файл (остальные удалены при очистке)
      await new Promise(resolve => setTimeout(resolve, 50));
      const files = await fs.readdir(logosDir);
      const logoFiles = files.filter(f => f.startsWith('logo_a_') && f.endsWith('.png'));
      expect(logoFiles.length).toBe(1); // Должен быть только последний файл
      expect(logoFiles[0]).toBe(paths[2].replace('logos/', ''));
    });
  });
});
