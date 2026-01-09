/**
 * Утилиты для работы с матчем (JS версия для использования в main процессе)
 */

/**
 * Создает новый пустой матч
 */
function createNewMatch() {
  const now = new Date().toISOString();

  return {
    matchId: generateUUID(),
    tournament: "",
    tournamentSubtitle: "",
    location: "",
    venue: "",
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().split(" ")[0].substring(0, 5),
    teamA: {
      name: "Команда А",
      color: "#3498db",
      logo: undefined,
      coach: "",
      roster: [],
    },
    teamB: {
      name: "Команда Б",
      color: "#e74c3c",
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

    if (!Array.isArray(match.sets)) {
      console.error('Validation failed: sets is not an array', typeof match.sets);
      return false;
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

module.exports = {
  createNewMatch,
  validateMatch,
};
