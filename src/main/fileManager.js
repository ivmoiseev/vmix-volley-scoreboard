const fs = require('fs').promises;
const path = require('path');
const { dialog } = require('electron');
const { validateMatch, createNewMatch } = require('../shared/matchUtils');
const errorHandler = require('../shared/errorHandler');
const logoManager = require('./logoManager');

const MATCHES_DIR = path.join(__dirname, '../../matches');

/**
 * Убеждается, что папка matches существует
 */
async function ensureMatchesDir() {
  try {
    await fs.access(MATCHES_DIR);
  } catch {
    await fs.mkdir(MATCHES_DIR, { recursive: true });
  }
}

/**
 * Создает новый матч
 */
async function createMatch() {
  const match = createNewMatch();
  return match;
}

/**
 * Сохраняет матч в файл
 */
async function saveMatch(match, filePath = null) {
  await ensureMatchesDir();

  if (!validateMatch(match)) {
    throw new Error('Некорректные данные матча');
  }

  // Обновляем время изменения
  match.updatedAt = new Date().toISOString();

  // Обрабатываем логотипы команд: сохраняем в файлы и добавляем пути
  const matchToSave = { ...match };
  matchToSave.teamA = await logoManager.processTeamLogoForSave(match.teamA, 'A');
  matchToSave.teamB = await logoManager.processTeamLogoForSave(match.teamB, 'B');

  // Очищаем папку logos от устаревших файлов после сохранения логотипов
  await logoManager.cleanupLogosDirectory();

  // Если путь не указан, используем стандартный путь
  if (!filePath) {
    const fileName = `match_${match.matchId}.json`;
    filePath = path.join(MATCHES_DIR, fileName);
  }

  // Сохраняем файл
  await fs.writeFile(filePath, JSON.stringify(matchToSave, null, 2), 'utf-8');

  return filePath;
}

/**
 * Открывает диалог выбора файла для открытия матча
 */
async function openMatchDialog() {
  const result = await dialog.showOpenDialog({
    title: 'Открыть матч',
    defaultPath: MATCHES_DIR,
    filters: [
      { name: 'JSON файлы', extensions: ['json'] },
      { name: 'Все файлы', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
}

/**
 * Открывает матч из файла
 */
async function openMatch(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    let match;
    
    try {
      match = JSON.parse(data);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Ошибка чтения JSON файла. Файл поврежден или имеет неверный формат.');
    }

    // Миграция: заменяем позицию "Другое" на "Не указано" в рострах команд
    if (match.teamA && Array.isArray(match.teamA.roster)) {
      match.teamA.roster = match.teamA.roster.map(player => {
        if (player.position === 'Другое') {
          return { ...player, position: 'Не указано' };
        }
        return player;
      });
    }
    if (match.teamB && Array.isArray(match.teamB.roster)) {
      match.teamB.roster = match.teamB.roster.map(player => {
        if (player.position === 'Другое') {
          return { ...player, position: 'Не указано' };
        }
        return player;
      });
    }

    if (!validateMatch(match)) {
      console.error('Validation failed for match:', match);
      throw new Error('Файл содержит некорректные данные матча');
    }

    // Обрабатываем логотипы команд: загружаем из файлов или используем base64
    const matchToLoad = { ...match };
    matchToLoad.teamA = await logoManager.processTeamLogoForLoad(match.teamA, 'A');
    matchToLoad.teamB = await logoManager.processTeamLogoForLoad(match.teamB, 'B');

    return matchToLoad;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('Файл не найден');
    }
    if (error instanceof SyntaxError || error.message.includes('JSON')) {
      throw new Error('Ошибка чтения JSON файла. Файл поврежден или имеет неверный формат.');
    }
    // Если ошибка уже имеет понятное сообщение, используем его
    if (error.message && error.message !== 'Файл содержит некорректные данные матча') {
      const friendlyError = errorHandler.handleError(error, 'openMatch');
      throw new Error(friendlyError);
    }
    throw error;
  }
}

/**
 * Открывает диалог сохранения матча
 */
async function saveMatchDialog(match) {
  await ensureMatchesDir();

  const defaultFileName = match.matchId 
    ? `match_${match.matchId}.json`
    : `match_${Date.now()}.json`;

  const result = await dialog.showSaveDialog({
    title: 'Сохранить матч',
    defaultPath: path.join(MATCHES_DIR, defaultFileName),
    filters: [
      { name: 'JSON файлы', extensions: ['json'] },
      { name: 'Все файлы', extensions: ['*'] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  return await saveMatch(match, result.filePath);
}

module.exports = {
  createMatch,
  saveMatch,
  openMatch,
  openMatchDialog,
  saveMatchDialog,
  MATCHES_DIR,
};

