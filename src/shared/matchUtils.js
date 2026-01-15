/**
 * Утилиты для работы с матчем (JS версия для использования в main процессе)
 */

/**
 * Создает новый пустой матч
 */
function createNewMatch() {
  const now = new Date().toISOString();
  // Получаем часовой пояс по умолчанию из системы
  const defaultTimezone = typeof Intl !== 'undefined' && Intl.DateTimeFormat 
    ? Intl.DateTimeFormat().resolvedOptions().timeZone 
    : 'UTC';

  return {
    matchId: generateUUID(),
    tournament: "",
    tournamentSubtitle: "",
    location: "",
    venue: "",
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().split(" ")[0].substring(0, 5),
    timezone: defaultTimezone,
    teamA: {
      name: "Команда А",
      color: "#3498db",
      liberoColor: undefined,
      logo: undefined,
      coach: "",
      roster: [],
    },
    teamB: {
      name: "Команда Б",
      color: "#e74c3c",
      liberoColor: undefined,
      logo: undefined,
      coach: "",
      roster: [],
    },
    officials: {
      referee1: "",
      referee2: "",
      lineJudge1: "",
      lineJudge2: "",
      scorer: "",
    },
    sets: [],
    currentSet: {
      setNumber: 1,
      scoreA: 0,
      scoreB: 0,
      servingTeam: "A",
      status: "pending", // Обязательное поле для новой архитектуры
    },
    statistics: {
      enabled: false,
      teamA: {
        attack: 0,
        block: 0,
        serve: 0,
        opponentErrors: 0,
      },
      teamB: {
        attack: 0,
        block: 0,
        serve: 0,
        opponentErrors: 0,
      },
    },
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Валидация данных матча
 */
function validateMatch(match) {
  try {
    if (!match || typeof match !== "object") {
      console.error('Validation failed: match is not an object', match);
      return false;
    }

    if (!match.matchId || typeof match.matchId !== "string") {
      console.error('Validation failed: matchId is missing or not a string', match.matchId);
      return false;
    }

    if (!match.teamA || !match.teamB) {
      console.error('Validation failed: teamA or teamB is missing', { teamA: !!match.teamA, teamB: !!match.teamB });
      return false;
    }

    if (!match.teamA.name || !match.teamB.name) {
      console.error('Validation failed: team names are missing', { teamAName: !!match.teamA.name, teamBName: !!match.teamB.name });
      return false;
    }

    if (!match.currentSet) {
      console.error('Validation failed: currentSet is missing');
      return false;
    }

    // Проверяем наличие обязательного поля status в currentSet
    if (!match.currentSet.status || typeof match.currentSet.status !== 'string') {
      console.error('Validation failed: currentSet.status is missing or invalid', match.currentSet.status);
      return false;
    }

    if (!Array.isArray(match.sets)) {
      console.error('Validation failed: sets is not an array', typeof match.sets);
      return false;
    }

    // Проверяем наличие обязательного поля status в каждой партии
    for (let i = 0; i < match.sets.length; i++) {
      const set = match.sets[i];
      if (!set.status || typeof set.status !== 'string') {
        console.error(`Validation failed: sets[${i}].status is missing or invalid`, set.status);
        return false;
      }
    }

    if (!match.statistics) {
      console.error('Validation failed: statistics is missing');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Validation error:', error);
    return false;
  }
}

/**
 * Простая генерация UUID
 */
function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Создает объект завершенной партии на основе текущей партии
 * @param {Object} currentSet - текущая партия
 * @param {number} endTime - время завершения (timestamp)
 * @param {Function} calculateDuration - функция для вычисления продолжительности
 * @returns {Object} объект завершенной партии
 */
function createCompletedSet(currentSet, endTime, calculateDuration) {
  const { setNumber, scoreA, scoreB, startTime } = currentSet;
  
  const duration = startTime && calculateDuration
    ? calculateDuration(startTime, endTime)
    : null;

  return {
    setNumber,
    scoreA,
    scoreB,
    completed: true,
    status: 'completed',
    startTime: startTime || undefined,
    endTime,
    duration,
  };
}

/**
 * Создает новую партию со статусом PENDING (после завершения предыдущей)
 * Сохраняет текущий номер и счет - они обновятся при начале новой партии
 * @param {Object} currentSet - текущая партия
 * @param {string} winner - победитель предыдущей партии ('A' или 'B')
 * @returns {Object} новая партия со статусом PENDING
 */
function createPendingSet(currentSet, winner) {
  return {
    ...currentSet,
    servingTeam: winner,
    status: 'pending',
  };
}

export {
  createNewMatch,
  validateMatch,
  generateUUID,
  createCompletedSet,
  createPendingSet,
};
