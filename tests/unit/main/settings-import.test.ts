/**
 * Тесты для импорта настроек
 * TDD подход: сначала тесты (Red), затем реализация (Green)
 */

import { describe, test, beforeEach, afterEach, expect, vi } from 'vitest';
import path from 'path';
import { promises as fs } from 'fs';

// Моки для settingsManager
vi.mock('../../../src/main/settingsManager.ts', async () => {
  const actual = await vi.importActual('../../../src/main/settingsManager.ts');
  return {
    ...actual,
    loadSettings: vi.fn(),
    saveSettings: vi.fn(),
  };
});

// Моки для settingsValidator
vi.mock('../../../src/main/utils/settingsValidator.ts', async () => {
  const actual = await vi.importActual('../../../src/main/utils/settingsValidator.ts');
  return {
    ...actual,
    validateSettings: vi.fn(),
  };
});

describe('settingsImport', () => {
  let testImportDir: string;
  let testImportFile: string;

  beforeEach(async () => {
    testImportDir = path.join(process.cwd(), 'tests', 'temp-test-import');
    testImportFile = path.join(testImportDir, 'imported-settings.json');

    // Очищаем тестовую директорию
    try {
      await fs.rm(testImportDir, { recursive: true, force: true });
    } catch {
      // Игнорируем ошибки
    }
  });

  afterEach(async () => {
    // Очищаем тестовую директорию после тестов
    try {
      await fs.rm(testImportDir, { recursive: true, force: true });
    } catch {
      // Игнорируем ошибки
    }
  });

  test('importSettings должен импортировать настройки из файла', async () => {
    const { importSettings } = await import('../../../src/main/settingsImportExport.ts');
    const { loadSettings, saveSettings } = await import('../../../src/main/settingsManager.ts');
    const { validateSettings } = await import('../../../src/main/utils/settingsValidator.ts');

    const importedData = {
      vmix: {
        host: 'newhost',
        port: 9999,
        inputs: {},
      },
    };

    const existingSettings = {
      vmix: {
        host: 'localhost',
        port: 8088,
        inputs: {},
      },
      mobile: {
        enabled: false,
        port: 3000,
        sessionId: null,
        selectedIP: null,
      },
    };

    // Создаем файл для импорта
    await fs.mkdir(testImportDir, { recursive: true });
    await fs.writeFile(testImportFile, JSON.stringify(importedData, null, 2), 'utf-8');

    vi.mocked(loadSettings).mockResolvedValue(existingSettings);
    vi.mocked(validateSettings).mockReturnValue({ valid: true, errors: [] });
    vi.mocked(saveSettings).mockResolvedValue(true);

    const result = await importSettings(testImportFile);

    expect(result.success).toBe(true);
    expect(result.merged).toBe(true);
    expect(saveSettings).toHaveBeenCalled();
  });

  test('importSettings должен валидировать импортируемые данные', async () => {
    const { importSettings } = await import('../../../src/main/settingsImportExport.ts');
    const { loadSettings } = await import('../../../src/main/settingsManager.ts');
    const { validateSettings } = await import('../../../src/main/utils/settingsValidator.ts');

    const importedData = {
      vmix: {
        host: 'newhost',
        port: 9999,
        inputs: {},
      },
    };

    await fs.mkdir(testImportDir, { recursive: true });
    await fs.writeFile(testImportFile, JSON.stringify(importedData, null, 2), 'utf-8');

    vi.mocked(loadSettings).mockResolvedValue({});
    vi.mocked(validateSettings).mockReturnValue({ valid: true, errors: [] });

    await importSettings(testImportFile);

    // Проверяем, что validateSettings была вызвана с импортированными данными
    expect(validateSettings).toHaveBeenCalledWith(importedData);
  });

  test('importSettings должен выбрасывать ошибку при некорректном JSON', async () => {
    const { importSettings } = await import('../../../src/main/settingsImportExport.ts');

    // Создаем файл с некорректным JSON
    await fs.mkdir(testImportDir, { recursive: true });
    await fs.writeFile(testImportFile, '{ invalid json }', 'utf-8');

    await expect(importSettings(testImportFile)).rejects.toThrow();
  });

  test('importSettings должен выбрасывать ошибку при некорректной структуре', async () => {
    const { importSettings } = await import('../../../src/main/settingsImportExport.ts');
    const { validateSettings } = await import('../../../src/main/utils/settingsValidator.ts');

    const invalidData = {
      vmix: {
        host: '', // Некорректные данные
        port: 70000,
      },
    };

    await fs.mkdir(testImportDir, { recursive: true });
    await fs.writeFile(testImportFile, JSON.stringify(invalidData, null, 2), 'utf-8');

    vi.mocked(validateSettings).mockReturnValue({
      valid: false,
      errors: ['host должен быть непустой строкой', 'port должен быть числом от 1 до 65535'],
    });

    await expect(importSettings(testImportFile)).rejects.toThrow();
  });

  test('importSettings должен объединять настройки (merge), а не перезаписывать', async () => {
    const { importSettings } = await import('../../../src/main/settingsImportExport.ts');
    const { loadSettings, saveSettings } = await import('../../../src/main/settingsManager.ts');
    const { validateSettings } = await import('../../../src/main/utils/settingsValidator.ts');

    const importedData = {
      vmix: {
        host: 'newhost',
        port: 9999,
        inputs: {},
      },
    };

    const existingSettings = {
      vmix: {
        host: 'localhost',
        port: 8088,
        inputs: {},
      },
      mobile: {
        enabled: false,
        port: 3000,
        sessionId: null,
        selectedIP: null,
      },
    };

    await fs.mkdir(testImportDir, { recursive: true });
    await fs.writeFile(testImportFile, JSON.stringify(importedData, null, 2), 'utf-8');

    vi.mocked(loadSettings).mockResolvedValue(existingSettings);
    vi.mocked(validateSettings).mockReturnValue({ valid: true, errors: [] });
    vi.mocked(saveSettings).mockResolvedValue(true);

    await importSettings(testImportFile);

    // Проверяем, что saveSettings была вызвана с объединенными настройками
    expect(saveSettings).toHaveBeenCalled();
    const savedSettings = vi.mocked(saveSettings).mock.calls[0][0];
    
    // vmix должен быть обновлен
    expect(savedSettings.vmix.host).toBe('newhost');
    expect(savedSettings.vmix.port).toBe(9999);
    
    // mobile должен быть сохранен (не удален)
    expect(savedSettings.mobile).toBeDefined();
    expect(savedSettings.mobile.enabled).toBe(false);
  });

  test('importSettings должен сохранять существующие настройки, которых нет в импорте', async () => {
    const { importSettings } = await import('../../../src/main/settingsImportExport.ts');
    const { loadSettings, saveSettings } = await import('../../../src/main/settingsManager.ts');
    const { validateSettings } = await import('../../../src/main/utils/settingsValidator.ts');

    const importedData = {
      vmix: {
        host: 'newhost',
        port: 9999,
        inputs: {},
      },
      // mobile отсутствует в импорте
    };

    const existingSettings = {
      vmix: {
        host: 'localhost',
        port: 8088,
        inputs: {},
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
    };

    await fs.mkdir(testImportDir, { recursive: true });
    await fs.writeFile(testImportFile, JSON.stringify(importedData, null, 2), 'utf-8');

    vi.mocked(loadSettings).mockResolvedValue(existingSettings);
    vi.mocked(validateSettings).mockReturnValue({ valid: true, errors: [] });
    vi.mocked(saveSettings).mockResolvedValue(true);

    await importSettings(testImportFile);

    const savedSettings = vi.mocked(saveSettings).mock.calls[0][0];
    
    // mobile должен быть сохранен
    expect(savedSettings.mobile).toBeDefined();
    expect(savedSettings.mobile.enabled).toBe(false);
    
    // autoSave должен быть сохранен
    expect(savedSettings.autoSave).toBeDefined();
    expect(savedSettings.autoSave.enabled).toBe(true);
  });

  test('importSettings должен обновлять только валидные секции', async () => {
    const { importSettings } = await import('../../../src/main/settingsImportExport.ts');
    const { loadSettings, saveSettings } = await import('../../../src/main/settingsManager.ts');
    const { validateSettings } = await import('../../../src/main/utils/settingsValidator.ts');

    const importedData = {
      vmix: {
        host: 'newhost',
        port: 9999,
        inputs: {},
      },
      mobile: {
        enabled: 'invalid', // Некорректные данные
        port: 3000,
      },
    };

    const existingSettings = {
      vmix: {
        host: 'localhost',
        port: 8088,
        inputs: {},
      },
      mobile: {
        enabled: false,
        port: 3000,
        sessionId: null,
        selectedIP: null,
      },
    };

    await fs.mkdir(testImportDir, { recursive: true });
    await fs.writeFile(testImportFile, JSON.stringify(importedData, null, 2), 'utf-8');

    // Валидация vmix проходит, mobile не проходит
    vi.mocked(validateSettings).mockImplementation((settings) => {
      if (settings.vmix) {
        return { valid: true, errors: [] };
      }
      if (settings.mobile && settings.mobile.enabled === 'invalid') {
        return { valid: false, errors: ['mobile.enabled должен быть boolean'] };
      }
      return { valid: true, errors: [] };
    });

    vi.mocked(loadSettings).mockResolvedValue(existingSettings);
    vi.mocked(saveSettings).mockResolvedValue(true);

    const result = await importSettings(testImportFile);

    // Импорт должен быть частично успешным
    expect(result.success).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings?.length).toBeGreaterThan(0);

    const savedSettings = vi.mocked(saveSettings).mock.calls[0][0];
    // vmix должен быть обновлен
    expect(savedSettings.vmix.host).toBe('newhost');
    // mobile должен остаться прежним (не обновлен из-за ошибки валидации)
    expect(savedSettings.mobile.enabled).toBe(false);
  });

  test('importSettings должен игнорировать неизвестные секции', async () => {
    const { importSettings } = await import('../../../src/main/settingsImportExport.ts');
    const { loadSettings, saveSettings } = await import('../../../src/main/settingsManager.ts');
    const { validateSettings } = await import('../../../src/main/utils/settingsValidator.ts');

    const importedData = {
      vmix: {
        host: 'newhost',
        port: 9999,
        inputs: {},
      },
      unknownSection: {
        someData: 'value',
      },
    };

    const existingSettings = {
      vmix: {
        host: 'localhost',
        port: 8088,
        inputs: {},
      },
    };

    await fs.mkdir(testImportDir, { recursive: true });
    await fs.writeFile(testImportFile, JSON.stringify(importedData, null, 2), 'utf-8');

    vi.mocked(loadSettings).mockResolvedValue(existingSettings);
    vi.mocked(validateSettings).mockReturnValue({ valid: true, errors: [] });
    vi.mocked(saveSettings).mockResolvedValue(true);

    const result = await importSettings(testImportFile);

    expect(result.success).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings?.some(w => w.includes('unknownSection'))).toBe(true);

    const savedSettings = vi.mocked(saveSettings).mock.calls[0][0];
    // unknownSection не должна быть в сохраненных настройках
    expect(savedSettings.unknownSection).toBeUndefined();
  });

  test('importSettings должен обрабатывать частичный импорт (только vmix, только mobile и т.д.)', async () => {
    const { importSettings } = await import('../../../src/main/settingsImportExport.ts');
    const { loadSettings, saveSettings } = await import('../../../src/main/settingsManager.ts');
    const { validateSettings } = await import('../../../src/main/utils/settingsValidator.ts');

    const importedData = {
      vmix: {
        host: 'newhost',
        port: 9999,
        inputs: {},
      },
      // Только vmix, остальные секции отсутствуют
    };

    const existingSettings = {
      vmix: {
        host: 'localhost',
        port: 8088,
        inputs: {},
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
    };

    await fs.mkdir(testImportDir, { recursive: true });
    await fs.writeFile(testImportFile, JSON.stringify(importedData, null, 2), 'utf-8');

    vi.mocked(loadSettings).mockResolvedValue(existingSettings);
    vi.mocked(validateSettings).mockReturnValue({ valid: true, errors: [] });
    vi.mocked(saveSettings).mockResolvedValue(true);

    const result = await importSettings(testImportFile);

    expect(result.success).toBe(true);
    expect(result.merged).toBe(true);

    const savedSettings = vi.mocked(saveSettings).mock.calls[0][0];
    // vmix должен быть обновлен
    expect(savedSettings.vmix.host).toBe('newhost');
    // Остальные секции должны быть сохранены
    expect(savedSettings.mobile).toBeDefined();
    expect(savedSettings.autoSave).toBeDefined();
  });

  test('importSettings должен объединять поля (fields) в инпутах, а не перезаписывать их', async () => {
    const { importSettings } = await import('../../../src/main/settingsImportExport.ts');
    const { loadSettings, saveSettings } = await import('../../../src/main/settingsManager.ts');
    const { validateSettings } = await import('../../../src/main/utils/settingsValidator.ts');

    const importedData = {
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
              // Новое поле, которого нет в существующих
              scoreB: {
                type: 'text',
                fieldIdentifier: 'ScoreB',
                enabled: true,
              },
            },
          },
        },
      },
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
              scoreA: {
                type: 'text',
                fieldIdentifier: 'ScoreA',
                enabled: false, // Существующее поле с другим значением
              },
              // Существующее поле, которого нет в импорте
              teamA: {
                type: 'text',
                fieldIdentifier: 'TeamA',
                enabled: true,
              },
            },
          },
        },
      },
    };

    await fs.mkdir(testImportDir, { recursive: true });
    await fs.writeFile(testImportFile, JSON.stringify(importedData, null, 2), 'utf-8');

    vi.mocked(loadSettings).mockResolvedValue(existingSettings);
    vi.mocked(validateSettings).mockReturnValue({ valid: true, errors: [] });
    vi.mocked(saveSettings).mockResolvedValue(true);

    await importSettings(testImportFile);

    const savedSettings = vi.mocked(saveSettings).mock.calls[0][0];
    const savedFields = savedSettings.vmix.inputs.currentScore.fields;

    // scoreA должен быть обновлен (из импорта)
    expect(savedFields.scoreA.enabled).toBe(true);
    
    // scoreB должен быть добавлен (из импорта)
    expect(savedFields.scoreB).toBeDefined();
    expect(savedFields.scoreB.fieldIdentifier).toBe('ScoreB');
    
    // teamA должен быть сохранен (из существующих)
    expect(savedFields.teamA).toBeDefined();
    expect(savedFields.teamA.fieldIdentifier).toBe('TeamA');
  });

  test('importSettings должен сохранять существующие поля, которых нет в импорте', async () => {
    const { importSettings } = await import('../../../src/main/settingsImportExport.ts');
    const { loadSettings, saveSettings } = await import('../../../src/main/settingsManager.ts');
    const { validateSettings } = await import('../../../src/main/utils/settingsValidator.ts');

    const importedData = {
      vmix: {
        host: 'newhost',
        port: 9999,
        inputs: {
          currentScore: {
            enabled: true,
            inputIdentifier: 'Input7',
            overlay: 1,
            fields: {
              // Только одно поле в импорте
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
                enabled: false,
              },
              teamA: {
                type: 'text',
                fieldIdentifier: 'TeamA',
                enabled: true,
              },
              teamB: {
                type: 'text',
                fieldIdentifier: 'TeamB',
                enabled: true,
              },
            },
          },
        },
      },
    };

    await fs.mkdir(testImportDir, { recursive: true });
    await fs.writeFile(testImportFile, JSON.stringify(importedData, null, 2), 'utf-8');

    vi.mocked(loadSettings).mockResolvedValue(existingSettings);
    vi.mocked(validateSettings).mockReturnValue({ valid: true, errors: [] });
    vi.mocked(saveSettings).mockResolvedValue(true);

    await importSettings(testImportFile);

    const savedSettings = vi.mocked(saveSettings).mock.calls[0][0];
    const savedFields = savedSettings.vmix.inputs.currentScore.fields;

    // scoreA должен быть обновлен
    expect(savedFields.scoreA.enabled).toBe(true);
    
    // teamA и teamB должны быть сохранены
    expect(savedFields.teamA).toBeDefined();
    expect(savedFields.teamB).toBeDefined();
  });
});
