/**
 * Утилиты для работы с полями vMix
 * Обеспечивают автоматическое добавление суффиксов к именам полей
 */

const FIELD_SUFFIXES = {
  text: '.Text',
  image: '.Source',
  fill: '.Fill.Color',
};

/**
 * Возвращает полное имя поля с суффиксом для указанного типа
 * @param {string} fieldIdentifier - базовое имя поля (без суффикса)
 * @param {string} type - тип поля ('text', 'image', 'fill')
 * @returns {string} - полное имя поля с суффиксом
 */
function getFullFieldName(fieldIdentifier, type) {
  if (!fieldIdentifier) {
    fieldIdentifier = '';
  }

  // Преобразуем в строку для обработки null/undefined
  fieldIdentifier = String(fieldIdentifier);

  // Проверяем, есть ли уже нужный суффикс
  const suffix = FIELD_SUFFIXES[type];
  if (!suffix) {
    throw new Error(`Неизвестный тип поля: ${type}`);
  }

  // Если суффикс уже есть, возвращаем как есть
  if (fieldIdentifier.endsWith(suffix)) {
    return fieldIdentifier;
  }

  // Добавляем суффикс
  return fieldIdentifier + suffix;
}

/**
 * Удаляет суффикс из имени поля
 * @param {string} fieldIdentifier - имя поля (может содержать суффикс)
 * @returns {string} - базовое имя поля без суффикса
 */
function removeFieldSuffix(fieldIdentifier) {
  if (!fieldIdentifier) {
    return '';
  }

  // Преобразуем в строку
  fieldIdentifier = String(fieldIdentifier);

  // Проверяем все возможные суффиксы
  const suffixes = Object.values(FIELD_SUFFIXES).sort((a, b) => b.length - a.length);

  for (const suffix of suffixes) {
    if (fieldIdentifier.endsWith(suffix)) {
      return fieldIdentifier.slice(0, -suffix.length);
    }
  }

  // Если суффикса нет, возвращаем исходное значение
  return fieldIdentifier;
}

/**
 * Проверяет, содержит ли имя поля суффикс для указанного типа
 * @param {string} fieldIdentifier - имя поля
 * @param {string} type - тип поля ('text', 'image', 'fill')
 * @returns {boolean} - true, если суффикс присутствует
 */
function hasFieldSuffix(fieldIdentifier, type) {
  if (!fieldIdentifier || !type) {
    return false;
  }

  const suffix = FIELD_SUFFIXES[type];
  if (!suffix) {
    return false;
  }

  return String(fieldIdentifier).endsWith(suffix);
}

// Экспорт для использования в CommonJS (Node.js/Electron main)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getFullFieldName,
    removeFieldSuffix,
    hasFieldSuffix,
    FIELD_SUFFIXES,
  };
}
