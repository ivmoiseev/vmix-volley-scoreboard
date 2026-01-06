const axios = require('axios');
const errorHandler = require('../shared/errorHandler');

/**
 * Клиент для работы с vMix HTTP API
 * Документация: https://www.vmix.com/help24/index.htm?ShortcutFunctionReference.html
 */

class VMixClient {
  constructor(host = 'localhost', port = 8088) {
    this.host = host;
    this.port = port;
    this.baseURL = `http://${host}:${port}/api`;
    this.connected = false;
    this.requestQueue = [];
    this.processingQueue = false;
  }

  /**
   * Тестирует подключение к vMix
   */
  async testConnection() {
    try {
      const response = await axios.get(`${this.baseURL}`, {
        timeout: 3000,
      });
      this.connected = true;
      return { success: true, data: response.data };
    } catch (error) {
      this.connected = false;
      const friendlyError = errorHandler.handleError(error, 'vMix testConnection');
      return {
        success: false,
        error: friendlyError,
      };
    }
  }

  /**
   * Отправляет команду в vMix
   * @param {string} functionName - Название функции vMix API
   * @param {Object} params - Параметры команды
   */
  async sendCommand(functionName, params = {}) {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('Function', functionName);
      
      Object.keys(params).forEach(key => {
        queryParams.append(key, params[key]);
      });

      const response = await axios.get(`${this.baseURL}?${queryParams.toString()}`, {
        timeout: 5000,
      });
      
      return { success: true, data: response.data };
    } catch (error) {
      const friendlyError = errorHandler.handleError(error, `vMix sendCommand: ${functionName}`);
      return {
        success: false,
        error: friendlyError,
      };
    }
  }

  /**
   * Обновляет данные в инпуте
   * @param {string} inputName - Название инпута
   * @param {string} data - Данные для обновления (XML или текст)
   */
  async updateInput(inputName, data) {
    return this.sendCommand('SetText', {
      Input: inputName,
      Value: data,
    });
  }

  /**
   * Показывает инпут в оверлее
   * @param {number} overlay - Номер оверлея (1-8)
   * @param {string} inputName - Название инпута
   */
  async showOverlay(overlay, inputName) {
    return this.sendCommand('OverlayInput' + overlay + 'In', {
      Input: inputName,
    });
  }

  /**
   * Скрывает оверлей
   * @param {number} overlay - Номер оверлея (1-8)
   */
  async hideOverlay(overlay) {
    return this.sendCommand('OverlayInput' + overlay + 'Out');
  }

  /**
   * Получает текущее состояние оверлеев
   * @returns {Object} Состояние оверлеев
   */
  async getOverlayState() {
    try {
      const response = await axios.get(`${this.baseURL}`, {
        timeout: 3000,
      });
      
      // Парсим XML ответ vMix
      // vMix возвращает XML с информацией о состоянии
      // Здесь упрощенная версия - в реальности нужно парсить XML
      const xmlData = response.data;
      
      // Извлекаем информацию об оверлеях из XML
      // Это упрощенная версия - в реальности нужен XML парсер
      const overlayState = {
        1: { active: false, input: null },
        2: { active: false, input: null },
        3: { active: false, input: null },
        4: { active: false, input: null },
        5: { active: false, input: null },
        6: { active: false, input: null },
        7: { active: false, input: null },
        8: { active: false, input: null },
      };

      // TODO: Реальный парсинг XML ответа vMix
      // Для MVP используем упрощенную версию
      
      return { success: true, overlays: overlayState };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        overlays: null,
      };
    }
  }

  /**
   * Получает список доступных инпутов
   */
  async getInputs() {
    try {
      const response = await axios.get(`${this.baseURL}`, {
        timeout: 3000,
      });
      
      // Парсим XML и извлекаем список инпутов
      // Упрощенная версия
      return { success: true, inputs: [] };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        inputs: [],
      };
    }
  }

  /**
   * Устанавливает настройки подключения
   */
  setConnection(host, port) {
    this.host = host;
    this.port = port;
    this.baseURL = `http://${host}:${port}/api`;
    this.connected = false;
  }

  /**
   * Проверяет, подключен ли клиент
   */
  isConnected() {
    return this.connected;
  }
}

// Создаем singleton экземпляр
let vmixClientInstance = null;

function getVMixClient(host, port) {
  if (!vmixClientInstance) {
    vmixClientInstance = new VMixClient(host, port);
  } else if (host && port) {
    vmixClientInstance.setConnection(host, port);
  }
  return vmixClientInstance;
}

module.exports = {
  VMixClient,
  getVMixClient,
};

