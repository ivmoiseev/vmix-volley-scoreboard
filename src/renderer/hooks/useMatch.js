import { useState, useCallback, useEffect, useRef } from 'react';
import { isSetball, isMatchball, canFinishSet, getSetWinner } from '../../shared/volleyballRules';
import { SET_STATUS } from '../../shared/types/Match';
import { calculateDuration } from '../../shared/timeUtils';
import { validateSetUpdate } from '../../shared/setValidation';
import { migrateMatchToSetStatus } from '../../shared/matchMigration';
import { SetService } from '../../shared/services/SetService.ts';

/**
 * Хук для управления состоянием матча
 */
export function useMatch(initialMatch) {
  // Применяем миграцию при инициализации
  const migratedMatch = initialMatch && migrateMatchToSetStatus(initialMatch);
  const [match, setMatch] = useState(migratedMatch);
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
        // Применяем миграцию при обновлении
        const migratedMatch = migrateMatchToSetStatus(initialMatch);
        setMatch(migratedMatch);
        prevInitialMatchRef.current = migratedMatch;
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
    
    // Проверяем, что партия начата
    if (match.currentSet.status !== SET_STATUS.IN_PROGRESS) {
      return; // Не изменяем счет, если партия не начата
    }
    
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
   * Начинает текущую партию
   */
  const startSet = useCallback(() => {
    if (!match) return;
    
    setMatch(prevMatch => {
      if (!prevMatch) return prevMatch;
      
      const previousState = { ...prevMatch };
      
      // Используем Service Layer для начала партии
      // Service Layer правильно обрабатывает обнуление счета (обнуляет при начале)
      try {
        const resultMatch = SetService.startSet(prevMatch);
        
        addToHistory({
          type: 'set_start',
          previousState,
        });
        
        return resultMatch;
      } catch (error) {
        console.error('[useMatch.startSet] Ошибка при начале партии:', error);
        alert(error.message || 'Не удалось начать партию');
        return prevMatch;
      }
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
      
      // Используем Service Layer для завершения партии
      // Service Layer правильно обрабатывает обнуление счета (не обнуляет при завершении)
      try {
        const resultMatch = SetService.finishSet(prevMatch);
        
        addToHistory({
          type: 'set_finish',
          previousState,
        });
        
        return resultMatch;
      } catch (error) {
        console.error('[useMatch.finishSet] Ошибка при завершении партии:', error);
        alert(error.message || 'Не удалось завершить партию');
        return prevMatch;
      }
    });
  }, [addToHistory, match]);

  /**
   * Переключает статус партии (для toggle-кнопки)
   */
  const toggleSetStatus = useCallback(() => {
    if (!match) return;
    
    const currentStatus = match.currentSet.status || SET_STATUS.PENDING;
    
    if (currentStatus === SET_STATUS.PENDING) {
      startSet();
    } else if (currentStatus === SET_STATUS.IN_PROGRESS) {
      finishSet();
    }
  }, [match, startSet, finishSet]);

  /**
   * Обновляет данные партии (для модального окна редактирования)
   * @param {number} setNumber - Номер партии для обновления
   * @param {Object} updates - Обновления (scoreA, scoreB, status, startTime, endTime)
   */
  const updateSet = useCallback((setNumber, updates) => {
    if (!match) return false;
    
    setMatch(prevMatch => {
      if (!prevMatch) return prevMatch;
      
      const previousState = { ...prevMatch };
      const newMatch = { 
        ...prevMatch,
        currentSet: { ...prevMatch.currentSet }, // Создаем копию currentSet для иммутабельности
      };
      
      // Определяем, обновляем ли мы текущую партию или завершенную
      // КРИТИЧНО: Проверяем не только setNumber, но и статус.
      // Если currentSet имеет тот же setNumber, но статус PENDING, значит это следующая партия,
      // и мы обновляем завершенную партию, а не текущую.
      const isCurrentSet = setNumber === prevMatch.currentSet.setNumber && 
                           prevMatch.currentSet.status === SET_STATUS.IN_PROGRESS;
      
      if (isCurrentSet) {
        // Обновляем текущую партию
        const set = prevMatch.currentSet;
        const validation = validateSetUpdate(set, updates, setNumber, prevMatch);
        
        if (!validation.valid) {
          alert(validation.errors.join('\n'));
          return prevMatch;
        }
        
        // Применяем обновления
        const updatedSet = {
          ...prevMatch.currentSet,
          ...updates,
        };
        
        // Логика удаления времени в зависимости от статуса
        if (updates.status !== undefined) {
          if (updates.status === SET_STATUS.PENDING) {
            // При переходе в pending удаляем время начала и завершения
            updatedSet.startTime = null;
            updatedSet.endTime = null;
            updatedSet.duration = undefined;
            console.log('[useMatch.updateSet] Партия сброшена в PENDING:', {
              setNumber: updatedSet.setNumber,
              previousStatus: prevMatch.currentSet.status,
              newStatus: SET_STATUS.PENDING,
              startTime: updatedSet.startTime,
              endTime: updatedSet.endTime,
            });
          } else if (updates.status === SET_STATUS.IN_PROGRESS) {
            // При переходе в in_progress удаляем время завершения
            updatedSet.endTime = null;
            updatedSet.duration = undefined;
          }
        }
        
        // Если updates явно содержит null для времени, используем это значение
        if (updates.startTime === null) {
          updatedSet.startTime = null;
        }
        if (updates.endTime === null) {
          updatedSet.endTime = null;
        }
        
        // Пересчитываем duration, если изменилось время
        if (updates.startTime !== undefined || updates.endTime !== undefined) {
          const startTime = updatedSet.startTime;
          const endTime = updatedSet.endTime;
          if (startTime && endTime) {
            updatedSet.duration = calculateDuration(startTime, endTime);
          } else {
            updatedSet.duration = undefined;
          }
        }
        
        newMatch.currentSet = updatedSet;
      } else {
        // Обновляем завершенную партию
        const setIndex = prevMatch.sets.findIndex(s => s.setNumber === setNumber);
        if (setIndex === -1) {
          console.error(`Партия ${setNumber} не найдена`);
          return prevMatch;
        }
        
        const set = prevMatch.sets[setIndex];
        
        // Проверка: если пытаемся изменить статус завершенной партии на in_progress,
        // нужно убедиться, что следующая партия еще не началась
        if (updates.status === SET_STATUS.IN_PROGRESS && set.status === SET_STATUS.COMPLETED) {
          const nextSetNumber = setNumber + 1;
          // Проверяем, не началась ли следующая партия
          const nextSetStarted = prevMatch.sets.some(s => s.setNumber === nextSetNumber && s.status === SET_STATUS.IN_PROGRESS) ||
                                 (prevMatch.currentSet.setNumber === nextSetNumber && prevMatch.currentSet.status === SET_STATUS.IN_PROGRESS);
          
          if (nextSetStarted) {
            alert(`Нельзя вернуть партию ${setNumber} в статус "В игре", так как партия ${nextSetNumber} уже началась.`);
            return prevMatch;
          }
          
          // Если следующая партия не началась, возвращаем завершенную партию в игру
          // Партия становится текущей (currentSet), удаляется из sets
          const validation = validateSetUpdate(set, updates, setNumber, prevMatch);
          
          if (!validation.valid) {
            alert(validation.errors.join('\n'));
            return prevMatch;
          }
          
          // Применяем обновления
          const updatedSet = {
            ...set,
            ...updates,
            status: SET_STATUS.IN_PROGRESS,
            completed: false,
          };
          
          // Удаляем время завершения и длительность
          updatedSet.endTime = null;
          updatedSet.duration = undefined;
          
          // Если updates явно содержит null для времени, используем это значение
          if (updates.startTime === null) {
            updatedSet.startTime = null;
          }
          if (updates.endTime === null) {
            updatedSet.endTime = null;
          }
          
          // Пересчитываем duration, если изменилось время
          if (updates.startTime !== undefined || updates.endTime !== undefined) {
            const startTime = updatedSet.startTime;
            const endTime = updatedSet.endTime;
            if (startTime && endTime) {
              updatedSet.duration = calculateDuration(startTime, endTime);
            } else {
              updatedSet.duration = undefined;
            }
          }
          
          // Удаляем партию из sets и делаем её текущей
          const newSets = prevMatch.sets.filter(s => s.setNumber !== setNumber);
          newMatch.sets = newSets;
          newMatch.currentSet = updatedSet;
          
          console.log('[useMatch.updateSet] Возвращаем завершенную партию в игру:', {
            setNumber,
            updatedSet: {
              setNumber: updatedSet.setNumber,
              status: updatedSet.status,
              completed: updatedSet.completed,
              scoreA: updatedSet.scoreA,
              scoreB: updatedSet.scoreB,
            },
            previousCurrentSet: {
              setNumber: prevMatch.currentSet.setNumber,
              status: prevMatch.currentSet.status,
            },
            setsBefore: prevMatch.sets.map(s => ({ setNumber: s.setNumber, status: s.status })),
            setsAfter: newSets.map(s => ({ setNumber: s.setNumber, status: s.status })),
          });
          
          // Обновляем время изменения для триггера обновления vMix
          newMatch.updatedAt = new Date().toISOString();
          
          addToHistory({
            type: 'set_resume',
            setNumber,
            previousState,
          });
        } else {
          // Обычное обновление завершенной партии (без изменения статуса на in_progress)
          const validation = validateSetUpdate(set, updates, setNumber, prevMatch);
          
          if (!validation.valid) {
            alert(validation.errors.join('\n'));
            return prevMatch;
          }
          
          // Применяем обновления к завершенной партии
          // ВАЖНО: При обновлении завершенной партии обновляем только нужные поля
          // И убеждаемся, что счет - это числа, а не строки
          const updatedSet = {
            ...set,
            // Обновляем счет, если он указан (преобразуем в число, если нужно)
            scoreA: updates.scoreA !== undefined ? (typeof updates.scoreA === 'string' ? parseInt(updates.scoreA, 10) : updates.scoreA) : set.scoreA,
            scoreB: updates.scoreB !== undefined ? (typeof updates.scoreB === 'string' ? parseInt(updates.scoreB, 10) : updates.scoreB) : set.scoreB,
            // Обновляем статус, если он указан
            status: updates.status !== undefined ? updates.status : set.status,
            // Обновляем время, если оно указано
            startTime: updates.startTime !== undefined ? updates.startTime : set.startTime,
            endTime: updates.endTime !== undefined ? updates.endTime : set.endTime,
          };
          
          // Логика удаления времени в зависимости от статуса
          if (updates.status !== undefined) {
            if (updates.status === SET_STATUS.PENDING) {
              // При переходе в pending удаляем время начала и завершения
              updatedSet.startTime = null;
              updatedSet.endTime = null;
              updatedSet.duration = undefined;
              updatedSet.completed = false;
            } else if (updates.status === SET_STATUS.IN_PROGRESS) {
              // При переходе в in_progress удаляем время завершения
              updatedSet.endTime = null;
              updatedSet.duration = undefined;
              updatedSet.completed = false;
            } else if (updates.status === SET_STATUS.COMPLETED) {
              // При статусе completed устанавливаем completed = true
              updatedSet.completed = true;
            }
          } else {
            // Если статус не изменяется, сохраняем текущий completed
            updatedSet.completed = set.completed;
          }
          
          // Если updates явно содержит null для времени, используем это значение
          if (updates.startTime === null) {
            updatedSet.startTime = null;
          }
          if (updates.endTime === null) {
            updatedSet.endTime = null;
          }
          
          // Пересчитываем duration, если изменилось время
          if (updates.startTime !== undefined || updates.endTime !== undefined) {
            const startTime = updatedSet.startTime;
            const endTime = updatedSet.endTime;
            if (startTime && endTime) {
              updatedSet.duration = calculateDuration(startTime, endTime);
            } else {
              updatedSet.duration = undefined;
            }
          }
          
          // Обновляем массив партий
          console.log('[useMatch.updateSet] Перед обновлением sets:', {
            setIndex,
            setsLength: prevMatch.sets.length,
            setBefore: prevMatch.sets[setIndex] ? {
              setNumber: prevMatch.sets[setIndex].setNumber,
              scoreA: prevMatch.sets[setIndex].scoreA,
              scoreB: prevMatch.sets[setIndex].scoreB,
              status: prevMatch.sets[setIndex].status,
            } : 'не найден',
            updatedSet: {
              setNumber: updatedSet.setNumber,
              scoreA: updatedSet.scoreA,
              scoreB: updatedSet.scoreB,
              status: updatedSet.status,
            },
          });
          const newSets = [...prevMatch.sets];
          newSets[setIndex] = updatedSet;
          newMatch.sets = newSets;
          console.log('[useMatch.updateSet] После обновления sets:', {
            setsLength: newMatch.sets.length,
            setAfter: newMatch.sets[setIndex] ? {
              setNumber: newMatch.sets[setIndex].setNumber,
              scoreA: newMatch.sets[setIndex].scoreA,
              scoreB: newMatch.sets[setIndex].scoreB,
              status: newMatch.sets[setIndex].status,
            } : 'не найден',
          });
          
          // ВАЖНО: При обновлении завершенной партии НЕ изменяем currentSet,
          // если это не текущая партия. 
          // 
          // КРИТИЧНО: Проверяем не только setNumber, но и статус currentSet.
          // Если currentSet имеет тот же setNumber, но статус PENDING, значит это следующая партия,
          // и мы обновляем завершенную партию, а не текущую.
          const isActuallyCurrentSet = prevMatch.currentSet.setNumber === setNumber && 
                                       prevMatch.currentSet.status === SET_STATUS.IN_PROGRESS;
          
          if (!isActuallyCurrentSet) {
            // Это не текущая партия - currentSet не должен изменяться
            // 
            // ВАЖНО: Если следующая партия уже начата (IN_PROGRESS), НЕ трогаем её!
            // Мы обновляем только завершенную партию, а текущая партия должна продолжать идти.
            if (prevMatch.currentSet.status === SET_STATUS.IN_PROGRESS) {
              // Следующая партия уже идет - не трогаем её, просто создаем новый объект для иммутабельности
              newMatch.currentSet = { 
                ...prevMatch.currentSet,
              };
            } else if (prevMatch.currentSet.status !== SET_STATUS.PENDING) {
              // Если currentSet почему-то не в статусе PENDING и не IN_PROGRESS, исправляем это
              console.warn('[useMatch.updateSet] Исправляем статус currentSet с', prevMatch.currentSet.status, 'на PENDING');
              newMatch.currentSet = {
                ...prevMatch.currentSet,
                status: SET_STATUS.PENDING,
                // Убеждаемся, что счет не наследуется из обновленной партии
                scoreA: prevMatch.currentSet.scoreA,
                scoreB: prevMatch.currentSet.scoreB,
              };
            } else {
              // currentSet в статусе PENDING - просто создаем новый объект для иммутабельности
              // И что счет не наследуется из обновленной партии
              newMatch.currentSet = { 
                ...prevMatch.currentSet,
                // Явно сохраняем счет currentSet, чтобы он не изменился
                scoreA: prevMatch.currentSet.scoreA,
                scoreB: prevMatch.currentSet.scoreB,
              };
            }
          }
          
          console.log('[useMatch.updateSet] Обновление завершенной партии:', {
            setNumber,
            isActuallyCurrentSet,
            updatedSet: {
              setNumber: updatedSet.setNumber,
              status: updatedSet.status,
              completed: updatedSet.completed,
              scoreA: updatedSet.scoreA,
              scoreB: updatedSet.scoreB,
            },
            currentSetBefore: {
              setNumber: prevMatch.currentSet.setNumber,
              status: prevMatch.currentSet.status,
              scoreA: prevMatch.currentSet.scoreA,
              scoreB: prevMatch.currentSet.scoreB,
            },
            currentSetAfter: {
              setNumber: newMatch.currentSet.setNumber,
              status: newMatch.currentSet.status,
              scoreA: newMatch.currentSet.scoreA,
              scoreB: newMatch.currentSet.scoreB,
            },
            setsAfter: newMatch.sets.map(s => ({ 
              setNumber: s.setNumber, 
              status: s.status, 
              completed: s.completed,
              scoreA: s.scoreA, 
              scoreB: s.scoreB 
            })),
            setIndex,
            setsLength: newMatch.sets.length,
          });
        }
      }
      
      // Обновляем время изменения для триггера обновления vMix и пересчета компонентов
      newMatch.updatedAt = new Date().toISOString();
      
      addToHistory({
        type: 'set_update',
        setNumber,
        updates,
        previousState,
      });
      
      return newMatch;
    });
    
    return true;
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
  // Сетбол показывается только для партии, которая идет (IN_PROGRESS)
  const setballInfo = match?.currentSet && match.currentSet.status === SET_STATUS.IN_PROGRESS
    ? isSetball(match.currentSet.scoreA, match.currentSet.scoreB, match.currentSet.setNumber)
    : { isSetball: false, team: null };
  // Матчбол показывается только для партии, которая идет (IN_PROGRESS)
  // Если партия еще не начата (PENDING), матчбол не показывается
  const matchballInfo = match?.currentSet && match?.sets && match.currentSet.status === SET_STATUS.IN_PROGRESS
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
    startSet, // Добавить
    toggleSetStatus, // Добавить
    updateSet, // Добавить
    changeStatistics,
    toggleStatistics,
    undoLastAction,
    isSetballNow: setballInfo.isSetball,
    setballTeam: setballInfo.team,
    isMatchballNow: matchballInfo.isMatchball,
    matchballTeam: matchballInfo.team,
    canFinish,
    hasHistory: actionHistory.length > 0,
    currentSetStatus: match?.currentSet?.status || SET_STATUS.PENDING, // Добавить для удобства
  };
}

