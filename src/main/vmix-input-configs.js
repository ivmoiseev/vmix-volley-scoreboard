/**
 * Конфигурации полей по умолчанию для каждого инпута vMix
 */

/**
 * Генерирует конфигурацию полей для инпута "Счет после X партии"
 * @param {number} setNumber - номер инпута (1-5)
 * @returns {Object} объект с полями конфигурации
 */
function generateSetScoreFields(setNumber) {
  const fields = {
    teamA: { enabled: true, type: 'text', fieldName: 'Команда А', fieldIdentifier: 'TeamA' },
    teamB: { enabled: true, type: 'text', fieldName: 'Команда Б', fieldIdentifier: 'TeamB' },
    scoreASets: { enabled: true, type: 'text', fieldName: 'Счет по сетам А', fieldIdentifier: 'ScoreASets' },
    scoreBSets: { enabled: true, type: 'text', fieldName: 'Счет по сетам Б', fieldIdentifier: 'ScoreBSets' },
  };

  // Добавляем поля для каждой партии от 1 до setNumber
  for (let i = 1; i <= setNumber; i++) {
    fields[`set${i}Duration`] = {
      enabled: true,
      type: 'text',
      fieldName: `Время партии ${i}`,
      fieldIdentifier: `Set${i}Duration`,
    };
    fields[`set${i}ScoreA`] = {
      enabled: true,
      type: 'text',
      fieldName: `Команда А партия ${i}`,
      fieldIdentifier: `Set${i}ScoreA`,
    };
    fields[`set${i}ScoreB`] = {
      enabled: true,
      type: 'text',
      fieldName: `Команда Б партия ${i}`,
      fieldIdentifier: `Set${i}ScoreB`,
    };
  }

  return fields;
}

/**
 * Получает конфигурацию полей по умолчанию для указанного инпута
 * @param {string} inputKey - ключ инпута (например, 'currentScore', 'roster', 'lineup')
 * @returns {Object|null} - объект с полями или null, если инпут не найден
 */
function getDefaultFieldsForInput(inputKey) {
  const configs = {
    currentScore: {
      teamA: { enabled: true, type: 'text', fieldName: 'Команда А', fieldIdentifier: 'TeamA' },
      teamB: { enabled: true, type: 'text', fieldName: 'Команда Б', fieldIdentifier: 'TeamB' },
      scoreASet: { enabled: true, type: 'text', fieldName: 'Счет команды А (в сете)', fieldIdentifier: 'ScoreASet' },
      scoreBSet: { enabled: true, type: 'text', fieldName: 'Счет команды Б (в сете)', fieldIdentifier: 'ScoreBSet' },
      scoreASets: { enabled: true, type: 'text', fieldName: 'Счет по сетам А', fieldIdentifier: 'ScoreASets' },
      scoreBSets: { enabled: true, type: 'text', fieldName: 'Счет по сетам Б', fieldIdentifier: 'ScoreBSets' },
      pointA: { enabled: true, type: 'text', fieldName: 'Поинт А', fieldIdentifier: 'PointA', visible: true },
      pointB: { enabled: true, type: 'text', fieldName: 'Поинт Б', fieldIdentifier: 'PointB', visible: true },
      colorA: { enabled: true, type: 'fill', fieldName: 'Цвет А', fieldIdentifier: 'ColorA' },
      colorB: { enabled: true, type: 'fill', fieldName: 'Цвет Б', fieldIdentifier: 'ColorB' },
    },

    rosterTeamA: {
      title: { enabled: true, type: 'text', fieldName: 'Заголовок (название турнира)', fieldIdentifier: 'Title' },
      subtitle: { enabled: true, type: 'text', fieldName: 'Подзаголовок (название турнира)', fieldIdentifier: 'Subtitle' },
      teamName: { enabled: true, type: 'text', fieldName: 'Название команды', fieldIdentifier: 'TeamName' },
      teamCity: { enabled: true, type: 'text', fieldName: 'Город команды', fieldIdentifier: 'TeamCity' },
      teamLogo: { enabled: true, type: 'image', fieldName: 'Логотип команды (URL)', fieldIdentifier: 'TeamLogo' },
      player1Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 1', fieldIdentifier: 'Player1Number' },
      player1Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 1', fieldIdentifier: 'Player1Name' },
      player2Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 2', fieldIdentifier: 'Player2Number' },
      player2Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 2', fieldIdentifier: 'Player2Name' },
      player3Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 3', fieldIdentifier: 'Player3Number' },
      player3Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 3', fieldIdentifier: 'Player3Name' },
      player4Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 4', fieldIdentifier: 'Player4Number' },
      player4Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 4', fieldIdentifier: 'Player4Name' },
      player5Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 5', fieldIdentifier: 'Player5Number' },
      player5Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 5', fieldIdentifier: 'Player5Name' },
      player6Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 6', fieldIdentifier: 'Player6Number' },
      player6Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 6', fieldIdentifier: 'Player6Name' },
      player7Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 7', fieldIdentifier: 'Player7Number' },
      player7Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 7', fieldIdentifier: 'Player7Name' },
      player8Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 8', fieldIdentifier: 'Player8Number' },
      player8Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 8', fieldIdentifier: 'Player8Name' },
      player9Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 9', fieldIdentifier: 'Player9Number' },
      player9Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 9', fieldIdentifier: 'Player9Name' },
      player10Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 10', fieldIdentifier: 'Player10Number' },
      player10Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 10', fieldIdentifier: 'Player10Name' },
      player11Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 11', fieldIdentifier: 'Player11Number' },
      player11Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 11', fieldIdentifier: 'Player11Name' },
      player12Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 12', fieldIdentifier: 'Player12Number' },
      player12Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 12', fieldIdentifier: 'Player12Name' },
      player13Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 13', fieldIdentifier: 'Player13Number' },
      player13Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 13', fieldIdentifier: 'Player13Name' },
      player14Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 14', fieldIdentifier: 'Player14Number' },
      player14Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 14', fieldIdentifier: 'Player14Name' },
    },
    rosterTeamB: {
      title: { enabled: true, type: 'text', fieldName: 'Заголовок (название турнира)', fieldIdentifier: 'Title' },
      subtitle: { enabled: true, type: 'text', fieldName: 'Подзаголовок (название турнира)', fieldIdentifier: 'Subtitle' },
      teamName: { enabled: true, type: 'text', fieldName: 'Название команды', fieldIdentifier: 'TeamName' },
      teamCity: { enabled: true, type: 'text', fieldName: 'Город команды', fieldIdentifier: 'TeamCity' },
      teamLogo: { enabled: true, type: 'image', fieldName: 'Логотип команды (URL)', fieldIdentifier: 'TeamLogo' },
      player1Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 1', fieldIdentifier: 'Player1Number' },
      player1Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 1', fieldIdentifier: 'Player1Name' },
      player2Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 2', fieldIdentifier: 'Player2Number' },
      player2Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 2', fieldIdentifier: 'Player2Name' },
      player3Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 3', fieldIdentifier: 'Player3Number' },
      player3Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 3', fieldIdentifier: 'Player3Name' },
      player4Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 4', fieldIdentifier: 'Player4Number' },
      player4Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 4', fieldIdentifier: 'Player4Name' },
      player5Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 5', fieldIdentifier: 'Player5Number' },
      player5Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 5', fieldIdentifier: 'Player5Name' },
      player6Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 6', fieldIdentifier: 'Player6Number' },
      player6Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 6', fieldIdentifier: 'Player6Name' },
      player7Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 7', fieldIdentifier: 'Player7Number' },
      player7Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 7', fieldIdentifier: 'Player7Name' },
      player8Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 8', fieldIdentifier: 'Player8Number' },
      player8Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 8', fieldIdentifier: 'Player8Name' },
      player9Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 9', fieldIdentifier: 'Player9Number' },
      player9Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 9', fieldIdentifier: 'Player9Name' },
      player10Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 10', fieldIdentifier: 'Player10Number' },
      player10Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 10', fieldIdentifier: 'Player10Name' },
      player11Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 11', fieldIdentifier: 'Player11Number' },
      player11Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 11', fieldIdentifier: 'Player11Name' },
      player12Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 12', fieldIdentifier: 'Player12Number' },
      player12Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 12', fieldIdentifier: 'Player12Name' },
      player13Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 13', fieldIdentifier: 'Player13Number' },
      player13Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 13', fieldIdentifier: 'Player13Name' },
      player14Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 14', fieldIdentifier: 'Player14Number' },
      player14Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 14', fieldIdentifier: 'Player14Name' },
    },
    startingLineupTeamA: {
      title: { enabled: true, type: 'text', fieldName: 'Заголовок (название турнира)', fieldIdentifier: 'Title' },
      subtitle: { enabled: true, type: 'text', fieldName: 'Подзаголовок (название турнира)', fieldIdentifier: 'Subtitle' },
      teamName: { enabled: true, type: 'text', fieldName: 'Название команды', fieldIdentifier: 'TeamName' },
      teamCity: { enabled: true, type: 'text', fieldName: 'Город команды', fieldIdentifier: 'TeamCity' },
      teamLogo: { enabled: true, type: 'image', fieldName: 'Логотип команды (URL)', fieldIdentifier: 'TeamLogo' },
      player1Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 1', fieldIdentifier: 'Player1Number' },
      player1Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 1', fieldIdentifier: 'Player1Name' },
      player1NumberOnCard: { enabled: true, type: 'text', fieldName: 'Номер игрока 1 на карте', fieldIdentifier: 'Player1NumberOnCard' },
      player2Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 2', fieldIdentifier: 'Player2Number' },
      player2Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 2', fieldIdentifier: 'Player2Name' },
      player2NumberOnCard: { enabled: true, type: 'text', fieldName: 'Номер игрока 2 на карте', fieldIdentifier: 'Player2NumberOnCard' },
      player3Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 3', fieldIdentifier: 'Player3Number' },
      player3Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 3', fieldIdentifier: 'Player3Name' },
      player3NumberOnCard: { enabled: true, type: 'text', fieldName: 'Номер игрока 3 на карте', fieldIdentifier: 'Player3NumberOnCard' },
      player4Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 4', fieldIdentifier: 'Player4Number' },
      player4Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 4', fieldIdentifier: 'Player4Name' },
      player4NumberOnCard: { enabled: true, type: 'text', fieldName: 'Номер игрока 4 на карте', fieldIdentifier: 'Player4NumberOnCard' },
      player5Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 5', fieldIdentifier: 'Player5Number' },
      player5Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 5', fieldIdentifier: 'Player5Name' },
      player5NumberOnCard: { enabled: true, type: 'text', fieldName: 'Номер игрока 5 на карте', fieldIdentifier: 'Player5NumberOnCard' },
      player6Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 6', fieldIdentifier: 'Player6Number' },
      player6Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 6', fieldIdentifier: 'Player6Name' },
      player6NumberOnCard: { enabled: true, type: 'text', fieldName: 'Номер игрока 6 на карте', fieldIdentifier: 'Player6NumberOnCard' },
      libero1Number: { enabled: true, type: 'text', fieldName: 'Номер либеро 1', fieldIdentifier: 'Libero1Number' },
      libero1Name: { enabled: true, type: 'text', fieldName: 'Имя либеро 1', fieldIdentifier: 'Libero1Name' },
      libero1NumberOnCard: { enabled: true, type: 'text', fieldName: 'Номер либеро 1 на карте', fieldIdentifier: 'Libero1NumberOnCard' },
      libero1Background: { enabled: true, type: 'fill', fieldName: 'Подложка либеро 1', fieldIdentifier: 'Libero1Background' },
      libero1BackgroundOnCard: { enabled: true, type: 'fill', fieldName: 'Подложка либеро 1 на карте', fieldIdentifier: 'Libero1BackgroundOnCard' },
      libero2Number: { enabled: true, type: 'text', fieldName: 'Номер либеро 2', fieldIdentifier: 'Libero2Number' },
      libero2Name: { enabled: true, type: 'text', fieldName: 'Имя либеро 2', fieldIdentifier: 'Libero2Name' },
      libero2NumberOnCard: { enabled: true, type: 'text', fieldName: 'Номер либеро 2 на карте', fieldIdentifier: 'Libero2NumberOnCard' },
      libero2Background: { enabled: true, type: 'fill', fieldName: 'Подложка либеро 2', fieldIdentifier: 'Libero2Background' },
      libero2BackgroundOnCard: { enabled: true, type: 'fill', fieldName: 'Подложка либеро 2 на карте', fieldIdentifier: 'Libero2BackgroundOnCard' },
    },
    startingLineupTeamB: {
      title: { enabled: true, type: 'text', fieldName: 'Заголовок (название турнира)', fieldIdentifier: 'Title' },
      subtitle: { enabled: true, type: 'text', fieldName: 'Подзаголовок (название турнира)', fieldIdentifier: 'Subtitle' },
      teamName: { enabled: true, type: 'text', fieldName: 'Название команды', fieldIdentifier: 'TeamName' },
      teamCity: { enabled: true, type: 'text', fieldName: 'Город команды', fieldIdentifier: 'TeamCity' },
      teamLogo: { enabled: true, type: 'image', fieldName: 'Логотип команды (URL)', fieldIdentifier: 'TeamLogo' },
      player1Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 1', fieldIdentifier: 'Player1Number' },
      player1Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 1', fieldIdentifier: 'Player1Name' },
      player1NumberOnCard: { enabled: true, type: 'text', fieldName: 'Номер игрока 1 на карте', fieldIdentifier: 'Player1NumberOnCard' },
      player2Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 2', fieldIdentifier: 'Player2Number' },
      player2Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 2', fieldIdentifier: 'Player2Name' },
      player2NumberOnCard: { enabled: true, type: 'text', fieldName: 'Номер игрока 2 на карте', fieldIdentifier: 'Player2NumberOnCard' },
      player3Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 3', fieldIdentifier: 'Player3Number' },
      player3Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 3', fieldIdentifier: 'Player3Name' },
      player3NumberOnCard: { enabled: true, type: 'text', fieldName: 'Номер игрока 3 на карте', fieldIdentifier: 'Player3NumberOnCard' },
      player4Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 4', fieldIdentifier: 'Player4Number' },
      player4Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 4', fieldIdentifier: 'Player4Name' },
      player4NumberOnCard: { enabled: true, type: 'text', fieldName: 'Номер игрока 4 на карте', fieldIdentifier: 'Player4NumberOnCard' },
      player5Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 5', fieldIdentifier: 'Player5Number' },
      player5Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 5', fieldIdentifier: 'Player5Name' },
      player5NumberOnCard: { enabled: true, type: 'text', fieldName: 'Номер игрока 5 на карте', fieldIdentifier: 'Player5NumberOnCard' },
      player6Number: { enabled: true, type: 'text', fieldName: 'Номер игрока 6', fieldIdentifier: 'Player6Number' },
      player6Name: { enabled: true, type: 'text', fieldName: 'Имя игрока 6', fieldIdentifier: 'Player6Name' },
      player6NumberOnCard: { enabled: true, type: 'text', fieldName: 'Номер игрока 6 на карте', fieldIdentifier: 'Player6NumberOnCard' },
      libero1Number: { enabled: true, type: 'text', fieldName: 'Номер либеро 1', fieldIdentifier: 'Libero1Number' },
      libero1Name: { enabled: true, type: 'text', fieldName: 'Имя либеро 1', fieldIdentifier: 'Libero1Name' },
      libero1NumberOnCard: { enabled: true, type: 'text', fieldName: 'Номер либеро 1 на карте', fieldIdentifier: 'Libero1NumberOnCard' },
      libero1Background: { enabled: true, type: 'fill', fieldName: 'Подложка либеро 1', fieldIdentifier: 'Libero1Background' },
      libero1BackgroundOnCard: { enabled: true, type: 'fill', fieldName: 'Подложка либеро 1 на карте', fieldIdentifier: 'Libero1BackgroundOnCard' },
      libero2Number: { enabled: true, type: 'text', fieldName: 'Номер либеро 2', fieldIdentifier: 'Libero2Number' },
      libero2Name: { enabled: true, type: 'text', fieldName: 'Имя либеро 2', fieldIdentifier: 'Libero2Name' },
      libero2NumberOnCard: { enabled: true, type: 'text', fieldName: 'Номер либеро 2 на карте', fieldIdentifier: 'Libero2NumberOnCard' },
      libero2Background: { enabled: true, type: 'fill', fieldName: 'Подложка либеро 2', fieldIdentifier: 'Libero2Background' },
      libero2BackgroundOnCard: { enabled: true, type: 'fill', fieldName: 'Подложка либеро 2 на карте', fieldIdentifier: 'Libero2BackgroundOnCard' },
    },

    lineup: {
      title: { enabled: true, type: 'text', fieldName: 'Заголовок (название турнира)', fieldIdentifier: 'Title' },
      subtitle: { enabled: true, type: 'text', fieldName: 'Подзаголовок (название турнира)', fieldIdentifier: 'Subtitle' },
      teamALogo: { enabled: true, type: 'image', fieldName: 'Лого команды А', fieldIdentifier: 'TeamALogo' },
      teamAName: { enabled: true, type: 'text', fieldName: 'Название команды А', fieldIdentifier: 'TeamAName' },
      teamACity: { enabled: true, type: 'text', fieldName: 'Город команды А', fieldIdentifier: 'TeamACity' },
      teamBLogo: { enabled: true, type: 'image', fieldName: 'Лого команды Б', fieldIdentifier: 'TeamBLogo' },
      teamBName: { enabled: true, type: 'text', fieldName: 'Название команды Б', fieldIdentifier: 'TeamBName' },
      teamBCity: { enabled: true, type: 'text', fieldName: 'Город команды Б', fieldIdentifier: 'TeamBCity' },
      matchDate: { enabled: true, type: 'text', fieldName: 'Дата проведения', fieldIdentifier: 'MatchDate' },
      venueLine1: { enabled: true, type: 'text', fieldName: 'Место проведения (строка 1)', fieldIdentifier: 'VenueLine1' },
      venueLine2: { enabled: true, type: 'text', fieldName: 'Место проведения (строка 2)', fieldIdentifier: 'VenueLine2' },
    },

    referee1: {
      name: { enabled: true, type: 'text', fieldName: 'Имя', fieldIdentifier: 'Name' },
      position: { enabled: true, type: 'text', fieldName: 'Должность', fieldIdentifier: 'Position' },
    },

    referee2: {
      referee1Name: { enabled: true, type: 'text', fieldName: 'Судья 1', fieldIdentifier: 'Referee1Name' },
      referee2Name: { enabled: true, type: 'text', fieldName: 'Судья 2', fieldIdentifier: 'Referee2Name' },
    },

    // Инпуты "Счет после X партии"
    set1Score: generateSetScoreFields(1),
    set2Score: generateSetScoreFields(2),
    set3Score: generateSetScoreFields(3),
    set4Score: generateSetScoreFields(4),
    set5Score: generateSetScoreFields(5),
  };

  return configs[inputKey] || null;
}

/**
 * Конвертирует старый формат инпута в новый
 * @param {string|Object} inputValue - старое значение инпута (строка или объект с name/overlay)
 * @param {string} inputKey - ключ инпута
 * @returns {Object} - новый формат инпута
 */
function migrateInputToNewFormat(inputValue, inputKey) {
  let inputIdentifier = 'Input1';
  let overlay = 1;
  let existingFields = {};

  // Определяем inputIdentifier и overlay из старого формата
  if (typeof inputValue === 'string') {
    inputIdentifier = inputValue;
  } else if (inputValue && typeof inputValue === 'object') {
    inputIdentifier = inputValue.inputIdentifier || inputValue.name || inputIdentifier;
    overlay = inputValue.overlay || overlay;
    // Сохраняем существующие поля, если они есть
    if (inputValue.fields && typeof inputValue.fields === 'object') {
      existingFields = inputValue.fields;
    }
  }

  // Получаем конфигурацию полей по умолчанию
  const defaultFields = getDefaultFieldsForInput(inputKey) || {};

  // Объединяем существующие поля с полями по умолчанию
  // Если поле уже есть, сохраняем его (включая кастомные fieldIdentifier)
  // Если поля нет, добавляем из конфигурации по умолчанию
  const mergedFields = { ...defaultFields };
  for (const [fieldKey, existingField] of Object.entries(existingFields)) {
    if (mergedFields[fieldKey]) {
      // Объединяем: сохраняем пользовательские значения, добавляем недостающие свойства
      // ВАЖНО: тип поля всегда берется из defaults (для корректного обновления типов полей)
      mergedFields[fieldKey] = {
        ...mergedFields[fieldKey], // defaults имеют приоритет (особенно для type)
        ...existingField,
        // Переопределяем тип из defaults (важно для обновления типов, например, text -> image)
        type: mergedFields[fieldKey].type,
        // Убеждаемся, что fieldIdentifier есть (если нет, используем из defaults)
        fieldIdentifier: existingField.fieldIdentifier || mergedFields[fieldKey].fieldIdentifier,
      };
    } else {
      // Поле отсутствует в defaults, но есть в существующих - добавляем как есть
      mergedFields[fieldKey] = existingField;
    }
  }

  // Создаем новый формат
  return {
    enabled: inputValue?.enabled !== false, // По умолчанию включено
    inputIdentifier,
    overlay,
    fields: mergedFields,
  };
}

export {
  getDefaultFieldsForInput,
  migrateInputToNewFormat,
};

