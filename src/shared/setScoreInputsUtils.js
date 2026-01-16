/**
 * Утилиты для работы с инпутами "Счет после X партии"
 */

/**
 * Вычисляет продолжительность партии в минутах
 * @param {number} startTime - timestamp начала партии в миллисекундах
 * @param {number} endTime - timestamp завершения партии в миллисекундах
 * @returns {number} продолжительность в минутах (округление вниз)
 */
function calculateSetDuration(startTime, endTime) {
  if (!startTime || !endTime) {
    return 0;
  }
  const durationMs = endTime - startTime;
  const durationMinutes = Math.floor(durationMs / (60 * 1000));
  return durationMinutes;
}

/**
 * Получает завершенные партии до указанного номера включительно
 * @param {Array} sets - массив всех партий
 * @param {number} maxSetNumber - максимальный номер партии (включительно)
 * @returns {Array} массив завершенных партий
 */
function getCompletedSetsUpTo(sets, maxSetNumber) {
  if (!sets || !Array.isArray(sets)) {
    return [];
  }
  return sets
    .filter(
      (set) =>
        set.setNumber <= maxSetNumber &&
        (set.status === 'completed' || set.completed === true)
    )
    .sort((a, b) => a.setNumber - b.setNumber);
}

/**
 * Вычисляет счет по сетам для команды
 * @param {Array} sets - массив завершенных партий
 * @param {string} team - 'A' или 'B'
 * @returns {number} количество выигранных партий
 */
function calculateSetsScore(sets, team) {
  if (!sets || !Array.isArray(sets)) {
    return 0;
  }
  return sets.filter((set) => {
    return team === 'A' ? set.scoreA > set.scoreB : set.scoreB > set.scoreA;
  }).length;
}

/**
 * Формирует данные для инпута "Счет после X партии"
 * @param {Object} match - данные матча
 * @param {number} setNumber - номер инпута (1-5)
 * @returns {Object} объект с полями для отправки в vMix
 */
function formatSetScoreInputData(match, setNumber) {
  if (!match) {
    return { fields: {} };
  }

  const fields = {};

  // Общие поля
  fields['TeamA'] = match.teamA?.name || '';
  fields['TeamB'] = match.teamB?.name || '';

  // Получаем завершенные партии до указанного номера
  const completedSets = getCompletedSetsUpTo(match.sets || [], setNumber);

  // Вычисляем счет по сетам
  const scoreASets = calculateSetsScore(completedSets, 'A');
  const scoreBSets = calculateSetsScore(completedSets, 'B');
  fields['ScoreASets'] = String(scoreASets);
  fields['ScoreBSets'] = String(scoreBSets);

  // Поля для каждой завершенной партии
  completedSets.forEach((set) => {
    const duration = calculateSetDuration(set.startTime, set.endTime);
    const setNum = set.setNumber;

    // Используем пустую строку для duration, если время отсутствует
    fields[`Set${setNum}Duration`] = duration > 0 ? String(duration) : '';
    fields[`Set${setNum}ScoreA`] = String(set.scoreA || 0);
    fields[`Set${setNum}ScoreB`] = String(set.scoreB || 0);
  });

  // Для партий, которые еще не завершены (до setNumber), отправляем пустые строки
  for (let i = 1; i <= setNumber; i++) {
    const setExists = completedSets.some(set => set.setNumber === i);
    if (!setExists) {
      // Отправляем пустые строки для несуществующих партий
      fields[`Set${i}Duration`] = '';
      fields[`Set${i}ScoreA`] = '';
      fields[`Set${i}ScoreB`] = '';
    }
  }

  return { fields };
}

export {
  calculateSetDuration,
  getCompletedSetsUpTo,
  calculateSetsScore,
  formatSetScoreInputData,
};
