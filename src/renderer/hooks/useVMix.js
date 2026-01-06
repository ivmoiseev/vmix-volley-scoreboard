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
  }, [vmixConfig, connectionStatus.connected]);

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

  const updateOverlayStates = async () => {
    try {
      if (!window.electronAPI || !vmixConfig) {
        return;
      }
      const result = await window.electronAPI.getVMixOverlayState();
      if (result.success && result.overlays) {
        setOverlayStates(result.overlays);
      }
    } catch (error) {
      console.error('Ошибка при обновлении состояния оверлеев:', error);
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
      
      // Поддержка старого формата (строка) и нового (объект)
      const inputName = typeof inputConfig === 'string' ? inputConfig : inputConfig.name;
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
      if (!inputConfig || !inputConfig.name) {
        return { success: false, error: 'Инпут не настроен' };
      }

      const result = await window.electronAPI.showVMixOverlay(inputKey);
      
      // Обновляем состояние после небольшой задержки
      if (result.success) {
        setTimeout(() => {
          updateOverlayStates();
        }, 500);
      }
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [vmixConfig, connectionStatus.connected]);

  /**
   * Скрывает оверлей
   */
  const hideOverlay = useCallback(async (inputKey) => {
    if (!vmixConfig || !connectionStatus.connected) {
      return { success: false, error: 'vMix не подключен' };
    }

    try {
      const result = await window.electronAPI.hideVMixOverlay(inputKey);
      
      // Обновляем состояние после небольшой задержки
      if (result.success) {
        setTimeout(() => {
          updateOverlayStates();
        }, 500);
      }
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [vmixConfig, connectionStatus.connected]);

  // Создаем debounced функцию для обновления данных
  const updateMatchDataDebouncedRef = useRef(null);
  const vmixConfigRef = useRef(vmixConfig);
  const connectionStatusRef = useRef(connectionStatus);

  // Обновляем refs при изменении
  useEffect(() => {
    vmixConfigRef.current = vmixConfig;
    connectionStatusRef.current = connectionStatus;
  }, [vmixConfig, connectionStatus]);

  useEffect(() => {
    updateMatchDataDebouncedRef.current = debounce(async (matchData) => {
      const currentConfig = vmixConfigRef.current;
      const currentStatus = connectionStatusRef.current;
      
      if (!currentConfig || !currentStatus.connected || !matchData) {
        return;
      }

      try {
        // Обновляем текущий счет
        const currentScoreData = formatCurrentScoreData(matchData);
        await updateInput('currentScore', currentScoreData);

        // Обновляем счет по партиям
        matchData.sets.forEach((set) => {
          if (set.completed) {
            const setKey = `set${set.setNumber}Score`;
            const setScoreData = formatSetScoreData(matchData, set);
            updateInput(setKey, setScoreData);
          }
        });

        // Обновляем статистику, если включена
        if (matchData.statistics.enabled) {
          const statsData = formatStatisticsData(matchData);
          updateInput('statistics', statsData);
        }
      } catch (error) {
        console.error('Ошибка при обновлении данных в vMix:', error);
      }
    }, 300);
  }, [updateInput]);

  /**
   * Автоматическое обновление данных матча в vMix
   */
  const updateMatchData = useCallback((matchData) => {
    if (updateMatchDataDebouncedRef.current) {
      updateMatchDataDebouncedRef.current(matchData);
    }
  }, []);

  /**
   * Форматирует данные текущего счета для vMix
   */
  const formatCurrentScoreData = (match) => {
    // Здесь должен быть формат данных, который ожидает ваш инпут в vMix
    // Это может быть XML, JSON или простой текст в зависимости от вашего шаблона
    return JSON.stringify({
      teamA: match.teamA.name,
      teamB: match.teamB.name,
      scoreA: match.currentSet.scoreA,
      scoreB: match.currentSet.scoreB,
      setNumber: match.currentSet.setNumber,
      servingTeam: match.currentSet.servingTeam === 'A' ? match.teamA.name : match.teamB.name,
    });
  };

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
    if (!vmixConfig) {
      return false;
    }
    const inputConfig = vmixConfig.inputs[inputKey];
    if (!inputConfig) {
      return false;
    }
    
    // Поддержка старого формата (строка) и нового (объект)
    const inputName = typeof inputConfig === 'string' ? inputConfig : inputConfig.name;
    const overlay = typeof inputConfig === 'object' && inputConfig.overlay 
      ? inputConfig.overlay 
      : (vmixConfig.overlay || 1);
    
    const overlayState = overlayStates[overlay];
    if (!overlayState) {
      return false;
    }
    return overlayState.active && overlayState.input === inputName;
  }, [vmixConfig, overlayStates]);

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

