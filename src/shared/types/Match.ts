/**
 * Типы данных для матча
 */

export interface Player {
  number: number;
  name: string;
  position: string;
  isStarter: boolean;
  numberOnCard?: string; // Номер игрока на карте (опционально)
}

export interface Team {
  name: string;
  color: string; // Цвет формы игроков
  liberoColor?: string; // Цвет формы либеро
  logo?: string; // base64 или путь к файлу
  coach?: string;
  roster?: Player[];
  startingLineupOrder?: number[]; // Индексы игроков из roster в порядке стартового состава
}

export interface Officials {
  referee1?: string;
  referee2?: string;
  lineJudge1?: string;
  lineJudge2?: string;
  scorer?: string;
}

export interface Set {
  setNumber: number;
  scoreA: number;
  scoreB: number;
  completed: boolean;
}

export interface CurrentSet {
  setNumber: number;
  scoreA: number;
  scoreB: number;
  servingTeam: 'A' | 'B';
}

export interface Statistics {
  enabled: boolean;
  teamA: {
    attack: number;
    block: number;
    serve: number;
    opponentErrors: number;
  };
  teamB: {
    attack: number;
    block: number;
    serve: number;
    opponentErrors: number;
  };
}

export interface Match {
  matchId: string;
  tournament?: string; // Заголовок (название турнира)
  tournamentSubtitle?: string; // Подзаголовок (название турнира)
  location?: string; // Город, страна
  venue?: string; // Место проведения
  date?: string; // ISO date
  time?: string; // ISO time
  teamA: Team;
  teamB: Team;
  officials?: Officials;
  sets: Set[];
  currentSet: CurrentSet;
  statistics: Statistics;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

/**
 * Создает новый пустой матч
 */
export function createNewMatch(): Match {
  const now = new Date().toISOString();
  
  return {
    matchId: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : generateUUID(),
    tournament: '',
    tournamentSubtitle: '',
    location: '',
    venue: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    teamA: {
      name: 'Команда А',
      color: '#3498db',
      liberoColor: undefined,
      logo: undefined,
      coach: '',
      roster: [],
    },
    teamB: {
      name: 'Команда Б',
      color: '#e74c3c',
      liberoColor: undefined,
      logo: undefined,
      coach: '',
      roster: [],
    },
    officials: {
      referee1: '',
      referee2: '',
      lineJudge1: '',
      lineJudge2: '',
      scorer: '',
    },
    sets: [],
    currentSet: {
      setNumber: 1,
      scoreA: 0,
      scoreB: 0,
      servingTeam: 'A',
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
export function validateMatch(match: any): match is Match {
  if (!match || typeof match !== 'object') {
    return false;
  }

  if (!match.matchId || typeof match.matchId !== 'string') {
    return false;
  }

  if (!match.teamA || !match.teamB) {
    return false;
  }

  if (!match.teamA.name || !match.teamB.name) {
    return false;
  }

  if (!match.currentSet) {
    return false;
  }

  if (!Array.isArray(match.sets)) {
    return false;
  }

  if (!match.statistics) {
    return false;
  }

  return true;
}

/**
 * Простая генерация UUID (fallback для окружений без crypto.randomUUID)
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

