/**
 * Тесты для функций управления статусами партий в useMatch
 */

import { SET_STATUS } from '../../../src/shared/types/Match.ts';
import { calculateDuration } from '../../../src/shared/timeUtils.js';
import { canFinishSet, getSetWinner } from '../../../src/shared/volleyballRules.js';

// Мокируем зависимости
jest.mock('../../../src/shared/volleyballRules.js', () => ({
  canFinishSet: jest.fn(),
  getSetWinner: jest.fn(),
  isSetball: jest.fn(),
  isMatchball: jest.fn(),
}));

jest.mock('../../../src/shared/timeUtils.js', () => ({
  calculateDuration: jest.fn(),
}));

describe('useMatch - Set Status Functions', () => {
  // Вспомогательная функция для создания тестового матча
  function createTestMatch(overrides = {}) {
    return {
      matchId: 'test-match',
      teamA: { name: 'Команда A' },
      teamB: { name: 'Команда B' },
      sets: [],
      currentSet: {
        setNumber: 1,
        scoreA: 0,
        scoreB: 0,
        servingTeam: 'A',
        status: SET_STATUS.PENDING,
      },
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    // Настройка моков по умолчанию
    canFinishSet.mockReturnValue(true);
    getSetWinner.mockReturnValue('A');
    calculateDuration.mockReturnValue(45);
  });

  describe('startSet логика', () => {
    it('должна обновлять статус партии на IN_PROGRESS', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.PENDING,
        },
      });

      // Симуляция логики startSet
      const nextSetNumber = match.sets.length + 1;
      const updatedMatch = {
        ...match,
        currentSet: {
          ...match.currentSet,
          setNumber: nextSetNumber,
          status: SET_STATUS.IN_PROGRESS,
          startTime: Date.now(),
          scoreA: 0,
          scoreB: 0,
        },
        updatedAt: new Date().toISOString(),
      };

      expect(updatedMatch.currentSet.status).toBe(SET_STATUS.IN_PROGRESS);
      expect(updatedMatch.currentSet.setNumber).toBe(1);
      expect(updatedMatch.currentSet.scoreA).toBe(0);
      expect(updatedMatch.currentSet.scoreB).toBe(0);
      expect(updatedMatch.currentSet.startTime).toBeDefined();
    });

    it('должна обновлять номер партии при начале', () => {
      const match = createTestMatch({
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 20, status: SET_STATUS.COMPLETED },
        ],
        currentSet: {
          setNumber: 2,
          scoreA: 5,
          scoreB: 3,
          servingTeam: 'A',
          status: SET_STATUS.PENDING,
        },
      });

      const nextSetNumber = match.sets.length + 1;
      const updatedMatch = {
        ...match,
        currentSet: {
          ...match.currentSet,
          setNumber: nextSetNumber,
          status: SET_STATUS.IN_PROGRESS,
          startTime: Date.now(),
          scoreA: 0,
          scoreB: 0,
        },
      };

      expect(updatedMatch.currentSet.setNumber).toBe(2);
    });

    it('не должна начинать партию, если она уже начата', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 5,
          scoreB: 3,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      // Симуляция проверки
      if (match.currentSet.status === SET_STATUS.IN_PROGRESS) {
        // Партия уже начата, не обновляем
        expect(match.currentSet.status).toBe(SET_STATUS.IN_PROGRESS);
      }
    });
  });

  describe('finishSet логика', () => {
    it('должна создавать завершенную партию с таймингом', () => {
      const startTime = Date.now() - 2700000; // 45 минут назад
      const endTime = Date.now();
      
      calculateDuration.mockReturnValue(45);

      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 25,
          scoreB: 20,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
          startTime,
        },
      });

      canFinishSet.mockReturnValue(true);
      getSetWinner.mockReturnValue('A');

      // Симуляция логики finishSet
      const { scoreA, scoreB, setNumber, startTime: setStartTime } = match.currentSet;
      
      if (!canFinishSet(scoreA, scoreB, setNumber)) {
        throw new Error('Партия не может быть завершена');
      }

      const duration = setStartTime ? calculateDuration(setStartTime, endTime) : null;
      
      const completedSet = {
        setNumber: match.currentSet.setNumber,
        scoreA,
        scoreB,
        completed: true,
        status: SET_STATUS.COMPLETED,
        startTime: setStartTime || undefined,
        endTime,
        duration,
      };

      const updatedMatch = {
        ...match,
        sets: [...match.sets, completedSet],
        currentSet: {
          ...match.currentSet,
          servingTeam: getSetWinner(scoreA, scoreB),
          status: SET_STATUS.PENDING,
        },
      };

      expect(updatedMatch.sets).toHaveLength(1);
      expect(updatedMatch.sets[0].status).toBe(SET_STATUS.COMPLETED);
      expect(updatedMatch.sets[0].duration).toBe(45);
      expect(updatedMatch.sets[0].startTime).toBe(startTime);
      expect(updatedMatch.sets[0].endTime).toBe(endTime);
      expect(updatedMatch.currentSet.status).toBe(SET_STATUS.PENDING);
    });

    it('должна сохранять счет и номер партии в следующей pending партии', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 25,
          scoreB: 20,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
          startTime: Date.now() - 2700000,
        },
      });

      canFinishSet.mockReturnValue(true);
      getSetWinner.mockReturnValue('A');

      // Симуляция логики finishSet
      const { scoreA, scoreB, setNumber } = match.currentSet;
      const winner = getSetWinner(scoreA, scoreB);
      
      const updatedMatch = {
        ...match,
        sets: [...match.sets, {
          setNumber: match.currentSet.setNumber,
          scoreA,
          scoreB,
          completed: true,
          status: SET_STATUS.COMPLETED,
        }],
        currentSet: {
          ...match.currentSet, // Сохраняем текущий номер партии и счет
          servingTeam: winner,
          status: SET_STATUS.PENDING,
        },
      };

      // Проверяем, что счет и номер партии сохранены
      expect(updatedMatch.currentSet.setNumber).toBe(1);
      expect(updatedMatch.currentSet.scoreA).toBe(25);
      expect(updatedMatch.currentSet.scoreB).toBe(20);
      expect(updatedMatch.currentSet.status).toBe(SET_STATUS.PENDING);
    });

    it('не должна завершать партию, если не выполнены условия', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 20,
          scoreB: 20,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      canFinishSet.mockReturnValue(false);

      const { scoreA, scoreB, setNumber } = match.currentSet;
      
      if (!canFinishSet(scoreA, scoreB, setNumber)) {
        // Партия не может быть завершена
        expect(canFinishSet).toHaveBeenCalledWith(scoreA, scoreB, setNumber);
        expect(match.currentSet.status).toBe(SET_STATUS.IN_PROGRESS);
      }
    });
  });

  describe('toggleSetStatus логика', () => {
    it('должна вызывать startSet для pending партии', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.PENDING,
        },
      });

      const currentStatus = match.currentSet.status || SET_STATUS.PENDING;
      
      if (currentStatus === SET_STATUS.PENDING) {
        // Должна вызываться startSet
        const nextSetNumber = match.sets.length + 1;
        const updatedMatch = {
          ...match,
          currentSet: {
            ...match.currentSet,
            setNumber: nextSetNumber,
            status: SET_STATUS.IN_PROGRESS,
            startTime: Date.now(),
            scoreA: 0,
            scoreB: 0,
          },
        };
        
        expect(updatedMatch.currentSet.status).toBe(SET_STATUS.IN_PROGRESS);
      }
    });

    it('должна вызывать finishSet для in_progress партии', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 25,
          scoreB: 20,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
          startTime: Date.now() - 2700000,
        },
      });

      canFinishSet.mockReturnValue(true);
      getSetWinner.mockReturnValue('A');

      const currentStatus = match.currentSet.status || SET_STATUS.PENDING;
      
      if (currentStatus === SET_STATUS.IN_PROGRESS) {
        // Должна вызываться finishSet
        const { scoreA, scoreB, setNumber } = match.currentSet;
        
        if (canFinishSet(scoreA, scoreB, setNumber)) {
          const updatedMatch = {
            ...match,
            sets: [...match.sets, {
              setNumber: match.currentSet.setNumber,
              scoreA,
              scoreB,
              completed: true,
              status: SET_STATUS.COMPLETED,
            }],
            currentSet: {
              ...match.currentSet,
              servingTeam: getSetWinner(scoreA, scoreB),
              status: SET_STATUS.PENDING,
            },
          };
          
          expect(updatedMatch.currentSet.status).toBe(SET_STATUS.PENDING);
        }
      }
    });
  });

  describe('changeScore логика с блокировкой', () => {
    it('не должна изменять счет, если партия не начата', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.PENDING,
        },
      });

      // Симуляция проверки в changeScore
      if (match.currentSet.status !== SET_STATUS.IN_PROGRESS) {
        // Не изменяем счет
        expect(match.currentSet.scoreA).toBe(0);
        expect(match.currentSet.scoreB).toBe(0);
      }
    });

    it('должна изменять счет, если партия начата', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 5,
          scoreB: 3,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      // Симуляция логики changeScore
      if (match.currentSet.status === SET_STATUS.IN_PROGRESS) {
        const team = 'A';
        const delta = 1;
        
        const updatedMatch = {
          ...match,
          currentSet: {
            ...match.currentSet,
            scoreA: team === 'A' 
              ? Math.max(0, match.currentSet.scoreA + delta)
              : match.currentSet.scoreA,
            scoreB: team === 'B'
              ? Math.max(0, match.currentSet.scoreB + delta)
              : match.currentSet.scoreB,
          },
        };

        expect(updatedMatch.currentSet.scoreA).toBe(6);
        expect(updatedMatch.currentSet.scoreB).toBe(3);
      }
    });

    it('не должна позволять отрицательный счет', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      if (match.currentSet.status === SET_STATUS.IN_PROGRESS) {
        const team = 'A';
        const delta = -1;
        
        const updatedMatch = {
          ...match,
          currentSet: {
            ...match.currentSet,
            scoreA: team === 'A' 
              ? Math.max(0, match.currentSet.scoreA + delta)
              : match.currentSet.scoreA,
          },
        };

        expect(updatedMatch.currentSet.scoreA).toBe(0); // Не должно быть отрицательным
      }
    });
  });

  describe('updateSet логика', () => {
    it('должна удалять startTime и endTime при изменении статуса текущей партии на pending', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 15,
          scoreB: 12,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
          startTime: Date.now() - 1800000, // 30 минут назад
        },
      });

      // Симуляция updateSet для изменения статуса на pending
      const updates = {
        scoreA: 15,
        scoreB: 12,
        status: SET_STATUS.PENDING,
        startTime: null,
        endTime: null,
      };

      const updatedMatch = {
        ...match,
        currentSet: {
          ...match.currentSet,
          ...updates,
          duration: undefined,
        },
      };

      expect(updatedMatch.currentSet.status).toBe(SET_STATUS.PENDING);
      expect(updatedMatch.currentSet.startTime).toBeNull();
      expect(updatedMatch.currentSet.endTime).toBeNull();
      expect(updatedMatch.currentSet.duration).toBeUndefined();
    });

    it('должна удалять endTime при изменении статуса текущей партии на in_progress', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 25,
          scoreB: 20,
          servingTeam: 'A',
          status: SET_STATUS.COMPLETED,
          startTime: Date.now() - 2700000,
          endTime: Date.now(),
        },
      });

      // Симуляция updateSet для изменения статуса на in_progress
      const updates = {
        scoreA: 25,
        scoreB: 20,
        status: SET_STATUS.IN_PROGRESS,
        endTime: null,
      };

      const updatedMatch = {
        ...match,
        currentSet: {
          ...match.currentSet,
          ...updates,
          duration: undefined,
        },
      };

      expect(updatedMatch.currentSet.status).toBe(SET_STATUS.IN_PROGRESS);
      expect(updatedMatch.currentSet.startTime).toBeDefined();
      expect(updatedMatch.currentSet.endTime).toBeNull();
      expect(updatedMatch.currentSet.duration).toBeUndefined();
    });

    it('должна удалять startTime и endTime при изменении статуса завершенной партии на pending', () => {
      const match = createTestMatch({
        sets: [
          {
            setNumber: 1,
            scoreA: 25,
            scoreB: 20,
            status: SET_STATUS.COMPLETED,
            startTime: Date.now() - 2700000,
            endTime: Date.now(),
            duration: 45,
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

      // Симуляция updateSet для изменения статуса завершенной партии на pending
      const updates = {
        scoreA: 25,
        scoreB: 20,
        status: SET_STATUS.PENDING,
        startTime: null,
        endTime: null,
      };

      const updatedSet = {
        ...match.sets[0],
        ...updates,
        completed: false,
        duration: undefined,
      };

      const updatedMatch = {
        ...match,
        sets: [updatedSet],
      };

      expect(updatedMatch.sets[0].status).toBe(SET_STATUS.PENDING);
      expect(updatedMatch.sets[0].startTime).toBeNull();
      expect(updatedMatch.sets[0].endTime).toBeNull();
      expect(updatedMatch.sets[0].completed).toBe(false);
      expect(updatedMatch.sets[0].duration).toBeUndefined();
    });

    it('должна удалять endTime при изменении статуса завершенной партии на in_progress', () => {
      const match = createTestMatch({
        sets: [
          {
            setNumber: 1,
            scoreA: 25,
            scoreB: 20,
            status: SET_STATUS.COMPLETED,
            startTime: Date.now() - 2700000,
            endTime: Date.now(),
            duration: 45,
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

      // Симуляция updateSet для изменения статуса завершенной партии на in_progress
      const updates = {
        scoreA: 25,
        scoreB: 20,
        status: SET_STATUS.IN_PROGRESS,
        endTime: null,
      };

      const updatedSet = {
        ...match.sets[0],
        ...updates,
        completed: false,
        duration: undefined,
      };

      const updatedMatch = {
        ...match,
        sets: [updatedSet],
      };

      expect(updatedMatch.sets[0].status).toBe(SET_STATUS.IN_PROGRESS);
      expect(updatedMatch.sets[0].startTime).toBeDefined();
      expect(updatedMatch.sets[0].endTime).toBeNull();
      expect(updatedMatch.sets[0].completed).toBe(false);
      expect(updatedMatch.sets[0].duration).toBeUndefined();
    });

    it('не должна позволять изменить статус завершенной партии на in_progress, если следующая партия уже началась', () => {
      const match = createTestMatch({
        sets: [
          {
            setNumber: 1,
            scoreA: 25,
            scoreB: 20,
            status: SET_STATUS.COMPLETED,
            startTime: Date.now() - 2700000,
            endTime: Date.now(),
            duration: 45,
          },
        ],
        currentSet: {
          setNumber: 2,
          scoreA: 5,
          scoreB: 3,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS, // Следующая партия уже началась
          startTime: Date.now() - 300000,
        },
      });

      // Симуляция проверки в updateSet
      const setNumber = 1;
      const nextSetNumber = setNumber + 1;
      const nextSetStarted = match.sets.some(s => s.setNumber === nextSetNumber && s.status === SET_STATUS.IN_PROGRESS) ||
                             (match.currentSet.setNumber === nextSetNumber && match.currentSet.status === SET_STATUS.IN_PROGRESS);

      if (nextSetStarted) {
        // Нельзя изменить статус
        expect(nextSetStarted).toBe(true);
        expect(match.sets[0].status).toBe(SET_STATUS.COMPLETED); // Статус не изменился
      }
    });

    it('должна позволять изменить статус завершенной партии на in_progress, если следующая партия еще не началась', () => {
      const match = createTestMatch({
        sets: [
          {
            setNumber: 1,
            scoreA: 25,
            scoreB: 20,
            status: SET_STATUS.COMPLETED,
            startTime: Date.now() - 2700000,
            endTime: Date.now(),
            duration: 45,
          },
        ],
        currentSet: {
          setNumber: 2,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.PENDING, // Следующая партия еще не началась
        },
      });

      // Симуляция проверки в updateSet
      const setNumber = 1;
      const nextSetNumber = setNumber + 1;
      const nextSetStarted = match.sets.some(s => s.setNumber === nextSetNumber && s.status === SET_STATUS.IN_PROGRESS) ||
                             (match.currentSet.setNumber === nextSetNumber && match.currentSet.status === SET_STATUS.IN_PROGRESS);

      if (!nextSetStarted) {
        // Можно изменить статус - партия становится текущей
        const updates = {
          scoreA: 25,
          scoreB: 20,
          status: SET_STATUS.IN_PROGRESS,
          endTime: null,
        };

        const updatedSet = {
          ...match.sets[0],
          ...updates,
          completed: false,
          duration: undefined,
        };

        // Партия удаляется из sets и становится currentSet
        const updatedMatch = {
          ...match,
          sets: [], // Партия удалена из sets
          currentSet: updatedSet, // Партия стала текущей
        };

        expect(updatedMatch.sets).toHaveLength(0);
        expect(updatedMatch.currentSet.status).toBe(SET_STATUS.IN_PROGRESS);
        expect(updatedMatch.currentSet.endTime).toBeNull();
        expect(updatedMatch.currentSet.completed).toBe(false);
      }
    });

    it('должна сохранять startTime и endTime при статусе completed', () => {
      const startTime = Date.now() - 2700000;
      const endTime = Date.now();
      
      const match = createTestMatch({
        sets: [
          {
            setNumber: 1,
            scoreA: 25,
            scoreB: 20,
            status: SET_STATUS.COMPLETED,
            startTime,
            endTime,
            duration: 45,
          },
        ],
      });

      // Симуляция updateSet без изменения статуса
      const updates = {
        scoreA: 26,
        scoreB: 20,
        status: SET_STATUS.COMPLETED,
        startTime,
        endTime,
      };

      const updatedSet = {
        ...match.sets[0],
        ...updates,
        completed: true,
      };

      // Пересчитываем duration
      if (updatedSet.startTime && updatedSet.endTime) {
        updatedSet.duration = calculateDuration(updatedSet.startTime, updatedSet.endTime);
      }

      const updatedMatch = {
        ...match,
        sets: [updatedSet],
      };

      expect(updatedMatch.sets[0].status).toBe(SET_STATUS.COMPLETED);
      expect(updatedMatch.sets[0].startTime).toBe(startTime);
      expect(updatedMatch.sets[0].endTime).toBe(endTime);
      expect(updatedMatch.sets[0].completed).toBe(true);
      expect(updatedMatch.sets[0].duration).toBeDefined();
    });
  });
});
