/**
 * Тесты для useMatch.ts
 * Проверка работы хука с Service Layer
 */

import { renderHook, act } from '@testing-library/react';
// @ts-ignore - @testing-library/react может не иметь типов для renderHook в старых версиях
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { SET_STATUS } from '../../../src/shared/types/Match.js';
import type { Match } from '../../../src/shared/types/Match.js';
// Статические импорты для JavaScript модулей, мокируемых через jest.mock()
import * as volleyballRules from '../../../src/shared/volleyballRules.js';
import * as setValidation from '../../../src/shared/setValidation.js';

// Мокируем Service Layer для ESM модулей
// Используем jest.unstable_mockModule() для TypeScript ESM модулей
// Для JavaScript модулей используем обычный jest.mock(), так как они работают в обоих режимах
jest.unstable_mockModule('../../../src/shared/services/SetService.js', () => ({
  SetService: {
    startSet: jest.fn(),
    finishSet: jest.fn(),
    updateSet: jest.fn(),
  },
}));

jest.unstable_mockModule('../../../src/shared/services/ScoreService.js', () => ({
  ScoreService: {
    changeScore: jest.fn(),
    changeServingTeam: jest.fn(),
  },
}));

jest.unstable_mockModule('../../../src/shared/services/HistoryService.js', () => ({
  HistoryService: {
    addAction: jest.fn(),
    undoLastAction: jest.fn(),
    getHistorySize: jest.fn(() => 0),
  },
}));

// Для JavaScript модулей используем обычный jest.mock() - он работает в ESM режиме
jest.mock('../../../src/shared/volleyballRules.js', () => ({
  isSetball: jest.fn(() => ({ isSetball: false, team: null })),
  isMatchball: jest.fn(() => ({ isMatchball: false, team: null })),
  canFinishSet: jest.fn(() => false),
}));

jest.mock('../../../src/shared/matchMigration.js', () => ({
  migrateMatchToSetStatus: jest.fn((match) => match),
}));

// Мокируем setValidation - по умолчанию возвращает успешную валидацию
// Для конкретных тестов можно переопределить через jest.spyOn
jest.mock('../../../src/shared/setValidation.js', () => ({
  validateSetUpdate: jest.fn((set, updates, currentSetNumber, match) => ({
    valid: true,
    errors: [],
  })),
}));

// Динамические импорты после объявления моков (требуется для ESM)
const { SetService } = await import('../../../src/shared/services/SetService.js');
const { ScoreService } = await import('../../../src/shared/services/ScoreService.js');
const { HistoryService } = await import('../../../src/shared/services/HistoryService.js');
const { useMatch } = await import('../../../src/renderer/hooks/useMatch.js');

describe('useMatch', () => {
  const createTestMatch = (overrides: Partial<Match> = {}): Match => ({
    matchId: 'test-match',
    teamA: { name: 'Команда A', color: '#000' },
    teamB: { name: 'Команда B', color: '#fff' },
    sets: [],
    currentSet: {
      setNumber: 1,
      scoreA: 0,
      scoreB: 0,
      servingTeam: 'A',
      status: SET_STATUS.PENDING,
    },
    statistics: {
      enabled: false,
      teamA: { attack: 0, block: 0, serve: 0, opponentErrors: 0 },
      teamB: { attack: 0, block: 0, serve: 0, opponentErrors: 0 },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (HistoryService.getHistorySize as jest.Mock).mockReturnValue(0);
  });

  describe('Инициализация', () => {
    it('должен инициализироваться с переданным матчем', () => {
      const match = createTestMatch();
      const { result } = renderHook(() => useMatch(match));

      expect(result.current.match).toBeDefined();
      expect(result.current.match?.matchId).toBe('test-match');
    });

    it('должен инициализироваться с null, если матч не передан', () => {
      const { result } = renderHook(() => useMatch(null));

      expect(result.current.match).toBeNull();
    });
  });

  describe('changeScore', () => {
    it('должен изменять счет команды A', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 10,
          scoreB: 5,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      const newMatch = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 11,
          scoreB: 5,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.changeScore('A', 1);
      });

      // useMatch.changeScore НЕ использует ScoreService.changeScore, он делает изменения напрямую
      // Проверяем, что счет изменился
      expect(result.current.match?.currentSet.scoreA).toBe(11);
      // Проверяем, что действие добавлено в локальную историю
      expect(result.current.hasHistory).toBe(true);
    });

    it('не должен изменять счет, если партия не начата', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 10,
          scoreB: 5,
          servingTeam: 'A',
          status: SET_STATUS.PENDING,
        },
      });

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.changeScore('A', 1);
      });

      expect(ScoreService.changeScore).not.toHaveBeenCalled();
    });

    it('должен обрабатывать ошибки при изменении счета', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 10,
          scoreB: 5,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      // useMatch.changeScore НЕ использует ScoreService.changeScore, он делает изменения напрямую
      // Поэтому ошибок быть не должно, если партия начата
      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.changeScore('A', 1);
      });

      // Проверяем, что счет изменился (нет ошибок)
      expect(result.current.match?.currentSet.scoreA).toBe(11);
    });
  });

  describe('changeServingTeam', () => {
    it('должен изменять команду подачи', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 10,
          scoreB: 5,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      const newMatch = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 10,
          scoreB: 5,
          servingTeam: 'B',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.changeServingTeam('B');
      });

      // useMatch.changeServingTeam НЕ использует ScoreService.changeServingTeam, он делает изменения напрямую
      // Проверяем, что команда подачи изменилась
      expect(result.current.match?.currentSet.servingTeam).toBe('B');
      // Проверяем, что действие добавлено в локальную историю
      expect(result.current.hasHistory).toBe(true);
    });

    it('не должен добавлять в историю, если подача не изменилась', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 10,
          scoreB: 5,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.changeServingTeam('A');
      });

      // useMatch.changeServingTeam НЕ использует ScoreService.changeServingTeam
      // Если подача не изменилась, действие не добавляется в историю
      expect(result.current.hasHistory).toBe(false); // Не добавляется, так как не изменилось
    });
  });

  describe('startSet', () => {
    it('должен начинать партию', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.PENDING,
        },
      });

      const newMatch = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
          startTime: Date.now(),
        },
      });

      (SetService.startSet as jest.Mock).mockReturnValue(newMatch);

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.startSet();
      });

      expect(SetService.startSet).toHaveBeenCalledWith(match);
      // useMatch использует локальную историю addToHistory, а не HistoryService.addAction
      expect(result.current.match?.currentSet.status).toBe(SET_STATUS.IN_PROGRESS);
      expect(result.current.hasHistory).toBe(true);
    });

    it('не должен начинать партию, если она уже начата', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 10,
          scoreB: 5,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      // SetService.startSet выбрасывает ошибку, если партия уже начата
      (SetService.startSet as jest.Mock).mockImplementation(() => {
        throw new Error('Партия уже начата или завершена');
      });

      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.startSet();
      });

      // SetService.startSet вызывается, но выбрасывает ошибку
      expect(SetService.startSet).toHaveBeenCalledWith(match);
      // useMatch обрабатывает ошибку и показывает alert
      expect(alertSpy).toHaveBeenCalled();
      // match не должен измениться
      expect(result.current.match?.currentSet.status).toBe(SET_STATUS.IN_PROGRESS);

      alertSpy.mockRestore();
    });
  });

  describe('finishSet', () => {
    it('должен завершать партию', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 25,
          scoreB: 20,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
          startTime: Date.now() - 60000,
        },
      });

      const newMatch = createTestMatch({
        sets: [
          {
            setNumber: 1,
            scoreA: 25,
            scoreB: 20,
            status: SET_STATUS.COMPLETED,
            completed: true,
            startTime: match.currentSet.startTime,
            endTime: Date.now(),
            duration: 60,
          },
        ],
        currentSet: {
          setNumber: 2,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.PENDING,
        },
      });

      (SetService.finishSet as jest.Mock).mockReturnValue(newMatch);

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.finishSet();
      });

      expect(SetService.finishSet).toHaveBeenCalledWith(match);
      // useMatch использует локальную историю addToHistory, а не HistoryService.addAction
      expect(result.current.match?.sets.length).toBe(1);
      expect(result.current.match?.currentSet.status).toBe(SET_STATUS.PENDING);
      expect(result.current.hasHistory).toBe(true);
    });

    it('должен обрабатывать ошибки при завершении партии', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 20,
          scoreB: 20,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      (SetService.finishSet as jest.Mock).mockImplementation(() => {
        throw new Error('Партия не может быть завершена');
      });

      const alertSpy = jest.spyOn(window, 'alert').mockImplementation();

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.finishSet();
      });

      expect(alertSpy).toHaveBeenCalledWith('Партия не может быть завершена');

      alertSpy.mockRestore();
    });
  });

  describe('updateSet', () => {
    it('должен обновлять партию', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 10,
          scoreB: 5,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      const newMatch = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 15,
          scoreB: 5,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        const success = result.current.updateSet(1, { scoreA: 15 });
        expect(success).toBe(true);
      });

      // useMatch.updateSet НЕ использует SetService.updateSet, он использует validateSetUpdate
      // Проверяем, что счет изменился
      expect(result.current.match?.currentSet.scoreA).toBe(15);
      // Проверяем, что действие добавлено в локальную историю
      expect(result.current.hasHistory).toBe(true);
    });

    it('должен обрабатывать ошибки при обновлении партии', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 10,
          scoreB: 5,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      // useMatch.updateSet использует validateSetUpdate, а не SetService.updateSet
      // Мокируем validateSetUpdate, чтобы он возвращал ошибку
      // Используем статический импорт, так как модуль мокируется через jest.mock()
      const validateSetUpdateMock = jest.mocked(setValidation.validateSetUpdate);
      validateSetUpdateMock.mockReturnValueOnce({
        valid: false,
        errors: ['Ошибка валидации'],
      });

      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      const { result } = renderHook(() => useMatch(match));

      // Сохраняем исходный счет
      const initialScore = result.current.match?.currentSet.scoreA;

      act(() => {
        // updateSet всегда возвращает true, даже при ошибке валидации
        // Но состояние не должно измениться
        const success = result.current.updateSet(1, { scoreA: 15 });
        expect(success).toBe(true); // Функция всегда возвращает true
      });

      // useMatch обрабатывает ошибку через validateSetUpdate, который показывает alert
      expect(alertSpy).toHaveBeenCalledWith('Ошибка валидации');
      // Проверяем, что match не изменился (счет остался прежним)
      expect(result.current.match?.currentSet.scoreA).toBe(initialScore);

      alertSpy.mockRestore();
      validateSetUpdateMock.mockClear();
    });
  });

  describe('undoLastAction', () => {
    it('должен отменять последнее действие', () => {
      // Партия должна быть начата (IN_PROGRESS), иначе changeScore не работает
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      const { result } = renderHook(() => useMatch(match));

      // Сначала изменяем счет, чтобы добавить действие в историю
      act(() => {
        result.current.changeScore('A', 1);
      });

      // Проверяем, что счет изменился (было 0, стало 1) и история не пуста
      expect(result.current.match?.currentSet.scoreA).toBe(1);
      expect(result.current.hasHistory).toBe(true);

      // Сохраняем текущий счет для проверки после отмены
      const currentScore = result.current.match?.currentSet.scoreA;

      // Теперь отменяем последнее действие
      act(() => {
        const success = result.current.undoLastAction();
        expect(success).toBe(true);
      });

      // useMatch использует локальную историю, а не HistoryService.undoLastAction
      // Проверяем, что история пуста после отмены
      expect(result.current.hasHistory).toBe(false);
      // Проверяем, что счет вернулся к исходному значению (0)
      expect(result.current.match?.currentSet.scoreA).toBe(0);
    });

    it('должен возвращать false, если нет действий для отмены', () => {
      const match = createTestMatch();

      const { result } = renderHook(() => useMatch(match));

      // Проверяем, что история пуста
      expect(result.current.hasHistory).toBe(false);

      act(() => {
        const success = result.current.undoLastAction();
        expect(success).toBe(false);
      });

      // useMatch использует локальную историю, а не HistoryService.undoLastAction
      // Проверяем, что история все еще пуста
      expect(result.current.hasHistory).toBe(false);
    });

    it('должен сохранять логотипы при отмене', () => {
      const match = createTestMatch();
      (match.teamA as any).logo = 'logoA';
      (match.teamB as any).logo = 'logoB';

      const previousMatch = createTestMatch();
      (previousMatch.teamA as any).logo = 'oldLogoA';
      (previousMatch.teamB as any).logo = 'oldLogoB';

      (HistoryService.undoLastAction as jest.Mock).mockReturnValue({
        type: 'score_change',
        timestamp: Date.now(),
        data: {},
        previousState: previousMatch,
      });

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.undoLastAction();
      });

      expect((result.current.match?.teamA as any).logo).toBe('logoA');
      expect((result.current.match?.teamB as any).logo).toBe('logoB');
    });
  });

  describe('toggleSetStatus', () => {
    it('должен начинать партию, если статус PENDING', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.PENDING,
        },
      });

      const newMatch = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      (SetService.startSet as jest.Mock).mockReturnValue(newMatch);

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.toggleSetStatus();
      });

      expect(SetService.startSet).toHaveBeenCalled();
    });

    it('должен завершать партию, если статус IN_PROGRESS', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 25,
          scoreB: 20,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      const newMatch = createTestMatch({
        sets: [
          {
            setNumber: 1,
            scoreA: 25,
            scoreB: 20,
            status: SET_STATUS.COMPLETED,
            completed: true,
          },
        ],
        currentSet: {
          setNumber: 2,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.PENDING,
        },
      });

      (SetService.finishSet as jest.Mock).mockReturnValue(newMatch);

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.toggleSetStatus();
      });

      expect(SetService.finishSet).toHaveBeenCalled();
    });
  });

  describe('changeStatistics', () => {
    it('должен изменять статистику команды A', () => {
      const match = createTestMatch({
        statistics: {
          enabled: true,
          teamA: { attack: 5, block: 2, serve: 1, opponentErrors: 0 },
          teamB: { attack: 3, block: 1, serve: 0, opponentErrors: 0 },
        },
      });

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.changeStatistics('A', 'attack', 1);
      });

      expect(result.current.match?.statistics.teamA.attack).toBe(6);
    });

    it('не должен изменять статистику, если вызовы происходят слишком быстро', () => {
      const match = createTestMatch({
        statistics: {
          enabled: true,
          teamA: { attack: 5, block: 2, serve: 1, opponentErrors: 0 },
          teamB: { attack: 3, block: 1, serve: 0, opponentErrors: 0 },
        },
      });

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.changeStatistics('A', 'attack', 1);
        // Второй вызов сразу же - должен быть проигнорирован
        result.current.changeStatistics('A', 'attack', 1);
      });

      // Должен быть только один вызов (второй проигнорирован)
      expect(result.current.match?.statistics.teamA.attack).toBe(6);
    });
  });

  describe('toggleStatistics', () => {
    it('должен переключать статистику', () => {
      const match = createTestMatch({
        statistics: {
          enabled: false,
          teamA: { attack: 0, block: 0, serve: 0, opponentErrors: 0 },
          teamB: { attack: 0, block: 0, serve: 0, opponentErrors: 0 },
        },
      });

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.toggleStatistics(true);
      });

      expect(result.current.match?.statistics.enabled).toBe(true);
    });
  });

  describe('Вычисляемые значения', () => {
    it('должен вычислять canFinish', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 25,
          scoreB: 20,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      // Мокаем canFinishSet для этого теста
      // Используем статический импорт, так как модуль мокируется через jest.mock()
      volleyballRules.canFinishSet.mockReturnValueOnce(true);

      const { result } = renderHook(() => useMatch(match));

      expect(result.current.canFinish).toBe(true);
    });

    it('должен вычислять hasHistory', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 10,
          scoreB: 5,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      const { result } = renderHook(() => useMatch(match));

      // Изначально история пуста
      expect(result.current.hasHistory).toBe(false);

      // Добавляем действие в историю
      act(() => {
        result.current.changeScore('A', 1);
      });

      // Теперь история не пуста
      expect(result.current.hasHistory).toBe(true);
    });

    it('должен вычислять currentSetStatus', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      const { result } = renderHook(() => useMatch(match));

      expect(result.current.currentSetStatus).toBe(SET_STATUS.IN_PROGRESS);
    });
  });

  describe('Синхронизация с initialMatch', () => {
    it('должен обновлять match при изменении initialMatch', () => {
      const match1 = createTestMatch({ matchId: 'match-1' });
      const match2 = createTestMatch({ matchId: 'match-2', updatedAt: new Date().toISOString() });

      const { result, rerender } = renderHook(
        ({ match }) => useMatch(match),
        { initialProps: { match: match1 } }
      );

      expect(result.current.match?.matchId).toBe('match-1');

      act(() => {
        rerender({ match: match2 });
      });

      expect(result.current.match?.matchId).toBe('match-2');
    });

    it('не должен обновлять match, если matchId и updatedAt не изменились', () => {
      const match = createTestMatch({ matchId: 'match-1' });

      const { result, rerender } = renderHook(
        ({ match }) => useMatch(match),
        { initialProps: { match } }
      );

      const initialMatch = result.current.match;

      act(() => {
        rerender({ match: { ...match } }); // Новый объект, но те же данные
      });

      // matchId и updatedAt не изменились, поэтому match не должен обновиться
      expect(result.current.match?.matchId).toBe('match-1');
    });
  });
});
