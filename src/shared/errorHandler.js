/**
 * Централизованная обработка ошибок
 */

class ErrorHandler {
  constructor() {
    this.errorLog = [];
  }

  /**
   * Обрабатывает ошибку и возвращает понятное сообщение для пользователя
   */
  handleError(error, context = '') {
    console.error(`[${context}] Error:`, error);

    // Логируем ошибку
    this.errorLog.push({
      timestamp: new Date().toISOString(),
      context,
      error: error.message || String(error),
      stack: error.stack,
    });

    // Возвращаем понятное сообщение для пользователя
    return this.getUserFriendlyMessage(error, context);
  }

  /**
   * Преобразует техническую ошибку в понятное сообщение
   */
  getUserFriendlyMessage(error, context) {
    const errorMessage = error.message || String(error);

    // Ошибки файловой системы
    if (errorMessage.includes('ENOENT') || errorMessage.includes('не найден')) {
      return 'Файл не найден. Проверьте путь к файлу.';
    }

    if (errorMessage.includes('EACCES') || errorMessage.includes('доступ')) {
      return 'Нет доступа к файлу. Проверьте права доступа.';
    }

    if (errorMessage.includes('EISDIR')) {
      return 'Выбранная папка, а не файл. Выберите файл.';
    }

    // Ошибки сети
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('подключение')) {
      return 'Не удалось подключиться. Проверьте адрес и порт.';
    }

    if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('таймаут')) {
      return 'Превышено время ожидания. Проверьте подключение к сети.';
    }

    if (errorMessage.includes('ENOTFOUND')) {
      return 'Сервер не найден. Проверьте адрес.';
    }

    // Ошибки JSON
    if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
      return 'Ошибка чтения файла. Файл поврежден или имеет неверный формат.';
    }

    // Ошибки валидации
    if (errorMessage.includes('валидация') || errorMessage.includes('Validation failed')) {
      return 'Данные некорректны. Проверьте введенные данные.';
    }

    // Общая ошибка
    return errorMessage || 'Произошла неизвестная ошибка.';
  }

  /**
   * Получает лог ошибок
   */
  getErrorLog() {
    return this.errorLog;
  }

  /**
   * Очищает лог ошибок
   */
  clearErrorLog() {
    this.errorLog = [];
  }
}

// Singleton экземпляр
const errorHandler = new ErrorHandler();

module.exports = errorHandler;

