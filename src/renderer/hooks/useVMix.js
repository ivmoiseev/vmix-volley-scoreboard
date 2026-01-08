import { useState, useEffect, useCallback, useRef } from 'react';
import { debounce } from '../utils/debounce';

/**
 * Хук для работы с vMix
 */
export function useVMix(match) {
  const [vmixConfig, setVMixConfig] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    message: 'Не подключено',
  });
  const [overlayStates, setOverlayStates] = useState({});
  const updateTimeoutRef = useRef(null);
  const vmixConfigRef = useRef(vmixConfig);

  // Обновляем ref при изменении vmixConfig
  useEffect(() => {
    vmixConfigRef.current = vmixConfig;
  }, [vmixConfig]);

  // Объявляем updateOverlayStates до использования
  const [inputsMap, setInputsMap] = useState({});

  const updateOverlayStates = useCallback(async () => {
    try {
      if (!window.electronAPI || !vmixConfigRef.current) {
        return;
      }
      const result = await window.electronAPI.getVMixOverlayState();
      if (result.success && result.overlays) {
        setOverlayStates(result.overlays);
        // Сохраняем карту инпутов для поиска по имени
        if (result.inputsMap) {
          setInputsMap(result.inputsMap);
        }
      }
    } catch (error) {
      console.error('Ошибка при обновлении состояния оверлеев:', error);
    }
  }, []);

  // Загружаем конфигурацию vMix
  useEffect(() => {
    loadConfig();
  }, []);

  // Обновляем состояние оверлеев периодически
  useEffect(() => {
    if (vmixConfig && connectionStatus.connected) {
      const interval = setInterval(() => {
        updateOverlayStates();
      }, 2000); // Обновляем каждые 2 секунды

      return () => clearInterval(interval);
    }
  }, [vmixConfig, connectionStatus.connected, updateOverlayStates]);

  const loadConfig = async () => {
    try {
      if (!window.electronAPI) {
        return;
      }
      const config = await window.electronAPI.getVMixConfig();
      if (config) {
        setVMixConfig(config);
        // Проверяем подключение
        checkConnection(config.host, config.port);
      }
    } catch (error) {
      console.error('Ошибка при загрузке настроек vMix:', error);
    }
  };

  const checkConnection = async (host, port) => {
    try {
      if (!window.electronAPI) {
        return;
      }
      const result = await window.electronAPI.testVMixConnection(host, port);
      setConnectionStatus({
        connected: result.success,
        message: result.success ? 'Подключено' : (result.error || 'Не подключено'),
      });
      
      if (result.success) {
        updateOverlayStates();
      }
    } catch (error) {
      setConnectionStatus({
        connected: false,
        message: 'Ошибка подключения',
      });
    }
  };

  /**
   * Обновляет данные в инпуте vMix
   */
  const updateInput = useCallback(async (inputKey, data) => {
    if (!vmixConfig || !connectionStatus.connected) {
      return { success: false, error: 'vMix не подключен' };
    }

    try {
      const inputConfig = vmixConfig.inputs[inputKey];
      if (!inputConfig) {
        return { success: false, error: 'Инпут не настроен' };
      }
      
      // Проверяем, включен ли инпут
      if (inputConfig.enabled === false) {
        return { success: false, error: 'Инпут отключен' };
      }
      
      // Поддержка старого формата (строка) и нового (объект с inputIdentifier)
      let inputName;
      if (typeof inputConfig === 'string') {
        inputName = inputConfig;
      } else if (inputConfig.inputIdentifier) {
        inputName = inputConfig.inputIdentifier;
      } else if (inputConfig.name) {
        inputName = inputConfig.name; // Обратная совместимость
      }
      
      if (!inputName) {
        return { success: false, error: 'Инпут не настроен' };
      }

      const result = await window.electronAPI.updateVMixInput(inputName, data);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [vmixConfig, connectionStatus.connected]);

  /**
   * Показывает плашку в оверлее
   */
  const showOverlay = useCallback(async (inputKey) => {
    if (!vmixConfig || !connectionStatus.connected) {
      return { success: false, error: 'vMix не подключен' };
    }

    try {
      const inputConfig = vmixConfig.inputs[inputKey];
      if (!inputConfig) {
        return { success: false, error: 'Инпут не настроен' };
      }
      
      // Проверяем, включен ли инпут
      if (inputConfig.enabled === false) {
        return { success: false, error: 'Инпут отключен' };
      }

      const result = await window.electronAPI.showVMixOverlay(inputKey);
      
      // Обновляем состояние после небольшой задержки
      if (result.success && updateOverlayStates) {
        setTimeout(() => {
          updateOverlayStates();
        }, 300);
      }
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [vmixConfig, connectionStatus.connected, updateOverlayStates]);

  /**
   * Скрывает оверлей
   * Примечание: hideOverlay не проверяет enabled, так как нужно иметь возможность скрыть оверлей даже если инпут отключен
   */
  const hideOverlay = useCallback(async (inputKey) => {
    if (!vmixConfig || !connectionStatus.connected) {
      return { success: false, error: 'vMix не подключен' };
    }

    try {
      const result = await window.electronAPI.hideVMixOverlay(inputKey);
      
      // Обновляем состояние после небольшой задержки
      if (result.success && updateOverlayStates) {
        setTimeout(() => {
          updateOverlayStates();
        }, 300);
      }
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [vmixConfig, connectionStatus.connected, updateOverlayStates]);

  // Создаем debounced функцию для обновления данных
  const updateMatchDataDebouncedRef = useRef(null);
  const connectionStatusRef = useRef(connectionStatus);

  // Обновляем ref при изменении connectionStatus
  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);

  /**
   * Автоматическое обновление данных матча в vMix
   */
  const updateMatchData = useCallback((matchData) => {
    if (updateMatchDataDebouncedRef.current) {
      updateMatchDataDebouncedRef.current(matchData);
    }
  }, []);

  /**
   * Рассчитывает счет по сетам для команды
   */
  const calculateSetsScore = useCallback((match, team) => {
    if (!match || !match.sets) return 0;
    return match.sets.filter(set => {
      if (!set.completed) return false;
      if (team === 'A') {
        return set.scoreA > set.scoreB;
      } else {
        return set.scoreB > set.scoreA;
      }
    }).length;
  }, []);

  /**
   * Форматирует данные текущего счета для vMix в виде объекта полей
   * Возвращает объект с полями для текстовых значений и отдельный объект для полей видимости
   */
  const formatCurrentScoreData = useCallback((match) => {
    if (!match) return { fields: {}, colorFields: {}, visibilityFields: {} };

    const inputConfig = vmixConfigRef.current?.inputs?.currentScore;
    if (!inputConfig || !inputConfig.fields) {
      return { fields: {}, colorFields: {}, visibilityFields: {} };
    }

    const fields = {};
    const colorFields = {};
    const visibilityFields = {};
    const setsScoreA = calculateSetsScore(match, 'A');
    const setsScoreB = calculateSetsScore(match, 'B');
    
    // Определяем, у какой команды подача (поинт)
    const servingTeam = match.currentSet.servingTeam || null;

    // Проходим по всем полям конфигурации и формируем значения
    Object.entries(inputConfig.fields).forEach(([fieldKey, fieldConfig]) => {
      // Пропускаем отключенные поля
      if (fieldConfig.enabled === false) return;

      const fieldIdentifier = fieldConfig.fieldIdentifier;
      
      // Для полей видимости используем отдельную логику
      if (fieldConfig.type === 'visibility' && (fieldKey === 'pointA' || fieldKey === 'pointB')) {
        let visible = false;
        if (fieldKey === 'pointA') {
          visible = servingTeam === 'A';
        } else if (fieldKey === 'pointB') {
          visible = servingTeam === 'B';
        }
        
        visibilityFields[fieldIdentifier] = {
          visible,
          fieldConfig,
        };
        // Не добавляем в обычные поля - видимость управляется отдельно
        return;
      }

      // Для полей цвета используем отдельную логику
      if (fieldConfig.type === 'color') {
        let colorValue = '';
        
        if (fieldKey === 'colorA') {
          // Цвет команды A в HEX формате
          // Нормализуем цвет: убеждаемся, что он в формате #RRGGBB
          const colorA = match.teamA.color || '#3498db';
          colorValue = colorA.startsWith('#') ? colorA : `#${colorA}`;
        } else if (fieldKey === 'colorB') {
          // Цвет команды B в HEX формате
          // Нормализуем цвет: убеждаемся, что он в формате #RRGGBB
          const colorB = match.teamB.color || '#e74c3c';
          colorValue = colorB.startsWith('#') ? colorB : `#${colorB}`;
        }
        
        // Добавляем цвет в объект для отправки через SetColor
        if (fieldIdentifier && colorValue !== '') {
          colorFields[fieldIdentifier] = colorValue;
        }
        return;
      }

      // Для остальных полей (текстовых) - обычная логика
      let value = '';

      switch (fieldKey) {
        case 'teamA':
          value = match.teamA.name || '';
          break;
        case 'teamB':
          value = match.teamB.name || '';
          break;
        case 'scoreASet':
          value = String(match.currentSet.scoreA || 0);
          break;
        case 'scoreBSet':
          value = String(match.currentSet.scoreB || 0);
          break;
        case 'scoreASets':
          value = String(setsScoreA);
          break;
        case 'scoreBSets':
          value = String(setsScoreB);
          break;
        default:
          value = '';
      }

      // Добавляем поле в объект для отправки
      if (fieldIdentifier && value !== '') {
        fields[fieldIdentifier] = value;
      }
    });

    return { fields, colorFields, visibilityFields };
  }, [calculateSetsScore]);

  /**
   * Обновляет инпут текущего счета в vMix
   */
  const updateCurrentScoreInput = useCallback(async (match) => {
    if (!window.electronAPI || !vmixConfigRef.current || !connectionStatusRef.current.connected) {
      return { success: false, error: 'vMix не подключен' };
    }

    try {
      const inputConfig = vmixConfigRef.current.inputs?.currentScore;
      if (!inputConfig || inputConfig.enabled === false) {
        return { success: false, error: 'Инпут отключен' };
      }

      const inputIdentifier = inputConfig.inputIdentifier;
      if (!inputIdentifier) {
        return { success: false, error: 'Инпут не настроен' };
      }

      const { fields, colorFields, visibilityFields } = formatCurrentScoreData(match);
      if (Object.keys(fields).length === 0 && Object.keys(colorFields).length === 0 && Object.keys(visibilityFields).length === 0) {
        return { success: false, error: 'Нет полей для обновления' };
      }

      const result = await window.electronAPI.updateVMixInputFields(inputIdentifier, fields, colorFields, visibilityFields);
      return result;
    } catch (error) {
      console.error('Ошибка при обновлении текущего счета:', error);
      return { success: false, error: error.message };
    }
  }, [formatCurrentScoreData]);

  // Инициализируем debounced функцию для обновления данных
  useEffect(() => {
    updateMatchDataDebouncedRef.current = debounce(async (matchData) => {
      const currentConfig = vmixConfigRef.current;
      const currentStatus = connectionStatusRef.current;
      
      if (!currentConfig || !currentStatus.connected || !matchData) {
        return;
      }

      try {
        // Обновляем текущий счет
        await updateCurrentScoreInput(matchData);

        // Обновляем счет по партиям
        matchData.sets.forEach((set) => {
          if (set.completed) {
            const setKey = `set${set.setNumber}Score`;
            // TODO: Реализовать для set scores позже
          }
        });

        // Обновляем статистику, если включена
        if (matchData.statistics.enabled) {
          // TODO: Реализовать для statistics позже
        }
      } catch (error) {
        console.error('Ошибка при обновлении данных в vMix:', error);
      }
    }, 300);
  }, [updateCurrentScoreInput]);

  /**
   * Форматирует данные счета партии для vMix
   */
  const formatSetScoreData = (match, set) => {
    return JSON.stringify({
      teamA: match.teamA.name,
      teamB: match.teamB.name,
      setNumber: set.setNumber,
      scoreA: set.scoreA,
      scoreB: set.scoreB,
    });
  };

  /**
   * Форматирует данные статистики для vMix
   */
  const formatStatisticsData = (match) => {
    return JSON.stringify({
      teamA: {
        name: match.teamA.name,
        attack: match.statistics.teamA.attack,
        block: match.statistics.teamA.block,
        serve: match.statistics.teamA.serve,
        opponentErrors: match.statistics.teamA.opponentErrors,
      },
      teamB: {
        name: match.teamB.name,
        attack: match.statistics.teamB.attack,
        block: match.statistics.teamB.block,
        serve: match.statistics.teamB.serve,
        opponentErrors: match.statistics.teamB.opponentErrors,
      },
    });
  };

  /**
   * Проверяет, активна ли плашка в оверлее
   */
  const isOverlayActive = useCallback((inputKey) => {
    if (!vmixConfig || !overlayStates) {
      return false;
    }
    const inputConfig = vmixConfig.inputs[inputKey];
    if (!inputConfig) {
      return false;
    }
    
    // Поддержка старого формата (строка) и нового (объект)
    const inputIdentifier = typeof inputConfig === 'string' 
      ? inputConfig 
      : (inputConfig.inputIdentifier || inputConfig.name);
    const overlay = typeof inputConfig === 'object' && inputConfig.overlay 
      ? inputConfig.overlay 
      : (vmixConfig.overlay || 1);
    
    if (!inputIdentifier) {
      return false;
    }
    
    const overlayState = overlayStates[overlay];
    if (!overlayState) {
      return false;
    }
    
    // Сравниваем активность и номер инпута
    // В реальном XML vMix возвращает номер инпута как строку (например, "13")
    // Нам нужно сравнить номер из оверлея с номером нашего инпута
    // Если в конфигурации указано имя (например, "ScoreUpVFV2024.gtzip"), 
    // нужно сначала найти номер этого инпута в списке inputs из XML
    
    // Нормализуем номер инпута из состояния оверлея
    const overlayInputNumber = overlayState.input ? String(overlayState.input).trim() : null;
    
    // Нормализуем inputIdentifier из конфигурации
    let configInputNumber = null;
    
    // Если inputIdentifier - это число или "InputN", извлекаем номер
    if (/^\d+$/.test(inputIdentifier.trim())) {
      configInputNumber = inputIdentifier.trim();
    } else if (/^Input\s*(\d+)$/i.test(inputIdentifier.trim())) {
      const match = inputIdentifier.trim().match(/^Input\s*(\d+)$/i);
      configInputNumber = match[1];
    } else {
      // Если это имя инпута, ищем его номер в inputsMap
      // inputsMap заполняется при получении состояния оверлеев из XML
      const normalizedName = inputIdentifier.trim().toLowerCase();
      
      // Ищем в inputsMap по title или shortTitle
      for (const [number, inputInfo] of Object.entries(inputsMap || {})) {
        const title = (inputInfo.title || '').toLowerCase();
        const shortTitle = (inputInfo.shortTitle || '').toLowerCase();
        
        if (title === normalizedName || 
            shortTitle === normalizedName ||
            title.includes(normalizedName) ||
            shortTitle.includes(normalizedName)) {
          configInputNumber = number;
          break;
        }
      }
    }
    
    // Сравниваем номера инпутов
    const isActive = overlayState.active === true && 
                     overlayInputNumber !== null &&
                     configInputNumber !== null &&
                     overlayInputNumber === configInputNumber;
    
    // Отладочный вывод (можно убрать после тестирования)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[isOverlayActive] ${inputKey}:`, {
        overlay,
        overlayState,
        inputIdentifier,
        overlayInputNumber,
        configInputNumber,
        isActive
      });
    }
    
    return isActive;
  }, [vmixConfig, overlayStates, inputsMap]);

  return {
    vmixConfig,
    connectionStatus,
    overlayStates,
    updateInput,
    showOverlay,
    hideOverlay,
    updateMatchData,
    isOverlayActive,
    checkConnection,
  };
}

