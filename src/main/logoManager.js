const fs = require('fs').promises;
const path = require('path');

const LOGOS_DIR = path.join(__dirname, '../../logos');

/**
 * Убеждается, что папка logos существует
 */
async function ensureLogosDir() {
  try {
    await fs.access(LOGOS_DIR);
  } catch {
    await fs.mkdir(LOGOS_DIR, { recursive: true });
  }
}

/**
 * Конвертирует base64 в Buffer (убирает data URL префикс)
 */
function base64ToBuffer(base64String) {
  // Убираем префикс data:image/png;base64, если есть
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

/**
 * Сохраняет логотип из base64 в файл PNG
 * Использует фиксированные имена logo_a.png и logo_b.png для перезаписи
 * @param {string} base64String - base64 строка изображения
 * @param {string} team - 'A' или 'B'
 * @returns {Promise<string>} - путь к сохраненному файлу относительно logos/
 */
async function saveLogoToFile(base64String, team) {
  await ensureLogosDir();
  
  // Используем фиксированные имена для перезаписи
  const fileName = team === 'A' ? 'logo_a.png' : 'logo_b.png';
  const filePath = path.join(LOGOS_DIR, fileName);
  
  // Конвертируем base64 в Buffer и сохраняем (перезаписываем существующий файл)
  const buffer = base64ToBuffer(base64String);
  await fs.writeFile(filePath, buffer);
  
  // Возвращаем относительный путь для сохранения в JSON
  return `logos/${fileName}`;
}

/**
 * Загружает логотип из файла и конвертирует в base64
 * @param {string} logoPath - путь к файлу (относительный или абсолютный)
 * @returns {Promise<string|null>} - base64 строка или null если файл не найден
 */
async function loadLogoFromFile(logoPath) {
  try {
    let filePath;
    
    // Если путь относительный (начинается с logos/)
    if (logoPath.startsWith('logos/')) {
      filePath = path.join(__dirname, '../../', logoPath);
    } else {
      // Если абсолютный путь
      filePath = logoPath;
    }
    
    // Проверяем существование файла
    await fs.access(filePath);
    
    // Читаем файл и конвертируем в base64
    const buffer = await fs.readFile(filePath);
    const base64 = buffer.toString('base64');
    
    // Возвращаем data URL для совместимости
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    // Файл не найден или ошибка чтения
    return null;
  }
}

/**
 * Обрабатывает логотипы команды при сохранении матча
 * Сохраняет base64 в файл и возвращает обновленный объект команды
 * @param {Object} team - объект команды с logo (base64)
 * @param {string} teamLetter - 'A' или 'B'
 * @returns {Promise<Object>} - обновленный объект команды с logoPath и logoBase64
 */
async function processTeamLogoForSave(team, teamLetter) {
  if (!team.logo) {
    return team;
  }
  
  // Проверяем, является ли logo base64 строкой
  const isBase64 = typeof team.logo === 'string' && 
                   (team.logo.startsWith('data:image/') || team.logo.length > 100);
  
  if (isBase64) {
    try {
      // Сохраняем в файл с фиксированным именем (перезаписываем)
      const logoPath = await saveLogoToFile(team.logo, teamLetter);
      
      // Возвращаем объект с путем и base64
      return {
        ...team,
        logoPath, // Путь к файлу для HTTP доступа
        logoBase64: team.logo, // Base64 для портативности
        logo: undefined, // Убираем из основного поля для экономии места в JSON
      };
    } catch (error) {
      console.error(`Ошибка при сохранении логотипа команды ${teamLetter}:`, error);
      // В случае ошибки сохраняем только base64
      return {
        ...team,
        logoBase64: team.logo,
        logo: undefined,
      };
    }
  }
  
  // Если logo уже является путем к файлу, оставляем как есть
  return team;
}

/**
 * Обрабатывает логотипы команды при загрузке матча
 * Пытается загрузить файл, если не получается - использует base64
 * ВАЖНО: Если есть base64, перезаписывает файл для синхронизации
 * @param {Object} team - объект команды с logoPath и/или logoBase64
 * @param {string} teamLetter - 'A' или 'B' (для определения фиксированного имени)
 * @returns {Promise<Object>} - обновленный объект команды с logo (base64 для отображения)
 */
async function processTeamLogoForLoad(team, teamLetter) {
  let logoBase64 = null;
  
  // Приоритет 1: используем base64 из JSON (самый надежный источник)
  if (team.logoBase64) {
    logoBase64 = team.logoBase64;
    // Перезаписываем файл для синхронизации с данными матча
    try {
      await saveLogoToFile(logoBase64, teamLetter);
    } catch (error) {
      console.error(`Ошибка при сохранении логотипа команды ${teamLetter} при загрузке:`, error);
    }
    return {
      ...team,
      logo: logoBase64, // Для отображения в UI
    };
  }
  
  // Приоритет 2: если logo уже есть (старый формат без logoBase64)
  if (team.logo) {
    logoBase64 = team.logo;
    // Проверяем, является ли это base64
    const isBase64 = typeof team.logo === 'string' && 
                     (team.logo.startsWith('data:image/') || team.logo.length > 100);
    if (isBase64) {
      // Перезаписываем файл для синхронизации
      try {
        await saveLogoToFile(logoBase64, teamLetter);
      } catch (error) {
        console.error(`Ошибка при сохранении логотипа команды ${teamLetter} при загрузке:`, error);
      }
    }
    return team;
  }
  
  // Приоритет 3: пытаемся загрузить из файла (если нет base64 в JSON)
  if (team.logoPath) {
    logoBase64 = await loadLogoFromFile(team.logoPath, teamLetter);
    if (logoBase64) {
      return {
        ...team,
        logo: logoBase64, // Для отображения в UI
      };
    }
  } else {
    // Если logoPath нет, но есть teamLetter, пробуем загрузить фиксированное имя
    if (teamLetter) {
      const fixedFileName = teamLetter === 'A' ? 'logo_a.png' : 'logo_b.png';
      logoBase64 = await loadLogoFromFile(`logos/${fixedFileName}`, teamLetter);
      if (logoBase64) {
        return {
          ...team,
          logo: logoBase64,
        };
      }
    }
  }
  
  // Нет логотипа
  return team;
}

/**
 * Получает HTTP URL для логотипа
 * @param {string} logoPath - путь к файлу (относительный)
 * @param {number} port - порт HTTP сервера
 * @returns {string|null} - HTTP URL или null
 */
function getLogoHttpUrl(logoPath, port) {
  if (!logoPath) return null;
  
  // Убираем префикс logos/ если есть
  const fileName = logoPath.replace(/^logos\//, '');
  return `http://localhost:${port}/${logoPath}`;
}

module.exports = {
  saveLogoToFile,
  loadLogoFromFile,
  processTeamLogoForSave,
  processTeamLogoForLoad,
  getLogoHttpUrl,
  LOGOS_DIR,
};

