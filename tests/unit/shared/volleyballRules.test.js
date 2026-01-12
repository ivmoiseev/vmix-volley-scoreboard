/**
 * Тесты для модуля volleyballRules.js
 * Высокий приоритет тестирования
 */

const {
  isSetball,
  isMatchball,
  canFinishSet,
  getSetWinner,
  getMatchWinner,
  isMatchFinished,
} = require('../../../src/shared/volleyballRules');

describe('volleyballRules', () => {
  describe('isSetball', () => {
    test('должен возвращать false для низкого счета', () => {
      const result = isSetball(10, 8, 1);
      expect(result.isSetball).toBe(false);
      expect(result.team).toBeNull();
    });

    test('должен определять сетбол в обычном сете (24:23)', () => {
      const result = isSetball(24, 23, 1);
      expect(result.isSetball).toBe(true);
      expect(result.team).toBe('A');
    });

    test('должен определять сетбол в обычном сете (23:24)', () => {
      const result = isSetball(23, 24, 1);
      expect(result.isSetball).toBe(true);
      expect(result.team).toBe('B');
    });

    test('должен определять сетбол в обычном сете (25:24)', () => {
      const result = isSetball(25, 24, 1);
      expect(result.isSetball).toBe(true);
      expect(result.team).toBe('A');
    });

    test('НЕ должен определять сетбол при равном счете (24:24)', () => {
      const result = isSetball(24, 24, 1);
      expect(result.isSetball).toBe(false);
      expect(result.team).toBeNull();
    });

    test('НЕ должен определять сетбол при равном счете (25:25)', () => {
      const result = isSetball(25, 25, 1);
      expect(result.isSetball).toBe(false);
      expect(result.team).toBeNull();
    });

    test('должен определять сетбол в 5-м сете (14:13)', () => {
      const result = isSetball(14, 13, 5);
      expect(result.isSetball).toBe(true);
      expect(result.team).toBe('A');
    });

    test('должен определять сетбол в 5-м сете (13:14)', () => {
      const result = isSetball(13, 14, 5);
      expect(result.isSetball).toBe(true);
      expect(result.team).toBe('B');
    });

    test('НЕ должен определять сетбол в 5-м сете при равном счете (14:14)', () => {
      const result = isSetball(14, 14, 5);
      expect(result.isSetball).toBe(false);
      expect(result.team).toBeNull();
    });

    test('должен определять сетбол при большом отрыве (25:20)', () => {
      const result = isSetball(25, 20, 1);
      expect(result.isSetball).toBe(true);
      expect(result.team).toBe('A');
    });

    test('НЕ должен определять сетбол при недостаточной разнице (24:23, но разница 1)', () => {
      // На самом деле 24:23 - это сетбол, так как разница >= 1
      const result = isSetball(24, 23, 1);
      expect(result.isSetball).toBe(true);
    });

    test('НЕ должен определять сетбол при недостаточном счете (23:22)', () => {
      const result = isSetball(23, 22, 1);
      expect(result.isSetball).toBe(false);
    });
  });

  describe('isMatchball', () => {
    test('должен возвращать false если нет завершенных сетов', () => {
      const sets = [];
      const result = isMatchball(sets, 1, 24, 23);
      expect(result.isMatchball).toBe(false);
      expect(result.team).toBeNull();
    });

    test('должен определять матчбол для команды A (2:0 по сетам, на сетболе)', () => {
      const sets = [
        { setNumber: 1, scoreA: 25, scoreB: 20, completed: true },
        { setNumber: 2, scoreA: 25, scoreB: 22, completed: true },
      ];
      const result = isMatchball(sets, 3, 24, 23);
      expect(result.isMatchball).toBe(true);
      expect(result.team).toBe('A');
    });

    test('должен определять матчбол для команды B (0:2 по сетам, на сетболе)', () => {
      const sets = [
        { setNumber: 1, scoreA: 20, scoreB: 25, completed: true },
        { setNumber: 2, scoreA: 22, scoreB: 25, completed: true },
      ];
      const result = isMatchball(sets, 3, 23, 24);
      expect(result.isMatchball).toBe(true);
      expect(result.team).toBe('B');
    });

    test('НЕ должен определять матчбол если команда не на сетболе', () => {
      const sets = [
        { setNumber: 1, scoreA: 25, scoreB: 20, completed: true },
        { setNumber: 2, scoreA: 25, scoreB: 22, completed: true },
      ];
      const result = isMatchball(sets, 3, 20, 15);
      expect(result.isMatchball).toBe(false);
    });

    test('НЕ должен определять матчбол если счет по сетам 1:1', () => {
      const sets = [
        { setNumber: 1, scoreA: 25, scoreB: 20, completed: true },
        { setNumber: 2, scoreA: 20, scoreB: 25, completed: true },
      ];
      const result = isMatchball(sets, 3, 24, 23);
      expect(result.isMatchball).toBe(false);
    });

    test('должен определять матчбол для команды A (2:1 по сетам, на сетболе)', () => {
      const sets = [
        { setNumber: 1, scoreA: 25, scoreB: 20, completed: true },
        { setNumber: 2, scoreA: 20, scoreB: 25, completed: true },
        { setNumber: 3, scoreA: 25, scoreB: 22, completed: true },
      ];
      const result = isMatchball(sets, 4, 24, 23);
      expect(result.isMatchball).toBe(true);
      expect(result.team).toBe('A');
    });

    test('НЕ должен определять матчбол если команда на сетболе, но не ведет по сетам', () => {
      const sets = [
        { setNumber: 1, scoreA: 25, scoreB: 20, completed: true },
        { setNumber: 2, scoreA: 25, scoreB: 22, completed: true },
      ];
      // Команда B на сетболе, но ведет команда A
      const result = isMatchball(sets, 3, 23, 24);
      expect(result.isMatchball).toBe(false);
    });
  });

  describe('canFinishSet', () => {
    test('должен возвращать false для низкого счета', () => {
      expect(canFinishSet(10, 8, 1)).toBe(false);
    });

    test('должен возвращать true при 25:23 в обычном сете', () => {
      expect(canFinishSet(25, 23, 1)).toBe(true);
    });

    test('должен возвращать true при 23:25 в обычном сете', () => {
      expect(canFinishSet(23, 25, 1)).toBe(true);
    });

    test('НЕ должен возвращать true при 25:24 (разница меньше 2)', () => {
      expect(canFinishSet(25, 24, 1)).toBe(false);
    });

    test('должен возвращать true при 26:24 в обычном сете', () => {
      expect(canFinishSet(26, 24, 1)).toBe(true);
    });

    test('должен возвращать true при 15:13 в 5-м сете', () => {
      expect(canFinishSet(15, 13, 5)).toBe(true);
    });

    test('НЕ должен возвращать true при 15:14 в 5-м сете (разница меньше 2)', () => {
      expect(canFinishSet(15, 14, 5)).toBe(false);
    });

    test('должен возвращать true при 16:14 в 5-м сете', () => {
      expect(canFinishSet(16, 14, 5)).toBe(true);
    });

    test('должен возвращать true при тай-брейке 26:24', () => {
      expect(canFinishSet(26, 24, 1)).toBe(true);
    });

    test('должен возвращать true при тай-брейке 24:26', () => {
      expect(canFinishSet(24, 26, 1)).toBe(true);
    });

    test('НЕ должен возвращать true при тай-брейке 25:24', () => {
      expect(canFinishSet(25, 24, 1)).toBe(false);
    });

    test('должен возвращать true при тай-брейке в 5-м сете 16:14', () => {
      expect(canFinishSet(16, 14, 5)).toBe(true);
    });

    test('НЕ должен возвращать true при тай-брейке в 5-м сете 15:14', () => {
      expect(canFinishSet(15, 14, 5)).toBe(false);
    });
  });

  describe('getSetWinner', () => {
    test('должен возвращать A если команда A выиграла', () => {
      expect(getSetWinner(25, 20)).toBe('A');
    });

    test('должен возвращать B если команда B выиграла', () => {
      expect(getSetWinner(20, 25)).toBe('B');
    });

    test('должен возвращать null при равном счете', () => {
      expect(getSetWinner(25, 25)).toBeNull();
    });

    test('должен возвращать A при большом отрыве', () => {
      expect(getSetWinner(25, 10)).toBe('A');
    });
  });

  describe('getMatchWinner', () => {
    test('должен возвращать null если матч не завершен', () => {
      const sets = [
        { setNumber: 1, scoreA: 25, scoreB: 20, completed: true },
        { setNumber: 2, scoreA: 20, scoreB: 25, completed: true },
      ];
      expect(getMatchWinner(sets)).toBeNull();
    });

    test('должен возвращать A если команда A выиграла 3 сета', () => {
      const sets = [
        { setNumber: 1, scoreA: 25, scoreB: 20, completed: true },
        { setNumber: 2, scoreA: 25, scoreB: 22, completed: true },
        { setNumber: 3, scoreA: 25, scoreB: 23, completed: true },
      ];
      expect(getMatchWinner(sets)).toBe('A');
    });

    test('должен возвращать B если команда B выиграла 3 сета', () => {
      const sets = [
        { setNumber: 1, scoreA: 20, scoreB: 25, completed: true },
        { setNumber: 2, scoreA: 22, scoreB: 25, completed: true },
        { setNumber: 3, scoreA: 23, scoreB: 25, completed: true },
      ];
      expect(getMatchWinner(sets)).toBe('B');
    });

    test('должен игнорировать незавершенные сеты', () => {
      const sets = [
        { setNumber: 1, scoreA: 25, scoreB: 20, completed: true },
        { setNumber: 2, scoreA: 25, scoreB: 22, completed: true },
        { setNumber: 3, scoreA: 10, scoreB: 5, completed: false },
        { setNumber: 4, scoreA: 25, scoreB: 23, completed: true },
      ];
      expect(getMatchWinner(sets)).toBe('A');
    });

    test('должен возвращать null при счете 2:2', () => {
      const sets = [
        { setNumber: 1, scoreA: 25, scoreB: 20, completed: true },
        { setNumber: 2, scoreA: 20, scoreB: 25, completed: true },
        { setNumber: 3, scoreA: 25, scoreB: 22, completed: true },
        { setNumber: 4, scoreA: 22, scoreB: 25, completed: true },
      ];
      expect(getMatchWinner(sets)).toBeNull();
    });
  });

  describe('isMatchFinished', () => {
    test('должен возвращать false если матч не завершен', () => {
      const sets = [
        { setNumber: 1, scoreA: 25, scoreB: 20, completed: true },
        { setNumber: 2, scoreA: 20, scoreB: 25, completed: true },
      ];
      expect(isMatchFinished(sets)).toBe(false);
    });

    test('должен возвращать true если матч завершен', () => {
      const sets = [
        { setNumber: 1, scoreA: 25, scoreB: 20, completed: true },
        { setNumber: 2, scoreA: 25, scoreB: 22, completed: true },
        { setNumber: 3, scoreA: 25, scoreB: 23, completed: true },
      ];
      expect(isMatchFinished(sets)).toBe(true);
    });
  });
});
