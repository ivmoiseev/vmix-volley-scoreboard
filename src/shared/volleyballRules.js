/**
 * Правила волейбола (ВФВ)
 */

/**
 * Определяет, является ли текущая ситуация сетболом
 * Сетбол - когда команде осталось выиграть одно очко для победы в партии
 * - В обычных сетах (1-4): при счете >= 24:23 (или 24:20, 25:24 и т.д.)
 * - В 5-м сете: при счете >= 14:13 (или 14:10, 15:14 и т.д.)
 * - Если счет равный (24:24 или 14:14), то сетбола нет
 * - Если счет становится 25:24, то команда с 25 очками снова на сетболе
 * @param {number} scoreA - счет команды A
 * @param {number} scoreB - счет команды B
 * @param {number} setNumber - номер текущего сета (1-5)
 * @returns {Object} { isSetball: boolean, team: 'A'|'B'|null } - команда, которая на сетболе
 */
function isSetball(scoreA, scoreB, setNumber = 1) {
  // Порог для сетбола: 24 в обычных сетах, 14 в 5-м сете
  const setballThreshold = setNumber === 5 ? 14 : 24;
  
  const maxScore = Math.max(scoreA, scoreB);
  const minScore = Math.min(scoreA, scoreB);
  
  // Сетбол: команда на сетболе, если она набрала пороговое значение или больше
  // и ведет минимум на 1 очко
  // НО НЕ когда счет равный (24:24 или 14:14) - там сетбола нет
  if (maxScore >= setballThreshold && (maxScore - minScore) >= 1) {
    // Если счет равный (24:24, 25:25, 14:14 и т.д.) - сетбола нет
    if (scoreA === scoreB) {
      return {
        isSetball: false,
        team: null
      };
    }
    
    // Команда на сетболе, если она ведет
    return {
      isSetball: true,
      team: scoreA > scoreB ? 'A' : 'B'
    };
  }
  
  return {
    isSetball: false,
    team: null
  };
}

/**
 * Определяет, является ли текущая ситуация матчболом
 * Матчбол - когда команде осталось выиграть одно очко для победы во всем матче
 * Это происходит, когда команда уже ведет по сетам (2:0, 2:1) и находится на сетболе в текущем сете
 * @param {Array} sets - массив завершенных сетов
 * @param {number} currentSetNumber - номер текущего сета (1-5)
 * @param {number} scoreA - счет команды A в текущем сете
 * @param {number} scoreB - счет команды B в текущем сете
 * @returns {Object} { isMatchball: boolean, team: 'A'|'B'|null } - команда, которая на матчболе
 */
function isMatchball(sets, currentSetNumber, scoreA, scoreB) {
  // Подсчитываем выигранные партии
  // Учитываем только завершенные партии (completed === true или status === 'completed')
  const winsA = sets.filter(s => {
    const isCompleted = s.completed === true || s.status === 'completed';
    return isCompleted && s.scoreA > s.scoreB;
  }).length;
  const winsB = sets.filter(s => {
    const isCompleted = s.completed === true || s.status === 'completed';
    return isCompleted && s.scoreB > s.scoreA;
  }).length;
  
  // Матчбол возможен, если одна из команд уже выиграла 2 сета
  // и находится на сетболе в текущем сете
  if (winsA === 2 || winsB === 2) {
    const setballInfo = isSetball(scoreA, scoreB, currentSetNumber);
    if (setballInfo.isSetball) {
      // Проверяем, какая команда на сетболе и ведет ли она по сетам
      if (setballInfo.team === 'A' && winsA === 2) {
        return {
          isMatchball: true,
          team: 'A'
        };
      }
      if (setballInfo.team === 'B' && winsB === 2) {
        return {
          isMatchball: true,
          team: 'B'
        };
      }
    }
  }
  
  return {
    isMatchball: false,
    team: null
  };
}

/**
 * Проверяет, может ли партия быть завершена
 * Партия завершается когда:
 * - В обычных сетах (1-4): одна из команд набрала 25 очков и разница минимум 2 очка
 * - В 5-м сете (тай-брейк): одна из команд набрала 15 очков и разница минимум 2 очка
 * - Или при счете 24:24 (или 14:14 в 5-м сете) игра продолжается до разницы в 2 очка
 * @param {number} scoreA - счет команды A
 * @param {number} scoreB - счет команды B
 * @param {number} setNumber - номер текущего сета (1-5)
 * @returns {boolean} - можно ли завершить партию
 */
function canFinishSet(scoreA, scoreB, setNumber = 1) {
  const maxScore = Math.max(scoreA, scoreB);
  const minScore = Math.min(scoreA, scoreB);
  
  // Пороги для завершения сета: 25 в обычных сетах, 15 в 5-м сете
  const finishThreshold = setNumber === 5 ? 15 : 25;
  const tieThreshold = setNumber === 5 ? 14 : 24;
  
  // Если одна команда набрала пороговое значение и разница минимум 2
  if (maxScore >= finishThreshold && (maxScore - minScore) >= 2) {
    return true;
  }
  
  // Если счет достиг порога тай-брейка (24:24 или 14:14), игра продолжается до разницы в 2
  if (maxScore >= tieThreshold && minScore >= tieThreshold) {
    if ((maxScore - minScore) >= 2) {
      return true;
    }
  }
  
  return false;
}

/**
 * Определяет победителя партии
 */
function getSetWinner(scoreA, scoreB) {
  if (scoreA > scoreB) {
    return 'A';
  } else if (scoreB > scoreA) {
    return 'B';
  }
  return null;
}

/**
 * Определяет победителя матча
 * Матч выигрывает команда, которая выиграла 3 партии
 */
function getMatchWinner(sets) {
  const completedSets = sets.filter(s => s.completed);
  const winsA = completedSets.filter(s => s.scoreA > s.scoreB).length;
  const winsB = completedSets.filter(s => s.scoreB > s.scoreA).length;
  
  if (winsA >= 3) {
    return 'A';
  } else if (winsB >= 3) {
    return 'B';
  }
  
  return null;
}

/**
 * Проверяет, завершен ли матч
 */
function isMatchFinished(sets) {
  return getMatchWinner(sets) !== null;
}

// Экспорт для использования в ES-модулях
export {
  isSetball,
  isMatchball,
  canFinishSet,
  getSetWinner,
  getMatchWinner,
  isMatchFinished,
};

