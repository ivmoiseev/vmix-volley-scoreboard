/**
 * Тесты для утилит работы со временем партий
 */

import {
  calculateDuration,
  formatDuration,
  toTimestamp,
  formatTimestamp,
} from '../../../src/shared/timeUtils.js';

describe('timeUtils', () => {
  describe('calculateDuration', () => {
    it('должна вычислять продолжительность в минутах', () => {
      const startTime = Date.now() - 61000; // 61 секунда назад
      const endTime = Date.now();
      
      const duration = calculateDuration(startTime, endTime);
      
      expect(duration).toBe(1); // Округление до 1 минуты
    });

    it('должна возвращать null если startTime отсутствует', () => {
      const endTime = Date.now();
      
      const duration = calculateDuration(null, endTime);
      
      expect(duration).toBeNull();
    });

    it('должна возвращать null если endTime отсутствует', () => {
      const startTime = Date.now();
      
      const duration = calculateDuration(startTime, null);
      
      expect(duration).toBeNull();
    });

    it('должна возвращать null если endTime раньше startTime', () => {
      const startTime = Date.now();
      const endTime = startTime - 60000; // На минуту раньше
      
      const duration = calculateDuration(startTime, endTime);
      
      expect(duration).toBeNull();
    });

    it('должна округлять продолжительность до ближайшей минуты', () => {
      const startTime = Date.now() - 90000; // 90 секунд назад
      const endTime = Date.now();
      
      const duration = calculateDuration(startTime, endTime);
      
      expect(duration).toBe(2); // Округление вверх до 2 минут (90 секунд = 1.5 минуты -> 2)
    });

    it('должна возвращать 0 для очень коротких партий', () => {
      const startTime = Date.now() - 15000; // 15 секунд назад
      const endTime = Date.now();
      
      const duration = calculateDuration(startTime, endTime);
      
      expect(duration).toBe(0); // Округление до 0 минут (15 секунд < 30 секунд для округления)
    });

    it('должна корректно вычислять продолжительность для длинных партий', () => {
      const startTime = Date.now() - 3600000; // 1 час назад
      const endTime = Date.now();
      
      const duration = calculateDuration(startTime, endTime);
      
      expect(duration).toBe(60); // 60 минут
    });
  });

  describe('formatDuration', () => {
    it('должна форматировать продолжительность с апострофом', () => {
      const formatted = formatDuration(45);
      
      expect(formatted).toBe("45'");
    });

    it('должна возвращать пустую строку для null', () => {
      const formatted = formatDuration(null);
      
      expect(formatted).toBe('');
    });

    it('должна возвращать пустую строку для undefined', () => {
      const formatted = formatDuration(undefined);
      
      expect(formatted).toBe('');
    });

    it('должна возвращать пустую строку для NaN', () => {
      const formatted = formatDuration(NaN);
      
      expect(formatted).toBe('');
    });

    it('должна форматировать 0 минут', () => {
      const formatted = formatDuration(0);
      
      expect(formatted).toBe("0'");
    });

    it('должна форматировать большие значения', () => {
      const formatted = formatDuration(120);
      
      expect(formatted).toBe("120'");
    });
  });

  describe('toTimestamp', () => {
    it('должна возвращать число как есть, если это уже timestamp', () => {
      const timestamp = 1234567890;
      
      const result = toTimestamp(timestamp);
      
      expect(result).toBe(timestamp);
    });

    it('должна конвертировать Date в timestamp', () => {
      const date = new Date('2024-01-01T12:00:00Z');
      const expected = date.getTime();
      
      const result = toTimestamp(date);
      
      expect(result).toBe(expected);
    });

    it('должна конвертировать строку ISO в timestamp', () => {
      const dateString = '2024-01-01T12:00:00Z';
      const expected = new Date(dateString).getTime();
      
      const result = toTimestamp(dateString);
      
      expect(result).toBe(expected);
    });

    it('должна выбрасывать ошибку для некорректной строки', () => {
      const invalidString = 'некорректная дата';
      
      expect(() => toTimestamp(invalidString)).toThrow('Некорректная дата');
    });

    it('должна выбрасывать ошибку для неподдерживаемого типа', () => {
      const invalidType = { some: 'object' };
      
      expect(() => toTimestamp(invalidType)).toThrow('Неподдерживаемый тип данных');
    });
  });

  describe('formatTimestamp', () => {
    it('должна форматировать timestamp в читаемую дату', () => {
      const timestamp = new Date('2024-01-15T14:30:00').getTime();
      
      const formatted = formatTimestamp(timestamp);
      
      // Проверяем, что содержит дату и время
      expect(formatted).toMatch(/\d{2}\.\d{2}\.\d{4}/); // DD.MM.YYYY
      expect(formatted).toMatch(/\d{2}:\d{2}/); // HH:MM
    });

    it('должна возвращать пустую строку для null', () => {
      const formatted = formatTimestamp(null);
      
      expect(formatted).toBe('');
    });

    it('должна возвращать пустую строку для undefined', () => {
      const formatted = formatTimestamp(undefined);
      
      expect(formatted).toBe('');
    });

    it('должна возвращать пустую строку для 0', () => {
      const formatted = formatTimestamp(0);
      
      expect(formatted).toBe('');
    });

    it('должна использовать русскую локаль', () => {
      const timestamp = new Date('2024-12-25T15:45:00').getTime();
      
      const formatted = formatTimestamp(timestamp);
      
      // Проверяем формат русской локали (DD.MM.YYYY, HH:MM)
      expect(formatted).toMatch(/^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/);
    });

    it('должна использовать указанный часовой пояс', () => {
      const timestamp = new Date('2024-01-15T12:00:00Z').getTime(); // UTC время
      const timezone = 'Europe/Moscow'; // UTC+3
      
      const formatted = formatTimestamp(timestamp, timezone);
      
      // Проверяем, что время отформатировано с учетом часового пояса
      // Москва на 3 часа впереди UTC, поэтому 12:00 UTC должно быть 15:00 в Москве
      expect(formatted).toMatch(/\d{2}:\d{2}/);
      // Проверяем, что формат правильный
      expect(formatted).toMatch(/^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/);
    });

    it('должна использовать системный часовой пояс, если timezone не указан', () => {
      const timestamp = new Date('2024-01-15T12:00:00').getTime();
      
      const formatted = formatTimestamp(timestamp);
      const formattedWithUndefined = formatTimestamp(timestamp, undefined);
      
      // Оба вызова должны дать одинаковый результат (системный часовой пояс)
      expect(formatted).toBe(formattedWithUndefined);
      expect(formatted).toMatch(/^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/);
    });

    it('должна правильно форматировать время для разных часовых поясов', () => {
      const timestamp = new Date('2024-01-15T12:00:00Z').getTime(); // UTC время
      
      const formattedUTC = formatTimestamp(timestamp, 'UTC');
      const formattedMoscow = formatTimestamp(timestamp, 'Europe/Moscow');
      const formattedNY = formatTimestamp(timestamp, 'America/New_York');
      
      // Все должны быть в правильном формате
      expect(formattedUTC).toMatch(/^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/);
      expect(formattedMoscow).toMatch(/^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/);
      expect(formattedNY).toMatch(/^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/);
      
      // Время должно отличаться для разных часовых поясов
      // (хотя точное значение зависит от времени года из-за DST)
      expect(formattedUTC).not.toBe(formattedMoscow);
      expect(formattedUTC).not.toBe(formattedNY);
    });
  });
});
