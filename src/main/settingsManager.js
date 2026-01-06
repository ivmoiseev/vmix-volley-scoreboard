const fs = require('fs').promises;
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, '../../settings.json');

/**
 * Убеждается, что файл настроек существует
 */
async function ensureSettingsFile() {
  try {
    await fs.access(SETTINGS_FILE);
  } catch {
    // Файл не существует, создаем с дефолтными настройками
    const defaultSettings = getDefaultSettings();
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2), 'utf-8');
  }
}

/**
 * Возвращает настройки по умолчанию
 */
function getDefaultSettings() {
  return {
    vmix: {
      host: 'localhost',
      port: 8088,
      inputs: {
        lineup: { name: 'Input1', overlay: 1 },
        statistics: { name: 'Input2', overlay: 1 },
        roster: { name: 'Input3', overlay: 1 },
        startingLineup: { name: 'Input4', overlay: 1 },
        currentScore: { name: 'Input5', overlay: 1 },
        set1Score: { name: 'Input6', overlay: 1 },
        set2Score: { name: 'Input7', overlay: 1 },
        set3Score: { name: 'Input8', overlay: 1 },
        set4Score: { name: 'Input9', overlay: 1 },
        set5Score: { name: 'Input10', overlay: 1 },
        referee1: { name: 'Input11', overlay: 1 },
        referee2: { name: 'Input12', overlay: 1 },
      },
    },
    mobile: {
      enabled: false,
      port: 3000,
      sessionId: null,
    },
  };
}

/**
 * Загружает настройки из файла
 */
async function loadSettings() {
  try {
    await ensureSettingsFile();
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    const settings = JSON.parse(data);
    
    // Миграция: если настройки в старом формате, конвертируем
    if (settings.vmix && settings.vmix.inputs && typeof settings.vmix.inputs.lineup === 'string') {
      // Старый формат: inputs.lineup = 'Input1'
      // Новый формат: inputs.lineup = { name: 'Input1', overlay: 1 }
      const migratedSettings = {
        ...settings,
        vmix: {
          ...settings.vmix,
          inputs: Object.keys(settings.vmix.inputs).reduce((acc, key) => {
            const value = settings.vmix.inputs[key];
            if (typeof value === 'string') {
              acc[key] = {
                name: value,
                overlay: settings.vmix.overlay || 1,
              };
            } else {
              acc[key] = value;
            }
            return acc;
          }, {}),
        },
      };
      // Удаляем старое поле overlay, если оно есть
      delete migratedSettings.vmix.overlay;
      await saveSettings(migratedSettings);
      return migratedSettings;
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
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
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
  return settings.vmix || getDefaultSettings().vmix;
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

module.exports = {
  loadSettings,
  saveSettings,
  getVMixSettings,
  setVMixSettings,
  getMobileSettings,
  setMobileSettings,
  getSetting,
  setSetting,
  SETTINGS_FILE,
};

