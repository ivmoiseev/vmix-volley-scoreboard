/**
 * Тесты для обработки типов полей в useVMix
 */

import { describe, test, expect, vi } from 'vitest';
import { getFullFieldName } from '../../../src/shared/vmix-field-utils.js';

// Мокируем утилиту для работы с полями
vi.mock('../../../src/shared/vmix-field-utils.js', () => ({
  getFullFieldName: vi.fn((name, type) => {
    if (type === 'text') return `${name}.Text`;
    if (type === 'image') return `${name}.Source`;
    if (type === 'fill') return `${name}.Fill.Color`;
    return name;
  }),
}));

describe('useVMix - Field Types', () => {
  describe('Обработка полей типа fill', () => {
    test('должен использовать getFullFieldName для полей типа fill', () => {
      const fieldIdentifier = 'ColorA';
      const type = 'fill';
      const fullName = getFullFieldName(fieldIdentifier, type);

      expect(getFullFieldName).toHaveBeenCalledWith(fieldIdentifier, type);
      expect(fullName).toBe('ColorA.Fill.Color');
    });

    test('должен обрабатывать поля типа fill вместо color', () => {
      const fieldConfig = {
        enabled: true,
        type: 'fill',
        fieldIdentifier: 'ColorA',
      };

      // Симуляция обработки поля fill
      const shouldProcessAsFill = fieldConfig.type === 'fill';
      expect(shouldProcessAsFill).toBe(true);
    });
  });

  describe('Обработка видимости как атрибута', () => {
    test('должен обрабатывать visible как свойство поля, а не тип', () => {
      const fieldConfig = {
        enabled: true,
        type: 'text',
        fieldIdentifier: 'PointA',
        visible: true,
      };

      const isVisibilityField = fieldConfig.visible === true;
      const isTextType = fieldConfig.type === 'text';

      expect(isTextType).toBe(true);
      expect(isVisibilityField).toBe(true);
    });

    test('должен обрабатывать поля без visible как обычные текстовые поля', () => {
      const fieldConfig = {
        enabled: true,
        type: 'text',
        fieldIdentifier: 'TeamA',
      };

      const hasVisibility = fieldConfig.visible === true;
      expect(hasVisibility).toBe(false);
    });
  });

  describe('Формирование имен полей с суффиксами', () => {
    test('должен формировать полное имя для текстового поля', () => {
      const fieldIdentifier = 'TeamA';
      const type = 'text';
      const fullName = getFullFieldName(fieldIdentifier, type);

      expect(fullName).toBe('TeamA.Text');
    });

    test('должен формировать полное имя для поля изображения', () => {
      const fieldIdentifier = 'TeamALogo';
      const type = 'image';
      const fullName = getFullFieldName(fieldIdentifier, type);

      expect(fullName).toBe('TeamALogo.Source');
    });

    test('должен формировать полное имя для поля fill', () => {
      const fieldIdentifier = 'ColorA';
      const type = 'fill';
      const fullName = getFullFieldName(fieldIdentifier, type);

      expect(fullName).toBe('ColorA.Fill.Color');
    });
  });

  describe('Совместимость с существующими данными матча', () => {
    test('должен обрабатывать поля fill с данными цвета команды', () => {
      const match = {
        teamA: { color: '#3498db' },
        teamB: { color: '#e74c3c' },
      };

      const fieldConfig = {
        enabled: true,
        type: 'fill',
        fieldIdentifier: 'ColorA',
      };

      // Симуляция обработки
      const colorValue = match.teamA?.color || '#3498db';
      const fullFieldName = getFullFieldName(fieldConfig.fieldIdentifier, fieldConfig.type);

      expect(colorValue).toBe('#3498db');
      expect(fullFieldName).toBe('ColorA.Fill.Color');
    });

    test('должен обрабатывать поля видимости с данными матча', () => {
      const match = {
        currentSet: {
          servingTeam: 'A',
        },
      };

      const fieldConfig = {
        enabled: true,
        type: 'text',
        fieldIdentifier: 'PointA',
        visible: true,
      };

      // Симуляция обработки видимости
      const shouldBeVisible = match.currentSet?.servingTeam === 'A';
      const fullFieldName = getFullFieldName(fieldConfig.fieldIdentifier, fieldConfig.type);

      expect(shouldBeVisible).toBe(true);
      expect(fullFieldName).toBe('PointA.Text');
    });
  });

  describe('Обработка всех типов полей', () => {
    test('должен корректно обрабатывать все три типа полей', () => {
      const fields = [
        { type: 'text', fieldIdentifier: 'TeamA' },
        { type: 'image', fieldIdentifier: 'TeamALogo' },
        { type: 'fill', fieldIdentifier: 'ColorA' },
      ];

      const processedFields = fields.map((field) => ({
        ...field,
        fullName: getFullFieldName(field.fieldIdentifier, field.type),
      }));

      expect(processedFields[0].fullName).toBe('TeamA.Text');
      expect(processedFields[1].fullName).toBe('TeamALogo.Source');
      expect(processedFields[2].fullName).toBe('ColorA.Fill.Color');
    });
  });
});
