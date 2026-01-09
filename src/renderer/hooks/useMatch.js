import { useState, useCallback, useEffect, useRef } from 'react';
import { isSetball, isMatchball, canFinishSet, getSetWinner } from '../../shared/volleyballRules';

/**
 * Хук для управления состоянием матча
 */
export function useMatch(initialMatch) {
  const [match, setMatch] = useState(initialMatch);
  const [actionHistory, setActionHistory] = useState([]);
  const prevInitialMatchRef = useRef(initialMatch);
  const lastStatsUpdateRef = useRef({ team: null, category: null, timestamp: 0 });

  // Обновляем match при изменении initialMatch (например, при синхронизации с мобильного)
  useEffect(() => {
    if (initialMatch) {
      const prevMatch = prevInitialMatchRef.current;
      // Обновляем только если изменился matchId или updatedAt
      if (!prevMatch || prevMatch.matchId !== initialMatch.matchId || 
          prevMatch.updatedAt !== initialMatch.updatedAt) {
        setMatch(initialMatch);
        prevInitialMatchRef.current = initialMatch;
      }
    }
  }, [initialMatch]);

  /**
   * Добавляет действие в историю для возможности отмены
   */
  const addToHistory = useCallback((action) => {
    setActionHistory(prev => [...prev, action]);
  }, []);

  /**
   * Отменяет последнее действие
   */
  const undoLastAction = useCallback(() => {
    if (actionHistory.length === 0) {
      return false;
    }

    const lastAction = actionHistory[actionHistory.length - 1];
    setMatch(lastAction.previousState);
    setActionHistory(prev => prev.slice(0, -1));
    return true;
  }, [actionHistory]);

  /**
   * Изменяет счет команды
   */
  const changeScore = useCallback((team, delta) => {
    if (!match) return;
    
    setMatch(prevMatch => {
      if (!prevMatch) return prevMatch;
      
      const previousState = { ...prevMatch };
      const newMatch = { ...prevMatch };
      
      if (team === 'A') {
        const newScore = Math.max(0, newMatch.currentSet.scoreA + delta);
        newMatch.currentSet = {
          ...newMatch.currentSet,
          scoreA: newScore,
        };
        
        // Автоматический переход подачи при начислении очка
        if (delta > 0) {
          newMatch.currentSet.servingTeam = 'A';
        }
      } else {
        const newScore = Math.max(0, newMatch.currentSet.scoreB + delta);
        newMatch.currentSet = {
          ...newMatch.currentSet,
          scoreB: newScore,
        };
        
        // Автоматический переход подачи при начислении очка
        if (delta > 0) {
          newMatch.currentSet.servingTeam = 'B';
        }
      }
      
      newMatch.updatedAt = new Date().toISOString();
      
      // Сохраняем в историю
      addToHistory({
        type: 'score_change',
        team,
        delta,
        previousState,
      });
      
      return newMatch;
    });
  }, [addToHistory, match]);

  /**
   * Ручная коррекция подачи
   * @param {string} team - Команда, которой передается подача ('A' или 'B')
   */
  const changeServingTeam = useCallback((team) => {
    if (!match) return;
    
    // Проверяем, что передана корректная команда
    if (team !== 'A' && team !== 'B') {
      console.warn('changeServingTeam: некорректная команда', team);
      return;
    }
    
    setMatch(prevMatch => {
      if (!prevMatch) return prevMatch;
      
      // Если подача уже у этой команды, ничего не делаем
      if (prevMatch.currentSet.servingTeam === team) {
        return prevMatch;
      }
      
      const previousState = { ...prevMatch };
      const newMatch = { ...prevMatch };
      
      // Передаем подачу указанной команде
      newMatch.currentSet.servingTeam = team;
      
      newMatch.updatedAt = new Date().toISOString();
      
      addToHistory({
        type: 'serve_change',
        team,
        previousTeam: previousState.currentSet.servingTeam,
        previousState,
      });
      
      return newMatch;
    });
  }, [addToHistory, match]);

  /**
   * Завершает текущую партию
   */
  const finishSet = useCallback(() => {
    if (!match) return;
    
    setMatch(prevMatch => {
      if (!prevMatch) return prevMatch;
      
      const previousState = { ...prevMatch };
      const newMatch = { ...prevMatch };
      
      const { scoreA, scoreB, setNumber } = newMatch.currentSet;
      
      // Проверяем, можно ли завершить партию
      if (!canFinishSet(scoreA, scoreB, setNumber)) {
        const threshold = setNumber === 5 ? 15 : 25;
        alert(`Партия не может быть завершена. Необходимо набрать ${threshold} очков с разницей минимум 2 очка.`);
        return prevMatch;
      }
      
      // Сохраняем завершенную партию
      const completedSet = {
        setNumber: newMatch.currentSet.setNumber,
        scoreA,
        scoreB,
        completed: true,
      };
      
      newMatch.sets = [...newMatch.sets, completedSet];
      
      // Переходим к следующей партии
      const nextSetNumber = newMatch.currentSet.setNumber + 1;
      
      // Определяем, кто будет подавать в следующей партии (победитель предыдущей)
      const winner = getSetWinner(scoreA, scoreB);
      
      newMatch.currentSet = {
        setNumber: nextSetNumber,
        scoreA: 0,
        scoreB: 0,
        servingTeam: winner,
      };
      
      newMatch.updatedAt = new Date().toISOString();
      
      addToHistory({
        type: 'set_finish',
        previousState,
      });
      
      return newMatch;
    });
  }, [addToHistory, match]);

  /**
   * Изменяет статистику
   */
  const changeStatistics = useCallback((team, category, delta, event) => {
    // Предотвращаем множественные вызовы
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Защита от множественных вызовов в течение 100мс
    const now = Date.now();
    const lastUpdate = lastStatsUpdateRef.current;
    if (lastUpdate.team === team && lastUpdate.category === category && 
        (now - lastUpdate.timestamp) < 100) {
      return; // Игнорируем повторный вызов
    }
    
    lastStatsUpdateRef.current = { team, category, timestamp: now };
    
    setMatch(prevMatch => {
      if (!prevMatch) return prevMatch;
      
      // Глубокое копирование для избежания мутаций
      const newMatch = {
        ...prevMatch,
        statistics: {
          ...prevMatch.statistics,
          [team === 'A' ? 'teamA' : 'teamB']: {
            ...prevMatch.statistics[team === 'A' ? 'teamA' : 'teamB'],
            [category]: Math.max(0, (prevMatch.statistics[team === 'A' ? 'teamA' : 'teamB'][category] || 0) + delta),
          },
        },
        updatedAt: new Date().toISOString(),
      };
      
      return newMatch;
    });
  }, []);

  /**
   * Переключает расширенную статистику
   */
  const toggleStatistics = useCallback((enabled) => {
    setMatch(prevMatch => {
      if (!prevMatch) return prevMatch;
      
      return {
        ...prevMatch,
        statistics: {
          ...prevMatch.statistics,
          enabled,
        },
        updatedAt: new Date().toISOString(),
      };
    });
  }, []); // Убрали match из зависимостей, используем функциональное обновление

  // Вычисляемые значения (с проверкой на null)
  const setballInfo = match?.currentSet 
    ? isSetball(match.currentSet.scoreA, match.currentSet.scoreB, match.currentSet.setNumber)
    : { isSetball: false, team: null };
  const matchballInfo = match?.currentSet && match?.sets
    ? isMatchball(
        match.sets,
        match.currentSet.setNumber,
        match.currentSet.scoreA,
        match.currentSet.scoreB
      )
    : { isMatchball: false, team: null };
  const canFinish = match?.currentSet
    ? canFinishSet(match.currentSet.scoreA, match.currentSet.scoreB, match.currentSet.setNumber)
    : false;

  return {
    match,
    setMatch,
    changeScore,
    changeServingTeam,
    finishSet,
    changeStatistics,
    toggleStatistics,
    undoLastAction,
    isSetballNow: setballInfo.isSetball,
    setballTeam: setballInfo.team,
    isMatchballNow: matchballInfo.isMatchball,
    matchballTeam: matchballInfo.team,
    canFinish,
    hasHistory: actionHistory.length > 0,
  };
}

