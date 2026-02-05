/**
 * Применяет набор токенов темы к document.documentElement в виде CSS-переменных.
 * Используется для светлой/тёмной темы.
 * @param {Object} themeObject - объект темы (light или dark) из tokens.js
 */
export function applyTheme(themeObject) {
  if (!themeObject || typeof themeObject !== 'object') {
    return;
  }
  const root = document.documentElement;
  for (const [key, value] of Object.entries(themeObject)) {
    const name = '--color-' + key.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
    root.style.setProperty(name, value);
  }
}
