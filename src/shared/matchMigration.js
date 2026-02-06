// Константы состояний партий (дублируем для использования в CommonJS)
// Эти значения должны совпадать с SET_STATUS в types/Match.ts
const SET_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
};

/**
 * Мигрирует старые данные матча к новой структуре с состояниями партий
 * @param {Object} match - Матч для миграции
 * @returns {Object} Мигрированный матч
 */
function migrateMatchToSetStatus(match) {
  if (!match) {
    return match;
  }
  
  const migrated = { ...match };

  // Добавляем variant для старых матчей (если отсутствует)
  if (!migrated.variant || !['indoor', 'beach', 'snow'].includes(migrated.variant)) {
    migrated.variant = 'indoor';
  }

  // Миграция завершенных партий
  if (Array.isArray(match.sets)) {
    migrated.sets = match.sets.map(set => {
      const migratedSet = { ...set };
      
      // Если партия завершена, но нет статуса
      if (set.completed && !set.status) {
        migratedSet.status = SET_STATUS.COMPLETED;
      }
      
      // Если партия не завершена и нет статуса
      if (!set.completed && !set.status) {
        migratedSet.status = SET_STATUS.PENDING;
      }
      
      // Вычисляем duration, если есть время
      if (migratedSet.startTime && migratedSet.endTime) {
        const duration = Math.round((migratedSet.endTime - migratedSet.startTime) / 60000);
        migratedSet.duration = duration;
      }
      
      return migratedSet;
    });
  }
  
  // Миграция текущей партии
  if (match.currentSet) {
    const currentSet = { ...match.currentSet };
    
    // Если статус не установлен
    if (!currentSet.status) {
      // Если счет > 0, считаем партию начатой
      if (currentSet.scoreA > 0 || currentSet.scoreB > 0) {
        currentSet.status = SET_STATUS.IN_PROGRESS;
        
        // Если нет startTime, используем updatedAt как приблизительное время начала
        if (!currentSet.startTime && match.updatedAt) {
          try {
            currentSet.startTime = new Date(match.updatedAt).getTime();
          } catch (e) {
            console.warn('Ошибка при установке startTime из updatedAt:', e);
          }
        }
      } else {
        currentSet.status = SET_STATUS.PENDING;
      }
    }
    
    migrated.currentSet = currentSet;
  }
  
  return migrated;
}

/**
 * Проверяет, нужна ли миграция матча
 * @param {Object} match - Матч для проверки
 * @returns {boolean} true, если миграция необходима
 */
function needsMigration(match) {
  if (!match) return false;
  
  // Проверяем завершенные партии
  if (Array.isArray(match.sets)) {
    const hasUnmigratedSet = match.sets.some(set => 
      set.completed !== undefined && set.status === undefined
    );
    if (hasUnmigratedSet) return true;
  }
  
  // Проверяем текущую партию
  if (match.currentSet && match.currentSet.status === undefined) {
    return true;
  }
  
  return false;
}

// Экспорт для использования в ES-модулях
export { migrateMatchToSetStatus, needsMigration, SET_STATUS };
