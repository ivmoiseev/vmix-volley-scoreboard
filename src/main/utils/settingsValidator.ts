/**
 * Валидатор настроек приложения
 * Проверяет структуру и типы данных в settings.json
 */

/**
 * Результат валидации
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Типы полей в инпутах vMix
 */
export const FIELD_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  COLOR: 'color',
  FILL: 'fill',
  VISIBILITY: 'visibility',
} as const;

export type FieldType = typeof FIELD_TYPES[keyof typeof FIELD_TYPES];

/**
 * Валидные имена инпутов vMix
 */
export const VALID_INPUT_KEYS = [
  'lineup',
  'statistics',
  'rosterTeamA',
  'rosterTeamB',
  'startingLineupTeamA',
  'startingLineupTeamB',
  'currentScore',
  'set1Score',
  'set2Score',
  'set3Score',
  'set4Score',
  'set5Score',
  'referee1',
  'referee2',
] as const;

export type InputKey = typeof VALID_INPUT_KEYS[number];

/**
 * Структура поля в инпуте
 */
export interface InputField {
  type: FieldType;
  fieldIdentifier: string;
  enabled: boolean;
  fieldName?: string; // Опционально, для обратной совместимости
  visible?: boolean; // Опционально, для некоторых типов полей
}

/**
 * Структура инпута vMix
 */
export interface VMixInput {
  enabled: boolean;
  inputIdentifier: string;
  overlay: number;
  fields: Record<string, InputField>;
}

/**
 * Структура настроек vMix
 */
export interface VMixSettings {
  host: string;
  port: number;
  inputs: Record<string, VMixInput>;
}

/**
 * Структура настроек мобильного сервера
 */
export interface MobileSettings {
  enabled: boolean;
  port: number;
  sessionId: string | null;
  selectedIP: string | null;
}

/**
 * Структура настроек автосохранения
 */
export interface AutoSaveSettings {
  enabled: boolean;
}

/**
 * Структура настроек автоматических обновлений
 */
export interface AutoUpdateSettings {
  enabled: boolean;
}

/**
 * Структура настроек UI (тема и др.)
 */
export interface UISettings {
  theme?: 'light' | 'dark' | 'system';
}

/**
 * Полная структура настроек приложения
 */
export interface Settings {
  vmix?: VMixSettings;
  mobile?: MobileSettings;
  autoSave?: AutoSaveSettings;
  autoUpdate?: AutoUpdateSettings;
  ui?: UISettings;
}

/**
 * Валидирует полную структуру настроек
 */
export function validateSettings(settings: any): ValidationResult {
  const errors: string[] = [];

  if (!settings || typeof settings !== 'object') {
    return {
      valid: false,
      errors: ['Настройки должны быть объектом'],
    };
  }

  // Валидируем каждую секцию, если она присутствует
  if (settings.vmix !== undefined) {
    const vmixResult = validateVMixSettings(settings.vmix);
    if (!vmixResult.valid) {
      errors.push(...vmixResult.errors.map(e => `vmix: ${e}`));
    }
  }

  if (settings.mobile !== undefined) {
    const mobileResult = validateMobileSettings(settings.mobile);
    if (!mobileResult.valid) {
      errors.push(...mobileResult.errors.map(e => `mobile: ${e}`));
    }
  }

  if (settings.autoSave !== undefined) {
    const autoSaveResult = validateAutoSaveSettings(settings.autoSave);
    if (!autoSaveResult.valid) {
      errors.push(...autoSaveResult.errors.map(e => `autoSave: ${e}`));
    }
  }

  if (settings.autoUpdate !== undefined) {
    const autoUpdateResult = validateAutoUpdateSettings(settings.autoUpdate);
    if (!autoUpdateResult.valid) {
      errors.push(...autoUpdateResult.errors.map(e => `autoUpdate: ${e}`));
    }
  }

  if (settings.ui !== undefined) {
    const uiResult = validateUISettings(settings.ui);
    if (!uiResult.valid) {
      errors.push(...uiResult.errors.map(e => `ui: ${e}`));
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Валидирует настройки UI
 */
export function validateUISettings(ui: any): ValidationResult {
  const errors: string[] = [];

  if (!ui || typeof ui !== 'object') {
    return {
      valid: false,
      errors: ['ui должен быть объектом'],
    };
  }

  if (ui.theme !== undefined) {
    if (ui.theme !== 'light' && ui.theme !== 'dark' && ui.theme !== 'system') {
      errors.push('theme должен быть "light", "dark" или "system"');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Валидирует настройки vMix
 */
export function validateVMixSettings(vmix: any): ValidationResult {
  const errors: string[] = [];

  if (!vmix || typeof vmix !== 'object') {
    return {
      valid: false,
      errors: ['vmix должен быть объектом'],
    };
  }

  // Проверяем host
  if (typeof vmix.host !== 'string' || vmix.host.trim() === '') {
    errors.push('host должен быть непустой строкой');
  }

  // Проверяем port
  if (typeof vmix.port !== 'number' || vmix.port < 1 || vmix.port > 65535) {
    errors.push('port должен быть числом от 1 до 65535');
  }

  // Проверяем connectionState (опционально)
  if (vmix.connectionState !== undefined) {
    if (vmix.connectionState !== 'connected' && vmix.connectionState !== 'disconnected') {
      errors.push('connectionState должен быть "connected" или "disconnected"');
    }
  }

  // Проверяем inputOrder (опционально): массив строк
  if (vmix.inputOrder !== undefined) {
    if (!Array.isArray(vmix.inputOrder) || vmix.inputOrder.some((id) => typeof id !== 'string')) {
      errors.push('inputOrder должен быть массивом строк');
    }
  }

  // Проверяем inputs
  if (vmix.inputs !== undefined) {
    if (typeof vmix.inputs !== 'object' || Array.isArray(vmix.inputs)) {
      errors.push('inputs должен быть объектом');
    } else {
      // Валидируем каждый инпут
      for (const [inputKey, inputValue] of Object.entries(vmix.inputs)) {
        const inputResult = validateVMixInput(inputKey, inputValue);
        if (!inputResult.valid) {
          errors.push(`inputs.${inputKey}: ${inputResult.errors.join(', ')}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Валидирует отдельный инпут vMix
 */
export function validateVMixInput(inputKey: string, input: any): ValidationResult {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return {
      valid: false,
      errors: ['Инпут должен быть объектом'],
    };
  }

  // Проверяем enabled
  if (typeof input.enabled !== 'boolean') {
    errors.push('enabled должен быть boolean');
  }

  // Проверяем inputIdentifier
  if (typeof input.inputIdentifier !== 'string' || input.inputIdentifier.trim() === '') {
    errors.push('inputIdentifier должен быть непустой строкой');
  }

  // Проверяем overlay
  if (typeof input.overlay !== 'number' || input.overlay < 1) {
    errors.push('overlay должен быть числом >= 1');
  }

  // Проверяем fields
  if (input.fields !== undefined) {
    if (typeof input.fields !== 'object' || Array.isArray(input.fields)) {
      errors.push('fields должен быть объектом');
    } else {
      // Валидируем каждое поле
      for (const [fieldKey, fieldValue] of Object.entries(input.fields)) {
        const fieldResult = validateInputField(fieldKey, fieldValue);
        if (!fieldResult.valid) {
          errors.push(`fields.${fieldKey}: ${fieldResult.errors.join(', ')}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Валидирует отдельное поле в инпуте
 */
export function validateInputField(fieldKey: string, field: any): ValidationResult {
  const errors: string[] = [];

  if (!field || typeof field !== 'object') {
    return {
      valid: false,
      errors: ['Поле должно быть объектом'],
    };
  }

  // Проверяем type
  if (typeof field.type !== 'string') {
    errors.push('type должен быть строкой');
  } else {
    const validTypes = Object.values(FIELD_TYPES);
    if (!validTypes.includes(field.type as FieldType)) {
      errors.push(`type должен быть одним из: ${validTypes.join(', ')}`);
    }
  }

  // Проверяем fieldIdentifier
  if (typeof field.fieldIdentifier !== 'string' || field.fieldIdentifier.trim() === '') {
    errors.push('fieldIdentifier должен быть непустой строкой');
  }

  // Проверяем enabled
  if (typeof field.enabled !== 'boolean') {
    errors.push('enabled должен быть boolean');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Валидирует настройки мобильного сервера
 */
export function validateMobileSettings(mobile: any): ValidationResult {
  const errors: string[] = [];

  if (!mobile || typeof mobile !== 'object') {
    return {
      valid: false,
      errors: ['mobile должен быть объектом'],
    };
  }

  // Проверяем enabled
  if (typeof mobile.enabled !== 'boolean') {
    errors.push('enabled должен быть boolean');
  }

  // Проверяем port (только если enabled)
  if (mobile.enabled) {
    if (typeof mobile.port !== 'number' || mobile.port < 1 || mobile.port > 65535) {
      errors.push('port должен быть числом от 1 до 65535');
    }
  } else {
    // Если disabled, port все равно должен быть валидным числом (может быть неиспользуемым)
    if (mobile.port !== undefined && (typeof mobile.port !== 'number' || mobile.port < 1 || mobile.port > 65535)) {
      errors.push('port должен быть числом от 1 до 65535');
    }
  }

  // Проверяем sessionId (может быть null или string)
  if (mobile.sessionId !== null && mobile.sessionId !== undefined && typeof mobile.sessionId !== 'string') {
    errors.push('sessionId должен быть строкой или null');
  }

  // Проверяем selectedIP (может быть null или string)
  if (mobile.selectedIP !== null && mobile.selectedIP !== undefined && typeof mobile.selectedIP !== 'string') {
    errors.push('selectedIP должен быть строкой или null');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Валидирует настройки автосохранения
 */
export function validateAutoSaveSettings(autoSave: any): ValidationResult {
  const errors: string[] = [];

  if (!autoSave || typeof autoSave !== 'object') {
    return {
      valid: false,
      errors: ['autoSave должен быть объектом'],
    };
  }

  // Проверяем enabled
  if (typeof autoSave.enabled !== 'boolean') {
    errors.push('enabled должен быть boolean');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Валидирует настройки автоматических обновлений
 */
export function validateAutoUpdateSettings(autoUpdate: any): ValidationResult {
  const errors: string[] = [];

  if (!autoUpdate || typeof autoUpdate !== 'object') {
    return {
      valid: false,
      errors: ['autoUpdate должен быть объектом'],
    };
  }

  // Проверяем enabled
  if (typeof autoUpdate.enabled !== 'boolean') {
    errors.push('enabled должен быть boolean');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
