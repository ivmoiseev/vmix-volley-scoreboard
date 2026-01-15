/**
 * Фабрика для создания тестовых матчей
 * Используется в интеграционных тестах
 */

import { createNewMatch } from '../../src/shared/matchUtils.js';
import { SET_STATUS } from '../../src/shared/types/Match.ts';

/**
 * Создает новый пустой матч для тестов
 * @returns {Object} Новый матч
 */
export function createTestMatch() {
  return createNewMatch();
}

/**
 * Создает матч с начатой партией
 * @returns {Object} Матч с партией в статусе IN_PROGRESS
 */
export function createMatchWithStartedSet() {
  const match = createNewMatch();
  return {
    ...match,
    currentSet: {
      ...match.currentSet,
      status: SET_STATUS.IN_PROGRESS,
      startTime: Date.now(),
    },
  };
}

/**
 * Создает матч с завершенной партией
 * @param {number} setNumber - Номер завершенной партии
 * @param {number} scoreA - Счет команды A
 * @param {number} scoreB - Счет команды B
 * @returns {Object} Матч с завершенной партией
 */
export function createMatchWithCompletedSet(setNumber = 1, scoreA = 25, scoreB = 20) {
  const match = createNewMatch();
  const now = Date.now();
  
  return {
    ...match,
    sets: [
      {
        setNumber,
        scoreA,
        scoreB,
        completed: true,
        status: SET_STATUS.COMPLETED,
        startTime: now - 3600000, // 1 час назад
        endTime: now,
        duration: 60, // 60 минут
      },
    ],
    currentSet: {
      ...match.currentSet,
      setNumber: setNumber + 1,
      status: SET_STATUS.PENDING,
      // ВАЖНО: Счет сохраняется после завершения партии (не обнуляется)
      scoreA: scoreA,
      scoreB: scoreB,
    },
  };
}

/**
 * Создает матч с несколькими завершенными партиями
 * @param {number} completedSetsCount - Количество завершенных партий
 * @returns {Object} Матч с несколькими завершенными партиями
 */
export function createMatchWithMultipleSets(completedSetsCount = 2) {
  const match = createNewMatch();
  const sets = [];
  const now = Date.now();
  
  for (let i = 1; i <= completedSetsCount; i++) {
    sets.push({
      setNumber: i,
      scoreA: 25,
      scoreB: i % 2 === 0 ? 20 : 23, // Чередуем победителей
      completed: true,
      status: SET_STATUS.COMPLETED,
      startTime: now - (completedSetsCount - i + 1) * 3600000,
      endTime: now - (completedSetsCount - i) * 3600000,
      duration: 60,
    });
  }
  
  return {
    ...match,
    sets,
    currentSet: {
      ...match.currentSet,
      setNumber: completedSetsCount + 1,
      status: SET_STATUS.PENDING,
    },
  };
}

/**
 * Создает матч с текущей партией в процессе
 * @param {number} scoreA - Текущий счет команды A
 * @param {number} scoreB - Текущий счет команды B
 * @param {number} setNumber - Номер текущей партии
 * @returns {Object} Матч с партией в процессе
 */
export function createMatchWithInProgressSet(scoreA = 15, scoreB = 12, setNumber = 1) {
  const match = createNewMatch();
  return {
    ...match,
    currentSet: {
      ...match.currentSet,
      setNumber,
      scoreA,
      scoreB,
      status: SET_STATUS.IN_PROGRESS,
      startTime: Date.now() - 1800000, // 30 минут назад
      servingTeam: scoreA > scoreB ? 'A' : 'B',
    },
  };
}
