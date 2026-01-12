/**
 * Утилиты для работы с контрастностью цветов
 */

/**
 * Конвертирует hex цвет в RGB значения
 * @param {string} hex - цвет в формате #RRGGBB или #RGB
 * @returns {{r: number, g: number, b: number}} объект с RGB значениями (0-255)
 */
function hexToRgb(hex) {
  // Убираем # если есть
  hex = hex.replace('#', '');
  
  // Если короткий формат (#RGB), расширяем до (#RRGGBB)
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return { r, g, b };
}

/**
 * Конвертирует sRGB значение в линейное пространство для расчета яркости
 * @param {number} value - значение канала (0-255)
 * @returns {number} линейное значение (0-1)
 */
function sRGBToLinear(value) {
  const normalized = value / 255;
  if (normalized <= 0.03928) {
    return normalized / 12.92;
  }
  return Math.pow((normalized + 0.055) / 1.055, 2.4);
}

/**
 * Вычисляет относительную яркость цвета по формуле WCAG
 * @param {string} hex - цвет в формате #RRGGBB
 * @returns {number} относительная яркость (0-1, где 0 - черный, 1 - белый)
 */
export function getRelativeLuminance(hex) {
  if (!hex) return 0;
  
  const { r, g, b } = hexToRgb(hex);
  
  const rLinear = sRGBToLinear(r);
  const gLinear = sRGBToLinear(g);
  const bLinear = sRGBToLinear(b);
  
  // Формула относительной яркости из WCAG
  const luminance = 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  
  return luminance;
}

/**
 * Определяет, какой цвет текста (черный или белый) будет лучше виден на заданном фоне
 * @param {string} backgroundColor - цвет фона в формате #RRGGBB
 * @returns {string} '#000000' для черного текста или '#ffffff' для белого текста
 */
export function getContrastTextColor(backgroundColor) {
  if (!backgroundColor) {
    return '#ffffff'; // По умолчанию белый, если цвет не указан
  }
  
  const luminance = getRelativeLuminance(backgroundColor);
  
  // Порог 0.5 - если яркость больше 0.5, используем черный текст, иначе белый
  // Это обеспечивает хорошую читаемость для большинства случаев
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Упрощенная версия для быстрого определения (использует простую формулу яркости)
 * Может быть использована как альтернатива getContrastTextColor
 * @param {string} backgroundColor - цвет фона в формате #RRGGBB
 * @returns {string} '#000000' для черного текста или '#ffffff' для белого текста
 */
export function getContrastTextColorSimple(backgroundColor) {
  if (!backgroundColor) {
    return '#ffffff';
  }
  
  const { r, g, b } = hexToRgb(backgroundColor);
  
  // Простая формула яркости (brightness)
  // Используется в некоторых браузерах и CSS фильтрах
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // Порог 128 - если яркость больше 128, используем черный текст, иначе белый
  return brightness > 128 ? '#000000' : '#ffffff';
}
