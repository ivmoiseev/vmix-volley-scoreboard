import fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';
import { getDefaultFieldsForInput, migrateInputToNewFormat } from './vmix-input-configs.ts';
import { migrateVMixConfig } from './vmix-field-migration.ts';
import { getSettingsPath, getDefaultSettingsPath } from './utils/pathUtils.ts';

// Используем единую утилиту для определения путей
function getSettingsFilePath() {
  return getSettingsPath();
}

function getDefaultSettingsFilePath() {
  return getDefaultSettingsPath();
}

// Убираем константу, используем функцию напрямую

/**
 * Убеждается, что файл настроек существует
 */
async function ensureSettingsFile() {
  const settingsPath = getSettingsFilePath();
  
  try {
    await fs.access(settingsPath);
    // Файл существует, всё хорошо
    return;
  } catch {
    // Файл не существует
    const isPackaged = app && app.isPackaged;
    
    if (isPackaged) {
      // В production сначала пытаемся скопировать настройки из extraResources
      try {
        const defaultSettingsPath = getDefaultSettingsFilePath();
        await fs.access(defaultSettingsPath);
        
        // Копируем настройки по умолчанию из extraResources в userData
        const defaultData = await fs.readFile(defaultSettingsPath, 'utf-8');
        // Убеждаемся, что директория userData существует
        const userDataDir = app.getPath('userData');
        await fs.mkdir(userDataDir, { recursive: true });
        // Сохраняем копию в userData
        await fs.writeFile(settingsPath, defaultData, 'utf-8');
        console.log('[SettingsManager] Скопированы настройки по умолчанию из extraResources в userData');
        return;
      } catch (copyError) {
        console.log('[SettingsManager] Не удалось скопировать настройки из extraResources, создаем новые:', copyError.message);
        // Если не удалось скопировать, создаем с дефолтными настройками
      }
    }
    
    // Создаем файл с дефолтными настройками
    const defaultSettings = getDefaultSettings();
    // Убеждаемся, что директория существует
    const settingsDir = path.dirname(settingsPath);
    await fs.mkdir(settingsDir, { recursive: true });
    await fs.writeFile(settingsPath, JSON.stringify(defaultSettings, null, 2), 'utf-8');
  }
}

/**
 * Возвращает настройки по умолчанию
 */
function getDefaultSettings() {
  // Определяем имена инпутов по умолчанию
  const defaultInputNames = {
    lineup: 'Input1',
    statistics: 'Input2',
    rosterTeamA: 'Input3',
    rosterTeamB: 'Input4',
    startingLineupTeamA: 'Input5',
    startingLineupTeamB: 'Input6',
    currentScore: 'Input7',
    set1Score: 'Input8',
    set2Score: 'Input9',
    set3Score: 'Input10',
    set4Score: 'Input11',
    set5Score: 'Input12',
    referee1: 'Input13',
    referee2: 'Input14',
  };

  // Создаем конфигурацию инпутов с новой структурой
  const inputs = {};
  for (const [key, defaultName] of Object.entries(defaultInputNames)) {
    const defaultFields = getDefaultFieldsForInput(key) || {};
    inputs[key] = {
      enabled: true,
      inputIdentifier: defaultName,
      overlay: 1,
      fields: defaultFields,
    };
  }

  return {
    vmix: {
      host: 'localhost',
      port: 8088,
      connectionState: 'disconnected',
      inputOrder: [],
      inputs,
    },
    mobile: {
      enabled: false,
      port: 3000,
      sessionId: null,
      selectedIP: null, // Выбранный IP адрес сетевого интерфейса
    },
    autoSave: {
      enabled: true, // По умолчанию автосохранение включено
    },
    autoUpdate: {
      enabled: true, // По умолчанию автоматические обновления включены
    },
    ui: {
      theme: 'light', // 'light' | 'dark' | 'system'
    },
  };
}

/**
 * Загружает настройки из файла
 */
async function loadSettings() {
  try {
    await ensureSettingsFile();
    const settingsPath = getSettingsFilePath();
    const data = await fs.readFile(settingsPath, 'utf-8');
    const settings = JSON.parse(data);
    
    // Миграция: если настройки в старом формате, конвертируем
    if (settings.vmix && settings.vmix.inputs) {
      let needsMigration = false;
      
      // Проверяем, нужно ли мигрировать
      for (const key of Object.keys(settings.vmix.inputs)) {
        const inputValue = settings.vmix.inputs[key];
        // Если формат старый (строка или объект с name/overlay без fields/enabled)
        if (typeof inputValue === 'string' || 
            (inputValue && typeof inputValue === 'object' && 
             !Object.prototype.hasOwnProperty.call(inputValue, 'enabled') && 
             !Object.prototype.hasOwnProperty.call(inputValue, 'fields'))) {
          needsMigration = true;
          break;
        }
      }

      if (needsMigration) {
        const migratedSettings = {
          ...settings,
          vmix: {
            ...settings.vmix,
            inputs: Object.keys(settings.vmix.inputs).reduce((acc, key) => {
              const value = settings.vmix.inputs[key];
              
              // Миграция старых ключей roster и startingLineup в новый формат
              if (key === 'roster') {
                // Преобразуем roster в rosterTeamA и rosterTeamB
                acc['rosterTeamA'] = migrateInputToNewFormat(value, 'rosterTeamA');
                acc['rosterTeamB'] = migrateInputToNewFormat(value, 'rosterTeamB');
                // Если есть inputIdentifier, используем его, иначе создаем два разных
                if (value && typeof value === 'object' && value.inputIdentifier) {
                  acc['rosterTeamB'].inputIdentifier = value.inputIdentifier + '_B';
                } else if (typeof value === 'string') {
                  acc['rosterTeamA'].inputIdentifier = value;
                  acc['rosterTeamB'].inputIdentifier = value + '_B';
                }
                return acc;
              }
              
              if (key === 'startingLineup') {
                // Преобразуем startingLineup в startingLineupTeamA и startingLineupTeamB
                acc['startingLineupTeamA'] = migrateInputToNewFormat(value, 'startingLineupTeamA');
                acc['startingLineupTeamB'] = migrateInputToNewFormat(value, 'startingLineupTeamB');
                // Если есть inputIdentifier, используем его, иначе создаем два разных
                if (value && typeof value === 'object' && value.inputIdentifier) {
                  acc['startingLineupTeamB'].inputIdentifier = value.inputIdentifier + '_B';
                } else if (typeof value === 'string') {
                  acc['startingLineupTeamA'].inputIdentifier = value;
                  acc['startingLineupTeamB'].inputIdentifier = value + '_B';
                }
                return acc;
              }
              
              // Для остальных ключей просто мигрируем в новый формат
              acc[key] = migrateInputToNewFormat(value, key);
              return acc;
            }, {}),
          },
        };
        // Удаляем старое поле overlay, если оно есть
        delete migratedSettings.vmix.overlay;
        await saveSettings(migratedSettings);
        return migratedSettings;
      }
      
      // Дополнительная миграция: если есть старые ключи roster/startingLineup, преобразуем их
      if (settings.vmix && settings.vmix.inputs) {
        let needsRosterMigration = false;
        const newInputs = { ...settings.vmix.inputs };
        
        if (newInputs.roster && !newInputs.rosterTeamA) {
          needsRosterMigration = true;
          newInputs.rosterTeamA = migrateInputToNewFormat(newInputs.roster, 'rosterTeamA');
          newInputs.rosterTeamB = migrateInputToNewFormat(newInputs.roster, 'rosterTeamB');
          // Настраиваем разные inputIdentifier для команд
          if (newInputs.roster.inputIdentifier) {
            newInputs.rosterTeamA.inputIdentifier = newInputs.roster.inputIdentifier;
            newInputs.rosterTeamB.inputIdentifier = newInputs.roster.inputIdentifier + '_B';
          }
          delete newInputs.roster;
        }
        
        if (newInputs.startingLineup && !newInputs.startingLineupTeamA) {
          needsRosterMigration = true;
          newInputs.startingLineupTeamA = migrateInputToNewFormat(newInputs.startingLineup, 'startingLineupTeamA');
          newInputs.startingLineupTeamB = migrateInputToNewFormat(newInputs.startingLineup, 'startingLineupTeamB');
          // Настраиваем разные inputIdentifier для команд
          if (newInputs.startingLineup.inputIdentifier) {
            newInputs.startingLineupTeamA.inputIdentifier = newInputs.startingLineup.inputIdentifier;
            newInputs.startingLineupTeamB.inputIdentifier = newInputs.startingLineup.inputIdentifier + '_B';
          }
          delete newInputs.startingLineup;
        }
        
        if (needsRosterMigration) {
          const migratedSettings = {
            ...settings,
            vmix: {
              ...settings.vmix,
              inputs: newInputs,
            },
          };
          await saveSettings(migratedSettings);
          return migratedSettings;
        }
      }

      // Добавляем недостающие инпуты и поля из конфигурации по умолчанию
      const defaultInputNames = {
        lineup: 'Input1',
        statistics: 'Input2',
        rosterTeamA: 'Input3',
        rosterTeamB: 'Input4',
        startingLineupTeamA: 'Input5',
        startingLineupTeamB: 'Input6',
        currentScore: 'Input7',
        set1Score: 'Input8',
        set2Score: 'Input9',
        set3Score: 'Input10',
        set4Score: 'Input11',
        set5Score: 'Input12',
        referee1: 'Input13',
        referee2: 'Input14',
      };

      let needsFieldsMigration = false;
      const inputs = settings.vmix.inputs || {};

      // Проверяем и добавляем недостающие инпуты
      for (const [key, defaultName] of Object.entries(defaultInputNames)) {
        if (!inputs[key]) {
          needsFieldsMigration = true;
          const defaultFields = getDefaultFieldsForInput(key) || {};
          inputs[key] = {
            enabled: true,
            inputIdentifier: defaultName,
            overlay: 1,
            fields: defaultFields,
          };
        } else {
          // Инпут существует, проверяем и дополняем его поля
          const input = inputs[key];
          const defaultFields = getDefaultFieldsForInput(key) || {};
          const existingFields = input.fields || {};
          
          // Объединяем поля: сначала defaults, затем существующие (чтобы сохранить пользовательские настройки)
          const mergedFields = { ...defaultFields };
          for (const [fieldKey, existingField] of Object.entries(existingFields)) {
            if (mergedFields[fieldKey]) {
              // Поле есть в defaults - объединяем, сохраняя пользовательские настройки
              mergedFields[fieldKey] = {
                ...mergedFields[fieldKey], // defaults имеют приоритет для type
                ...existingField,
                // Переопределяем тип из defaults (важно для обновления типов)
                type: mergedFields[fieldKey].type,
                // Убеждаемся, что fieldIdentifier есть (если нет, используем из defaults)
                fieldIdentifier: existingField.fieldIdentifier || mergedFields[fieldKey].fieldIdentifier,
              };
            } else {
              // Поле отсутствует в defaults, но есть в существующих - добавляем как есть
              mergedFields[fieldKey] = existingField;
            }
          }
          
          // Если добавились новые поля, отмечаем необходимость миграции
          if (Object.keys(mergedFields).length > Object.keys(existingFields).length) {
            needsFieldsMigration = true;
            input.fields = mergedFields;
          }
          
          // Убеждаемся, что у инпута есть все необходимые свойства
          if (input.enabled === undefined) {
            needsFieldsMigration = true;
            input.enabled = true;
          }
          if (!input.inputIdentifier) {
            needsFieldsMigration = true;
            input.inputIdentifier = defaultName;
          }
          if (input.overlay === undefined) {
            needsFieldsMigration = true;
            input.overlay = 1;
          }
        }
      }

      if (needsFieldsMigration) {
        const migratedSettings = {
          ...settings,
          vmix: {
            ...settings.vmix,
            inputs,
          },
        };
        await saveSettings(migratedSettings);
        // Применяем миграцию типов полей
        const fieldTypesMigrated = migrateVMixConfig(migratedSettings.vmix);
        if (fieldTypesMigrated !== migratedSettings.vmix) {
          const finalMigrated = {
            ...migratedSettings,
            vmix: fieldTypesMigrated,
          };
          await saveSettings(finalMigrated);
          return finalMigrated;
        }
        return migratedSettings;
      }
    }
    
    // Применяем миграцию типов полей для всех настроек
    if (settings.vmix) {
      const fieldTypesMigrated = migrateVMixConfig(settings.vmix);
      // Проверяем, была ли миграция (сравниваем структуру)
      let needsFieldTypesMigration = false;
      if (fieldTypesMigrated.inputs) {
        for (const [inputKey, inputConfig] of Object.entries(fieldTypesMigrated.inputs)) {
          if (inputConfig.fields) {
            for (const [fieldKey, field] of Object.entries(inputConfig.fields)) {
              const originalField = settings.vmix?.inputs?.[inputKey]?.fields?.[fieldKey];
              if (originalField) {
                if (originalField.type === 'color' && field.type === 'fill') {
                  needsFieldTypesMigration = true;
                  break;
                }
                if (originalField.type === 'visibility' && field.type === 'text') {
                  needsFieldTypesMigration = true;
                  break;
                }
              }
            }
            if (needsFieldTypesMigration) break;
          }
        }
      }
      
      if (needsFieldTypesMigration) {
        const finalMigrated = {
          ...settings,
          vmix: fieldTypesMigrated,
        };
        await saveSettings(finalMigrated);
        return finalMigrated;
      }
    }
    
    return settings;
  } catch (error) {
    console.error('Ошибка при загрузке настроек:', error);
    // Возвращаем настройки по умолчанию
    return getDefaultSettings();
  }
}

/**
 * Сохраняет настройки в файл
 */
async function saveSettings(settings) {
  try {
    await ensureSettingsFile();
    const settingsPath = getSettingsFilePath();
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Ошибка при сохранении настроек:', error);
    throw error;
  }
}

/**
 * Получает настройки vMix
 */
async function getVMixSettings() {
  const settings = await loadSettings();
  const vmix = settings.vmix || getDefaultSettings().vmix;
  if (vmix.connectionState === undefined) {
    vmix.connectionState = 'disconnected';
  }
  if (vmix.inputOrder === undefined) {
    vmix.inputOrder = [];
  }
  if (vmix.inputs === undefined) {
    vmix.inputs = {};
  }
  return vmix;
}

/**
 * Сохраняет настройки vMix
 */
async function setVMixSettings(vmixConfig) {
  const settings = await loadSettings();
  settings.vmix = vmixConfig;
  await saveSettings(settings);
}

/**
 * Получает конкретную настройку
 */
async function getSetting(path) {
  const settings = await loadSettings();
  const keys = path.split('.');
  let value = settings;
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }
  return value;
}

/**
 * Устанавливает конкретную настройку
 */
async function setSetting(path, value) {
  const settings = await loadSettings();
  const keys = path.split('.');
  let current = settings;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
  await saveSettings(settings);
}

/**
 * Получает настройки мобильного сервера
 */
async function getMobileSettings() {
  const settings = await loadSettings();
  if (!settings.mobile) {
    // Если секции mobile нет, создаем её с дефолтными значениями и сохраняем
    const defaultMobile = getDefaultSettings().mobile;
    settings.mobile = defaultMobile;
    await saveSettings(settings);
  }
  return settings.mobile;
}

/**
 * Сохраняет настройки мобильного сервера
 */
async function setMobileSettings(mobileConfig) {
  const settings = await loadSettings();
  // Объединяем с дефолтными настройками, чтобы не потерять структуру
  const defaultMobile = getDefaultSettings().mobile;
  settings.mobile = {
    ...defaultMobile,
    ...mobileConfig,
  };
  await saveSettings(settings);
}

/**
 * Получает настройки автосохранения
 */
async function getAutoSaveSettings() {
  const settings = await loadSettings();
  if (!settings.autoSave) {
    // Если секции autoSave нет, создаем её с дефолтными значениями и сохраняем
    const defaultAutoSave = getDefaultSettings().autoSave;
    settings.autoSave = defaultAutoSave;
    await saveSettings(settings);
  }
  return settings.autoSave;
}

/**
 * Сохраняет настройки автосохранения
 */
async function setAutoSaveSettings(autoSaveConfig) {
  const settings = await loadSettings();
  // Объединяем с дефолтными настройками, чтобы не потерять структуру
  const defaultAutoSave = getDefaultSettings().autoSave;
  settings.autoSave = {
    ...defaultAutoSave,
    ...autoSaveConfig,
  };
  await saveSettings(settings);
}

/**
 * Получает настройки автоматических обновлений
 */
async function getAutoUpdateSettings() {
  const settings = await loadSettings();
  if (!settings.autoUpdate) {
    // Если секции autoUpdate нет, создаем её с дефолтными значениями и сохраняем
    const defaultAutoUpdate = getDefaultSettings().autoUpdate;
    settings.autoUpdate = defaultAutoUpdate;
    await saveSettings(settings);
  }
  return settings.autoUpdate;
}

/**
 * Сохраняет настройки автоматических обновлений
 */
async function setAutoUpdateSettings(autoUpdateConfig) {
  const settings = await loadSettings();
  // Объединяем с дефолтными настройками, чтобы не потерять структуру
  const defaultAutoUpdate = getDefaultSettings().autoUpdate;
  settings.autoUpdate = {
    ...defaultAutoUpdate,
    ...autoUpdateConfig,
  };
  await saveSettings(settings);
}

/**
 * Получает настройки UI (тема и др.)
 */
async function getUISettings() {
  const settings = await loadSettings();
  if (!settings.ui) {
    const defaultUI = getDefaultSettings().ui;
    settings.ui = defaultUI;
    await saveSettings(settings);
  }
  return settings.ui;
}

/**
 * Сохраняет настройки UI
 */
async function setUISettings(uiConfig) {
  const settings = await loadSettings();
  const defaultUI = getDefaultSettings().ui;
  settings.ui = {
    ...defaultUI,
    ...uiConfig,
  };
  await saveSettings(settings);
}

/**
 * Экспортирует настройки в указанный файл
 * @param filePath - путь к файлу для экспорта
 * @throws {Error} если настройки невалидны или произошла ошибка записи
 */
async function exportSettingsToFile(filePath: string): Promise<void> {
  const { exportSettings } = await import('./settingsImportExport.ts');
  return exportSettings(filePath);
}

/**
 * Импортирует настройки из указанного файла
 * @param filePath - путь к файлу для импорта
 * @returns {Promise<ImportResult>} результат импорта
 * @throws {Error} если файл не найден, JSON некорректен или настройки невалидны
 */
async function importSettingsFromFile(filePath: string): Promise<any> {
  const { importSettings } = await import('./settingsImportExport.ts');
  return importSettings(filePath);
}

export {
  loadSettings,
  saveSettings,
  getVMixSettings,
  setVMixSettings,
  getMobileSettings,
  setMobileSettings,
  getAutoSaveSettings,
  setAutoSaveSettings,
  getAutoUpdateSettings,
  setAutoUpdateSettings,
  getUISettings,
  setUISettings,
  getSetting,
  setSetting,
  getSettingsFilePath,
  exportSettingsToFile,
  importSettingsFromFile,
};

