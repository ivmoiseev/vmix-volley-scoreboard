/**
 * Тесты для валидатора настроек
 * TDD подход: сначала тесты (Red), затем реализация (Green)
 */

import { describe, test, expect } from 'vitest';
import {
  validateSettings,
  validateVMixSettings,
  validateMobileSettings,
  validateAutoSaveSettings,
  validateAutoUpdateSettings,
  validateVMixInput,
  validateInputField,
  FIELD_TYPES,
} from '../../../src/main/utils/settingsValidator.ts';

describe('settingsValidator', () => {
  describe('validateSettings', () => {
    test('должна проверять структуру настроек', () => {
      const result = validateSettings(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Настройки должны быть объектом');
    });

    test('должна проверять типы данных', () => {
      const result = validateSettings({
        vmix: 'invalid',
        mobile: 123,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('должна проверять обязательные поля', () => {
      const result = validateSettings({
        vmix: {
          host: '', // Пустая строка - ошибка
          port: 8088,
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('host'))).toBe(true);
    });

    test('должна возвращать список ошибок', () => {
      const result = validateSettings({
        vmix: {
          host: '',
          port: 70000, // Некорректный порт
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('должна валидировать секцию vmix', () => {
      const result = validateSettings({
        vmix: {
          host: 'localhost',
          port: 8088,
          inputs: {},
        },
      });
      expect(result.valid).toBe(true);
    });

    test('должна валидировать секцию mobile', () => {
      const result = validateSettings({
        mobile: {
          enabled: false,
          port: 3000,
          sessionId: null,
          selectedIP: null,
        },
      });
      expect(result.valid).toBe(true);
    });

    test('должна валидировать секцию autoSave', () => {
      const result = validateSettings({
        autoSave: {
          enabled: true,
        },
      });
      expect(result.valid).toBe(true);
    });

    test('должна валидировать секцию autoUpdate', () => {
      const result = validateSettings({
        autoUpdate: {
          enabled: true,
        },
      });
      expect(result.valid).toBe(true);
    });

    test('должна валидировать структуру полей (fields) в инпутах', () => {
      const result = validateSettings({
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
      });
      expect(result.valid).toBe(true);
    });

    test('должна проверять типы полей (text, image, color, fill, visibility)', () => {
      const validResult = validateSettings({
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
                logo: {
                  type: 'image',
                  fieldIdentifier: 'Logo',
                  enabled: true,
                },
                color: {
                  type: 'fill',
                  fieldIdentifier: 'Color',
                  enabled: true,
                },
              },
            },
          },
        },
      });
      expect(validResult.valid).toBe(true);

      const invalidResult = validateSettings({
        vmix: {
          host: 'localhost',
          port: 8088,
          inputs: {
            currentScore: {
              enabled: true,
              inputIdentifier: 'Input7',
              overlay: 1,
              fields: {
                invalid: {
                  type: 'invalid_type',
                  fieldIdentifier: 'Invalid',
                  enabled: true,
                },
              },
            },
          },
        },
      });
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.some(e => e.includes('type'))).toBe(true);
    });
  });

  describe('validateVMixSettings', () => {
    test('должна валидировать корректные настройки vMix', () => {
      const result = validateVMixSettings({
        host: 'localhost',
        port: 8088,
        inputs: {},
      });
      expect(result.valid).toBe(true);
    });

    test('должна проверять host (непустая строка)', () => {
      const result1 = validateVMixSettings({
        host: '',
        port: 8088,
        inputs: {},
      });
      expect(result1.valid).toBe(false);
      expect(result1.errors.some(e => e.includes('host'))).toBe(true);

      const result2 = validateVMixSettings({
        host: 'localhost',
        port: 8088,
        inputs: {},
      });
      expect(result2.valid).toBe(true);
    });

    test('должна проверять port (1-65535)', () => {
      const result1 = validateVMixSettings({
        host: 'localhost',
        port: 0,
        inputs: {},
      });
      expect(result1.valid).toBe(false);
      expect(result1.errors.some(e => e.includes('port'))).toBe(true);

      const result2 = validateVMixSettings({
        host: 'localhost',
        port: 70000,
        inputs: {},
      });
      expect(result2.valid).toBe(false);
      expect(result2.errors.some(e => e.includes('port'))).toBe(true);

      const result3 = validateVMixSettings({
        host: 'localhost',
        port: 8088,
        inputs: {},
      });
      expect(result3.valid).toBe(true);
    });

    test('должна валидировать инпуты', () => {
      const result = validateVMixSettings({
        host: 'localhost',
        port: 8088,
        inputs: {
          currentScore: {
            enabled: true,
            inputIdentifier: 'Input7',
            overlay: 1,
            fields: {},
          },
        },
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('validateVMixInput', () => {
    test('должна валидировать корректный инпут', () => {
      const result = validateVMixInput('currentScore', {
        enabled: true,
        inputIdentifier: 'Input7',
        overlay: 1,
        fields: {},
      });
      expect(result.valid).toBe(true);
    });

    test('должна проверять enabled (boolean)', () => {
      const result = validateVMixInput('currentScore', {
        enabled: 'true', // Не boolean
        inputIdentifier: 'Input7',
        overlay: 1,
        fields: {},
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('enabled'))).toBe(true);
    });

    test('должна проверять inputIdentifier (непустая строка)', () => {
      const result = validateVMixInput('currentScore', {
        enabled: true,
        inputIdentifier: '',
        overlay: 1,
        fields: {},
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('inputIdentifier'))).toBe(true);
    });

    test('должна проверять overlay (число >= 1)', () => {
      const result1 = validateVMixInput('currentScore', {
        enabled: true,
        inputIdentifier: 'Input7',
        overlay: 0,
        fields: {},
      });
      expect(result1.valid).toBe(false);
      expect(result1.errors.some(e => e.includes('overlay'))).toBe(true);

      const result2 = validateVMixInput('currentScore', {
        enabled: true,
        inputIdentifier: 'Input7',
        overlay: 1,
        fields: {},
      });
      expect(result2.valid).toBe(true);
    });

    test('должна валидировать fields', () => {
      const result = validateVMixInput('currentScore', {
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
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('validateInputField', () => {
    test('должна валидировать корректное поле', () => {
      const result = validateInputField('scoreA', {
        type: 'text',
        fieldIdentifier: 'ScoreA',
        enabled: true,
      });
      expect(result.valid).toBe(true);
    });

    test('должна проверять type (валидный тип)', () => {
      const validTypes = Object.values(FIELD_TYPES);
      for (const type of validTypes) {
        const result = validateInputField('field', {
          type,
          fieldIdentifier: 'Field',
          enabled: true,
        });
        expect(result.valid).toBe(true);
      }

      const invalidResult = validateInputField('field', {
        type: 'invalid',
        fieldIdentifier: 'Field',
        enabled: true,
      });
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.some(e => e.includes('type'))).toBe(true);
    });

    test('должна проверять fieldIdentifier (непустая строка)', () => {
      const result = validateInputField('field', {
        type: 'text',
        fieldIdentifier: '',
        enabled: true,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('fieldIdentifier'))).toBe(true);
    });

    test('должна проверять enabled (boolean)', () => {
      const result = validateInputField('field', {
        type: 'text',
        fieldIdentifier: 'Field',
        enabled: 'true', // Не boolean
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('enabled'))).toBe(true);
    });
  });

  describe('validateMobileSettings', () => {
    test('должна валидировать корректные настройки mobile', () => {
      const result = validateMobileSettings({
        enabled: false,
        port: 3000,
        sessionId: null,
        selectedIP: null,
      });
      expect(result.valid).toBe(true);
    });

    test('должна проверять enabled (boolean)', () => {
      const result = validateMobileSettings({
        enabled: 'false',
        port: 3000,
        sessionId: null,
        selectedIP: null,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('enabled'))).toBe(true);
    });

    test('должна проверять port (1-65535, если enabled)', () => {
      const result1 = validateMobileSettings({
        enabled: true,
        port: 0,
        sessionId: null,
        selectedIP: null,
      });
      expect(result1.valid).toBe(false);
      expect(result1.errors.some(e => e.includes('port'))).toBe(true);

      const result2 = validateMobileSettings({
        enabled: true,
        port: 3000,
        sessionId: null,
        selectedIP: null,
      });
      expect(result2.valid).toBe(true);
    });

    test('должна проверять sessionId (string | null)', () => {
      const result1 = validateMobileSettings({
        enabled: false,
        port: 3000,
        sessionId: 123, // Не string и не null
        selectedIP: null,
      });
      expect(result1.valid).toBe(false);
      expect(result1.errors.some(e => e.includes('sessionId'))).toBe(true);

      const result2 = validateMobileSettings({
        enabled: false,
        port: 3000,
        sessionId: 'test-session',
        selectedIP: null,
      });
      expect(result2.valid).toBe(true);

      const result3 = validateMobileSettings({
        enabled: false,
        port: 3000,
        sessionId: null,
        selectedIP: null,
      });
      expect(result3.valid).toBe(true);
    });

    test('должна проверять selectedIP (string | null)', () => {
      const result1 = validateMobileSettings({
        enabled: false,
        port: 3000,
        sessionId: null,
        selectedIP: 123, // Не string и не null
      });
      expect(result1.valid).toBe(false);
      expect(result1.errors.some(e => e.includes('selectedIP'))).toBe(true);

      const result2 = validateMobileSettings({
        enabled: false,
        port: 3000,
        sessionId: null,
        selectedIP: '192.168.1.1',
      });
      expect(result2.valid).toBe(true);
    });
  });

  describe('validateAutoSaveSettings', () => {
    test('должна валидировать корректные настройки autoSave', () => {
      const result = validateAutoSaveSettings({
        enabled: true,
      });
      expect(result.valid).toBe(true);
    });

    test('должна проверять enabled (boolean)', () => {
      const result = validateAutoSaveSettings({
        enabled: 'true',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('enabled'))).toBe(true);
    });
  });

  describe('validateAutoUpdateSettings', () => {
    test('должна валидировать корректные настройки autoUpdate', () => {
      const result = validateAutoUpdateSettings({
        enabled: true,
      });
      expect(result.valid).toBe(true);
    });

    test('должна проверять enabled (boolean)', () => {
      const result = validateAutoUpdateSettings({
        enabled: 'true',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('enabled'))).toBe(true);
    });
  });
});
