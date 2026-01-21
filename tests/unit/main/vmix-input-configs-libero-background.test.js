/**
 * Тесты для конфигурации полей подложек либеро
 */

import { describe, test, expect, vi } from 'vitest';
import { getDefaultFieldsForInput } from '../../../src/main/vmix-input-configs.ts';

describe('vmix-input-configs - Libero Background Fields', () => {
  describe('startingLineupTeamA', () => {
    test('должен содержать поле libero1Background типа fill', () => {
      const fields = getDefaultFieldsForInput('startingLineupTeamA');
      expect(fields).toBeDefined();
      expect(fields.libero1Background).toBeDefined();
      expect(fields.libero1Background.type).toBe('fill');
      expect(fields.libero1Background.fieldName).toBe('Подложка либеро 1');
      expect(fields.libero1Background.fieldIdentifier).toBe('Libero1Background');
    });

    test('должен содержать поле libero1BackgroundOnCard типа fill', () => {
      const fields = getDefaultFieldsForInput('startingLineupTeamA');
      expect(fields).toBeDefined();
      expect(fields.libero1BackgroundOnCard).toBeDefined();
      expect(fields.libero1BackgroundOnCard.type).toBe('fill');
      expect(fields.libero1BackgroundOnCard.fieldName).toBe('Подложка либеро 1 на карте');
      expect(fields.libero1BackgroundOnCard.fieldIdentifier).toBe('Libero1BackgroundOnCard');
    });

    test('должен содержать поле libero2Background типа fill', () => {
      const fields = getDefaultFieldsForInput('startingLineupTeamA');
      expect(fields).toBeDefined();
      expect(fields.libero2Background).toBeDefined();
      expect(fields.libero2Background.type).toBe('fill');
      expect(fields.libero2Background.fieldName).toBe('Подложка либеро 2');
      expect(fields.libero2Background.fieldIdentifier).toBe('Libero2Background');
    });

    test('должен содержать поле libero2BackgroundOnCard типа fill', () => {
      const fields = getDefaultFieldsForInput('startingLineupTeamA');
      expect(fields).toBeDefined();
      expect(fields.libero2BackgroundOnCard).toBeDefined();
      expect(fields.libero2BackgroundOnCard.type).toBe('fill');
      expect(fields.libero2BackgroundOnCard.fieldName).toBe('Подложка либеро 2 на карте');
      expect(fields.libero2BackgroundOnCard.fieldIdentifier).toBe('Libero2BackgroundOnCard');
    });

    test('поля подложек должны быть после соответствующих полей номеров на карте', () => {
      const fields = getDefaultFieldsForInput('startingLineupTeamA');
      const fieldKeys = Object.keys(fields);
      
      const libero1NumberOnCardIndex = fieldKeys.indexOf('libero1NumberOnCard');
      const libero1BackgroundIndex = fieldKeys.indexOf('libero1Background');
      const libero1BackgroundOnCardIndex = fieldKeys.indexOf('libero1BackgroundOnCard');
      
      expect(libero1BackgroundIndex).toBeGreaterThan(libero1NumberOnCardIndex);
      expect(libero1BackgroundOnCardIndex).toBeGreaterThan(libero1BackgroundIndex);
      
      const libero2NumberOnCardIndex = fieldKeys.indexOf('libero2NumberOnCard');
      const libero2BackgroundIndex = fieldKeys.indexOf('libero2Background');
      const libero2BackgroundOnCardIndex = fieldKeys.indexOf('libero2BackgroundOnCard');
      
      expect(libero2BackgroundIndex).toBeGreaterThan(libero2NumberOnCardIndex);
      expect(libero2BackgroundOnCardIndex).toBeGreaterThan(libero2BackgroundIndex);
    });
  });

  describe('startingLineupTeamB', () => {
    test('должен содержать поле libero1Background типа fill', () => {
      const fields = getDefaultFieldsForInput('startingLineupTeamB');
      expect(fields).toBeDefined();
      expect(fields.libero1Background).toBeDefined();
      expect(fields.libero1Background.type).toBe('fill');
      expect(fields.libero1Background.fieldName).toBe('Подложка либеро 1');
      expect(fields.libero1Background.fieldIdentifier).toBe('Libero1Background');
    });

    test('должен содержать поле libero1BackgroundOnCard типа fill', () => {
      const fields = getDefaultFieldsForInput('startingLineupTeamB');
      expect(fields).toBeDefined();
      expect(fields.libero1BackgroundOnCard).toBeDefined();
      expect(fields.libero1BackgroundOnCard.type).toBe('fill');
      expect(fields.libero1BackgroundOnCard.fieldName).toBe('Подложка либеро 1 на карте');
      expect(fields.libero1BackgroundOnCard.fieldIdentifier).toBe('Libero1BackgroundOnCard');
    });

    test('должен содержать поле libero2Background типа fill', () => {
      const fields = getDefaultFieldsForInput('startingLineupTeamB');
      expect(fields).toBeDefined();
      expect(fields.libero2Background).toBeDefined();
      expect(fields.libero2Background.type).toBe('fill');
      expect(fields.libero2Background.fieldName).toBe('Подложка либеро 2');
      expect(fields.libero2Background.fieldIdentifier).toBe('Libero2Background');
    });

    test('должен содержать поле libero2BackgroundOnCard типа fill', () => {
      const fields = getDefaultFieldsForInput('startingLineupTeamB');
      expect(fields).toBeDefined();
      expect(fields.libero2BackgroundOnCard).toBeDefined();
      expect(fields.libero2BackgroundOnCard.type).toBe('fill');
      expect(fields.libero2BackgroundOnCard.fieldName).toBe('Подложка либеро 2 на карте');
      expect(fields.libero2BackgroundOnCard.fieldIdentifier).toBe('Libero2BackgroundOnCard');
    });
  });
});
