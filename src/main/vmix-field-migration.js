/**
 * Функции миграции конфигураций полей vMix
 * Конвертирует старые типы полей (color, visibility) в новые (fill, text с visible)
 */

import { removeFieldSuffix } from '../shared/vmix-field-utils.js';

/**
 * Мигрирует конфигурацию одного поля
 * @param {Object} field - конфигурация поля
 * @returns {Object} - мигрированная конфигурация поля
 */
function migrateFieldConfig(field) {
  if (!field || typeof field !== 'object') {
    return field;
  }

  const migrated = { ...field };

  // Миграция типа color в fill
  if (migrated.type === 'color') {
    migrated.type = 'fill';
    // Удаляем суффикс из fieldIdentifier, если он есть
    if (migrated.fieldIdentifier) {
      migrated.fieldIdentifier = removeFieldSuffix(migrated.fieldIdentifier);
    }
  }

  // Миграция типа visibility в text с visible: true
  if (migrated.type === 'visibility') {
    migrated.type = 'text';
    migrated.visible = true;
    // Удаляем суффикс из fieldIdentifier, если он есть
    if (migrated.fieldIdentifier) {
      migrated.fieldIdentifier = removeFieldSuffix(migrated.fieldIdentifier);
    }
  }

  // Для всех типов полей удаляем суффиксы из fieldIdentifier
  if (migrated.fieldIdentifier && migrated.type) {
    const cleanedIdentifier = removeFieldSuffix(migrated.fieldIdentifier);
    migrated.fieldIdentifier = cleanedIdentifier;
  }

  return migrated;
}

/**
 * Мигрирует конфигурацию инпута
 * @param {Object} inputConfig - конфигурация инпута
 * @returns {Object} - мигрированная конфигурация инпута
 */
function migrateInputConfig(inputConfig) {
  if (!inputConfig || typeof inputConfig !== 'object') {
    return inputConfig;
  }

  const migrated = { ...inputConfig };

  // Мигрируем все поля в инпуте
  if (migrated.fields && typeof migrated.fields === 'object') {
    migrated.fields = {};
    for (const [fieldKey, field] of Object.entries(inputConfig.fields)) {
      migrated.fields[fieldKey] = migrateFieldConfig(field);
    }
  }

  return migrated;
}

/**
 * Мигрирует всю конфигурацию vMix
 * @param {Object} config - конфигурация vMix
 * @returns {Object} - мигрированная конфигурация
 */
function migrateVMixConfig(config) {
  if (!config || typeof config !== 'object') {
    return config;
  }

  const migrated = { ...config };

  // Мигрируем все инпуты
  if (migrated.inputs && typeof migrated.inputs === 'object') {
    migrated.inputs = {};
    for (const [inputKey, inputConfig] of Object.entries(config.inputs)) {
      migrated.inputs[inputKey] = migrateInputConfig(inputConfig);
    }
  }

  return migrated;
}

export {
  migrateFieldConfig,
  migrateInputConfig,
  migrateVMixConfig,
};
