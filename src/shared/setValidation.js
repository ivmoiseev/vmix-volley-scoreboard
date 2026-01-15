import { canFinishSet } from './volleyballRules';
import { SET_STATUS } from './types/Match';

/**
 * Валидирует изменения партии
 * @param {Object} set - Текущие данные партии (Set или CurrentSet)
 * @param {Object} updates - Предлагаемые изменения
 * @param {number} currentSetNumber - Номер текущей партии
 * @param {Object} match - Полный объект матча для проверки пересечений времени (опционально)
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateSetUpdate(set, updates, currentSetNumber, match = null) {
  const errors = [];
  
  // Получаем финальные значения (обновленные или текущие)
  const finalScoreA = updates.scoreA !== undefined ? updates.scoreA : set.scoreA;
  const finalScoreB = updates.scoreB !== undefined ? updates.scoreB : set.scoreB;
  const finalStatus = updates.status !== undefined ? updates.status : set.status;
  const finalStartTime = updates.startTime !== undefined ? updates.startTime : set.startTime;
  const finalEndTime = updates.endTime !== undefined ? updates.endTime : set.endTime;
  
  // Проверка 1: Время завершения не может быть раньше времени начала
  if (finalStartTime && finalEndTime) {
    if (finalEndTime < finalStartTime) {
      errors.push('Время завершения не может быть раньше времени начала');
    }
  }
  
  // Проверка 2: Счет для завершенных партий должен соответствовать правилам
  if (finalStatus === SET_STATUS.COMPLETED || 
      (set.status === SET_STATUS.COMPLETED && finalStatus !== SET_STATUS.PENDING)) {
    if (!canFinishSet(finalScoreA, finalScoreB, set.setNumber)) {
      const threshold = set.setNumber === 5 ? 15 : 25;
      errors.push(
        `Счет не соответствует правилам завершения партии. ` +
        `Необходимо набрать ${threshold} очков с разницей минимум 2 очка.`
      );
    }
  }
  
  // Проверка 3: Завершенная партия должна иметь время начала и завершения
  if (finalStatus === SET_STATUS.COMPLETED) {
    if (!finalStartTime || !finalEndTime) {
      errors.push('Завершенная партия должна иметь время начала и завершения');
    }
  }
  
  // Проверка 4: Нельзя перейти из completed в in_progress без корректировки времени
  if (set.status === SET_STATUS.COMPLETED && finalStatus === SET_STATUS.IN_PROGRESS) {
    if (finalEndTime !== undefined && finalEndTime !== null) {
      errors.push('Нельзя перевести завершенную партию в статус "В игре" без удаления времени завершения');
    }
  }
  
  // Проверка 5: Счет не может быть отрицательным
  if (finalScoreA < 0 || finalScoreB < 0) {
    errors.push('Счет не может быть отрицательным');
  }
  
  // Проверка 6: Пересечение времени с другими партиями (только для завершенных партий)
  if (finalStatus === SET_STATUS.COMPLETED && finalStartTime && finalEndTime && match) {
    const setNumber = set.setNumber;
    
    // Проверяем пересечение с предыдущей партией
    const previousSet = match.sets.find(s => s.setNumber === setNumber - 1);
    if (previousSet && previousSet.startTime && previousSet.endTime) {
      // Проверяем, что текущая партия не начинается раньше окончания предыдущей
      if (finalStartTime < previousSet.endTime) {
        errors.push(`Время начала партии ${setNumber} пересекается с временем окончания партии ${setNumber - 1}`);
      }
    }
    
    // Проверяем пересечение со следующей партией
    const nextSetNumber = setNumber + 1;
    const nextSet = match.sets.find(s => s.setNumber === nextSetNumber);
    if (nextSet && nextSet.startTime && nextSet.endTime) {
      // Проверяем, что текущая партия не заканчивается позже начала следующей
      if (finalEndTime > nextSet.startTime) {
        errors.push(`Время окончания партии ${setNumber} пересекается с временем начала партии ${nextSetNumber}`);
      }
    }
    
    // Проверяем пересечение с текущей партией (если она не является редактируемой)
    if (match.currentSet && match.currentSet.setNumber === nextSetNumber && match.currentSet.startTime) {
      if (finalEndTime > match.currentSet.startTime) {
        errors.push(`Время окончания партии ${setNumber} пересекается с временем начала партии ${nextSetNumber}`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
