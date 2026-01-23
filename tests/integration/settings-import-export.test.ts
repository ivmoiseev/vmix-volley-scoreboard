/**
 * Интеграционные тесты для импорта/экспорта настроек
 * Проверяют полный цикл работы с настройками
 * 
 * Примечание: Используются моки для изоляции тестов от файловой системы
 * 
 * Решение проблемы с импортами: Используем статические импорты (как в других интеграционных тестах)
 * вместо динамических, что должно решить проблему с разрешением TypeScript файлов в Vitest.
 */

import { describe, test, beforeEach, afterEach, expect, vi } from 'vitest';
import path from 'path';
import { promises as fs } from 'fs';
// Используем статические импорты вместо динамических (как в других интеграционных тестах)
// ВАЖНО: В интеграционных тестах используется путь ../../ (2 уровня вверх), а не ../../../ (3 уровня)
import { exportSettings, importSettings } from '../../src/main/settingsImportExport.ts';
import * as settingsManager from '../../src/main/settingsManager.ts';

// Моки для settingsManager
vi.mock('../../src/main/settingsManager.ts', async () => {
  const actual = await vi.importActual('../../src/main/settingsManager.ts');
  return {
    ...actual,
    loadSettings: vi.fn(),
    saveSettings: vi.fn(),
  };
});

// Моки для settingsValidator (используем реальную реализацию)
vi.mock('../../src/main/utils/settingsValidator.ts', async () => {
  return await vi.importActual('../../src/main/utils/settingsValidator.ts');
});

// НЕ мокаем settingsImportExport - используем реальную реализацию
// Это интеграционный тест, который должен тестировать реальную работу модуля

describe('Интеграция: импорт и экспорт настроек', () => {
  let testDir: string;
  let exportFile: string;
  let importFile: string;

  beforeEach(async () => {
    testDir = path.join(process.cwd(), 'tests', 'temp-test-settings');
    exportFile = path.join(testDir, 'exported.json');
    importFile = path.join(testDir, 'imported.json');

    // Очищаем тестовую директорию
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Игнорируем ошибки
    }
  });

  afterEach(async () => {
    // Очищаем тестовую директорию после тестов
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Игнорируем ошибки
    }
  });

  test('Полный цикл: экспорт -> импорт должен сохранять все настройки', async () => {
    // Используем статические импорты (как в других интеграционных тестах)
    const { loadSettings, saveSettings } = settingsManager;

    const originalSettings = {
      vmix: {
        host: 'localhost',
        port: 8088,
        inputs: {
          currentScore: {
            enabled: true,
            inputIdentifier: 'Input7',
            overlay: 1,
            fields: {
              scoreA: {
                type: 'text',
                fieldIdentifier: 'ScoreA',
                enabled: true,
              },
              scoreB: {
                type: 'text',
                fieldIdentifier: 'ScoreB',
                enabled: true,
              },
            },
          },
        },
      },
      mobile: {
        enabled: false,
        port: 3000,
        sessionId: null,
        selectedIP: null,
      },
      autoSave: {
        enabled: true,
      },
      autoUpdate: {
        enabled: true,
      },
    };

    // Настраиваем моки
    vi.mocked(loadSettings).mockResolvedValue(originalSettings);
    vi.mocked(saveSettings).mockResolvedValue(true);

    // Экспортируем настройки
    await exportSettings(exportFile);

    // Проверяем, что файл создан
    await expect(fs.access(exportFile)).resolves.not.toThrow();

    // Читаем экспортированные настройки
    const exportedContent = await fs.readFile(exportFile, 'utf-8');
    const exportedSettings = JSON.parse(exportedContent);

    // Проверяем, что все секции экспортированы
    expect(exportedSettings.vmix).toBeDefined();
    expect(exportedSettings.mobile).toBeDefined();
    expect(exportedSettings.autoSave).toBeDefined();
    expect(exportedSettings.autoUpdate).toBeDefined();

    // Импортируем настройки обратно
    // Создаем файл для импорта (копируем экспортированный)
    await fs.writeFile(importFile, exportedContent, 'utf-8');

    // Настраиваем моки для импорта
    const existingSettingsForImport = {
      vmix: {
        host: 'oldhost',
        port: 8080,
        inputs: {},
      },
    };
    vi.mocked(loadSettings).mockResolvedValue(existingSettingsForImport);

    const importResult = await importSettings(importFile);

    expect(importResult.success).toBe(true);
    expect(importResult.merged).toBe(true);

    // Проверяем, что saveSettings была вызвана с объединенными настройками
    expect(saveSettings).toHaveBeenCalled();
    const savedSettings = vi.mocked(saveSettings).mock.calls[vi.mocked(saveSettings).mock.calls.length - 1][0];

    // Проверяем, что все секции сохранены
    expect(savedSettings.vmix.host).toBe('localhost'); // Из импорта
    expect(savedSettings.mobile).toBeDefined(); // Из импорта
    expect(savedSettings.autoSave).toBeDefined(); // Из импорта
    expect(savedSettings.autoUpdate).toBeDefined(); // Из импорта
  });

  test('Импорт частичных настроек должен объединяться с существующими', async () => {
    const { loadSettings, saveSettings } = settingsManager;

    const partialImport = {
      vmix: {
        host: 'newhost',
        port: 9999,
        inputs: {
          currentScore: {
            enabled: true,
            inputIdentifier: 'Input7',
            overlay: 1,
            fields: {
              scoreA: {
                type: 'text',
                fieldIdentifier: 'ScoreA',
                enabled: true,
              },
            },
          },
        },
      },
      // mobile, autoSave, autoUpdate отсутствуют
    };

    const existingSettings = {
      vmix: {
        host: 'localhost',
        port: 8088,
        inputs: {
          currentScore: {
            enabled: true,
            inputIdentifier: 'Input7',
            overlay: 1,
            fields: {
              teamA: {
                type: 'text',
                fieldIdentifier: 'TeamA',
                enabled: true,
              },
            },
          },
        },
      },
      mobile: {
        enabled: false,
        port: 3000,
        sessionId: null,
        selectedIP: null,
      },
      autoSave: {
        enabled: true,
      },
      autoUpdate: {
        enabled: true,
      },
    };

    // Создаем файл для импорта
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(importFile, JSON.stringify(partialImport, null, 2), 'utf-8');

    vi.mocked(loadSettings).mockResolvedValue(existingSettings);
    vi.mocked(saveSettings).mockResolvedValue(true);

    const result = await importSettings(importFile);

    expect(result.success).toBe(true);
    expect(result.merged).toBe(true);

    const savedSettings = vi.mocked(saveSettings).mock.calls[0][0];

    // vmix должен быть обновлен
    expect(savedSettings.vmix.host).toBe('newhost');
    expect(savedSettings.vmix.port).toBe(9999);

    // Остальные секции должны быть сохранены
    expect(savedSettings.mobile).toBeDefined();
    expect(savedSettings.autoSave).toBeDefined();
    expect(savedSettings.autoUpdate).toBeDefined();

    // Поля в инпуте должны быть объединены
    expect(savedSettings.vmix.inputs.currentScore.fields.scoreA).toBeDefined(); // Из импорта
    expect(savedSettings.vmix.inputs.currentScore.fields.teamA).toBeDefined(); // Из существующих
  });

  test('Импорт должен обрабатывать миграцию старых форматов', async () => {
    const { loadSettings, saveSettings } = settingsManager;

    // Старый формат (если бы был такой)
    const oldFormatSettings = {
      vmix: {
        host: 'localhost',
        port: 8088,
        inputs: {
          currentScore: {
            enabled: true,
            inputIdentifier: 'Input7',
            overlay: 1,
            fields: {
              scoreA: {
                type: 'text',
                fieldIdentifier: 'ScoreA',
                enabled: true,
              },
            },
          },
        },
      },
    };

    const existingSettings = {
      vmix: {
        host: 'oldhost',
        port: 8080,
        inputs: {},
      },
    };

    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(importFile, JSON.stringify(oldFormatSettings, null, 2), 'utf-8');

    vi.mocked(loadSettings).mockResolvedValue(existingSettings);
    vi.mocked(saveSettings).mockResolvedValue(true);

    const result = await importSettings(importFile);

    expect(result.success).toBe(true);
    expect(result.merged).toBe(true);

    const savedSettings = vi.mocked(saveSettings).mock.calls[0][0];

    // Настройки должны быть объединены
    expect(savedSettings.vmix.host).toBe('localhost'); // Из импорта
    expect(savedSettings.vmix.inputs.currentScore).toBeDefined(); // Из импорта
  });
});
