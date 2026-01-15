/**
 * Утилиты для работы со временем партий
 */

/**
 * Вычисляет продолжительность партии в минутах
 * @param {number} startTime - Timestamp начала (milliseconds)
 * @param {number} endTime - Timestamp завершения (milliseconds)
 * @returns {number|null} Продолжительность в минутах (округленная) или null
 */
export function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) {
    return null;
  }
  
  if (endTime < startTime) {
    console.warn('calculateDuration: endTime раньше startTime');
    return null;
  }
  
  // Конвертируем миллисекунды в минуты и округляем
  return Math.round((endTime - startTime) / 60000);
}

/**
 * Форматирует продолжительность для отображения
 * @param {number|null|undefined} minutes - Продолжительность в минутах
 * @returns {string} Форматированная строка (например, "45'") или пустая строка
 */
export function formatDuration(minutes) {
  if (minutes === null || minutes === undefined || isNaN(minutes)) {
    return '';
  }
  return `${minutes}'`;
}

/**
 * Конвертирует Date или строку в timestamp (milliseconds)
 * @param {Date|string|number} date - Дата для конвертации
 * @returns {number} Timestamp в миллисекундах
 */
export function toTimestamp(date) {
  if (typeof date === 'number') {
    return date; // Уже timestamp
  }
  
  if (typeof date === 'string') {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      throw new Error(`Некорректная дата: ${date}`);
    }
    return parsed.getTime();
  }
  
  if (date instanceof Date) {
    return date.getTime();
  }
  
  throw new Error('Неподдерживаемый тип данных для конвертации в timestamp');
}

/**
 * Форматирует timestamp в читаемую дату/время
 * @param {number} timestamp - Timestamp в миллисекундах
 * @param {string} timezone - Часовой пояс (IANA timezone, например "Europe/Moscow"). Если не указан, используется системный часовой пояс
 * @returns {string} Форматированная строка даты/времени
 */
export function formatTimestamp(timestamp, timezone = undefined) {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  };
  
  // Если указан часовой пояс, используем его
  if (timezone) {
    options.timeZone = timezone;
  }
  
  return date.toLocaleString('ru-RU', options);
}
