/**
 * Тесты для eventOverlayTypes — константы типов авто-событий и приоритет.
 */

import { describe, test, expect } from 'vitest';
import {
  AUTO_EVENT_TYPES,
  AUTO_EVENT_LABELS,
  AUTO_EVENT_PRIORITY_ORDER,
  type AutoEventType,
} from '../../../src/shared/eventOverlayTypes';

describe('eventOverlayTypes', () => {
  describe('AUTO_EVENT_LABELS', () => {
    test('все ключи возвращают строку «Сетбол», «Матчбол» или «Таймаут»', () => {
      const allowed = ['Сетбол', 'Матчбол', 'Таймаут'];
      for (const key of Object.keys(AUTO_EVENT_LABELS) as AutoEventType[]) {
        const label = AUTO_EVENT_LABELS[key];
        expect(typeof label).toBe('string');
        expect(allowed).toContain(label);
      }
    });

    test('setballA и setballB возвращают «Сетбол»', () => {
      expect(AUTO_EVENT_LABELS.setballA).toBe('Сетбол');
      expect(AUTO_EVENT_LABELS.setballB).toBe('Сетбол');
    });

    test('matchballA и matchballB возвращают «Матчбол»', () => {
      expect(AUTO_EVENT_LABELS.matchballA).toBe('Матчбол');
      expect(AUTO_EVENT_LABELS.matchballB).toBe('Матчбол');
    });

    test('timeoutA и timeoutB возвращают «Таймаут»', () => {
      expect(AUTO_EVENT_LABELS.timeoutA).toBe('Таймаут');
      expect(AUTO_EVENT_LABELS.timeoutB).toBe('Таймаут');
    });
  });

  describe('AUTO_EVENT_PRIORITY_ORDER', () => {
    test('содержит 6 элементов', () => {
      expect(AUTO_EVENT_PRIORITY_ORDER).toHaveLength(6);
    });

    test('каждый элемент из AUTO_EVENT_TYPES', () => {
      const set = new Set(AUTO_EVENT_TYPES);
      for (const t of AUTO_EVENT_PRIORITY_ORDER) {
        expect(set.has(t)).toBe(true);
      }
    });

    test('приоритет: таймаут > матчбол > сетбол (первые два — timeout)', () => {
      expect(AUTO_EVENT_PRIORITY_ORDER[0]).toBe('timeoutA');
      expect(AUTO_EVENT_PRIORITY_ORDER[1]).toBe('timeoutB');
    });
  });
});
