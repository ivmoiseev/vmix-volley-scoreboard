import { useState, useEffect, useCallback, useRef } from "react";
import { debounce } from "../utils/debounce";

// Константы для типов полей и ключей
const FIELD_TYPES = {
  TEXT: "text",
  COLOR: "color",
  VISIBILITY: "visibility",
  IMAGE: "image",
};

const FIELD_KEYS = {
  TEAM_A_LOGO: "teamALogo",
  TEAM_B_LOGO: "teamBLogo",
  POINT_A: "pointA",
  POINT_B: "pointB",
  COLOR_A: "colorA",
  COLOR_B: "colorB",
};

const OVERLAY_UPDATE_DELAY = 300;
const OVERLAY_POLL_INTERVAL = 2000;
const DEBOUNCE_DELAY = 300;

/**
 * Хук для работы с vMix
 */
export function useVMix(match) {
  const [vmixConfig, setVMixConfig] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    message: "Не подключено",
  });
  const [overlayStates, setOverlayStates] = useState({});
  const [inputsMap, setInputsMap] = useState({});
  const updateTimeoutRef = useRef(null);
  const vmixConfigRef = useRef(vmixConfig);
  const updateMatchDataDebouncedRef = useRef(null);
  const connectionStatusRef = useRef(connectionStatus);

  // Обновляем refs при изменении состояния
  useEffect(() => {
    vmixConfigRef.current = vmixConfig;
  }, [vmixConfig]);

  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);

  // Вспомогательные функции для проверок и валидации
  const isVMixReady = useCallback(() => {
    return (
      window.electronAPI &&
      vmixConfigRef.current &&
      connectionStatusRef.current.connected
    );
  }, []);

  const getInputIdentifier = useCallback((inputConfig) => {
    if (typeof inputConfig === "string") {
      return inputConfig;
    }
    return inputConfig?.inputIdentifier || inputConfig?.name || null;
  }, []);

  const validateInputConfig = useCallback(
    (inputConfig, checkEnabled = true) => {
      if (!inputConfig) {
        return { valid: false, error: "Инпут не настроен" };
      }
      if (checkEnabled && inputConfig.enabled === false) {
        return { valid: false, error: "Инпут отключен" };
      }
      const inputIdentifier = getInputIdentifier(inputConfig);
      if (!inputIdentifier) {
        return { valid: false, error: "Инпут не настроен" };
      }
      return { valid: true, inputIdentifier };
    },
    [getInputIdentifier]
  );

  const normalizeColor = useCallback((color, defaultValue = "#000000") => {
    const normalizedColor = color || defaultValue;
    return normalizedColor.startsWith("#")
      ? normalizedColor
      : `#${normalizedColor}`;
  }, []);

  const updateOverlayStates = useCallback(async () => {
    try {
      if (!isVMixReady()) {
        return;
      }
      const result = await window.electronAPI.getVMixOverlayState();
      if (result.success && result.overlays) {
        setOverlayStates(result.overlays);
        if (result.inputsMap) {
          setInputsMap(result.inputsMap);
        }
      }
    } catch (error) {
      console.error("Ошибка при обновлении состояния оверлеев:", error);
    }
  }, [isVMixReady]);

  const scheduleOverlayUpdate = useCallback(() => {
    setTimeout(() => {
      updateOverlayStates();
    }, OVERLAY_UPDATE_DELAY);
  }, [updateOverlayStates]);

  // Загружаем конфигурацию vMix
  useEffect(() => {
    loadConfig();
  }, []);

  // Обновляем состояние оверлеев периодически
  useEffect(() => {
    if (vmixConfig && connectionStatus.connected) {
      const interval = setInterval(() => {
        updateOverlayStates();
      }, OVERLAY_POLL_INTERVAL);

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
        checkConnection(config.host, config.port);
      }
    } catch (error) {
      console.error("Ошибка при загрузке настроек vMix:", error);
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
        message: result.success
          ? "Подключено"
          : result.error || "Не подключено",
      });

      if (result.success) {
        updateOverlayStates();
      }
    } catch (error) {
      setConnectionStatus({
        connected: false,
        message: "Ошибка подключения",
      });
    }
  };

  /**
   * Обновляет данные в инпуте vMix
   */
  const updateInput = useCallback(
    async (inputKey, data) => {
      if (!isVMixReady()) {
        return { success: false, error: "vMix не подключен" };
      }

      try {
        const inputConfig = vmixConfig.inputs[inputKey];
        const validation = validateInputConfig(inputConfig);
        if (!validation.valid) {
          return { success: false, error: validation.error };
        }

        const result = await window.electronAPI.updateVMixInput(
          validation.inputIdentifier,
          data
        );
        return result;
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    [vmixConfig, isVMixReady, validateInputConfig]
  );

  /**
   * Показывает плашку в оверлее
   */
  const showOverlay = useCallback(
    async (inputKey) => {
      if (!isVMixReady()) {
        return { success: false, error: "vMix не подключен" };
      }

      try {
        const inputConfig = vmixConfig.inputs[inputKey];
        const validation = validateInputConfig(inputConfig);
        if (!validation.valid) {
          return { success: false, error: validation.error };
        }

        const result = await window.electronAPI.showVMixOverlay(inputKey);

        if (result.success) {
          scheduleOverlayUpdate();
        }

        return result;
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    [vmixConfig, isVMixReady, validateInputConfig, scheduleOverlayUpdate]
  );

  /**
   * Скрывает оверлей
   * Примечание: hideOverlay не проверяет enabled, так как нужно иметь возможность скрыть оверлей даже если инпут отключен
   */
  const hideOverlay = useCallback(
    async (inputKey) => {
      if (!isVMixReady()) {
        return { success: false, error: "vMix не подключен" };
      }

      try {
        const result = await window.electronAPI.hideVMixOverlay(inputKey);

        if (result.success) {
          scheduleOverlayUpdate();
        }

        return result;
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    [isVMixReady, scheduleOverlayUpdate]
  );

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
    if (!match?.sets) return 0;
    return match.sets.filter((set) => {
      if (!set.completed) return false;
      return team === "A" ? set.scoreA > set.scoreB : set.scoreB > set.scoreA;
    }).length;
  }, []);

  // Маппинг значений для полей текущего счета
  const getCurrentScoreFieldValue = useCallback(
    (fieldKey, match, setsScoreA, setsScoreB) => {
      switch (fieldKey) {
        case "teamA":
          return match.teamA?.name || "";
        case "teamB":
          return match.teamB?.name || "";
        case "scoreASet":
          return String(match.currentSet?.scoreA || 0);
        case "scoreBSet":
          return String(match.currentSet?.scoreB || 0);
        case "scoreASets":
          return String(setsScoreA);
        case "scoreBSets":
          return String(setsScoreB);
        default:
          return "";
      }
    },
    []
  );

  /**
   * Форматирует данные текущего счета для vMix в виде объекта полей
   * Возвращает объект с полями для текстовых значений и отдельный объект для полей видимости
   */
  const formatCurrentScoreData = useCallback(
    (match) => {
      if (!match) return { fields: {}, colorFields: {}, visibilityFields: {} };

      const inputConfig = vmixConfigRef.current?.inputs?.currentScore;
      if (!inputConfig?.fields) {
        return { fields: {}, colorFields: {}, visibilityFields: {} };
      }

      const fields = {};
      const colorFields = {};
      const visibilityFields = {};
      const setsScoreA = calculateSetsScore(match, "A");
      const setsScoreB = calculateSetsScore(match, "B");
      const servingTeam = match.currentSet?.servingTeam || null;

      Object.entries(inputConfig.fields).forEach(([fieldKey, fieldConfig]) => {
        if (fieldConfig.enabled === false || !fieldConfig.fieldIdentifier) {
          return;
        }

        const fieldIdentifier = fieldConfig.fieldIdentifier;

        // Обработка полей видимости
        if (
          fieldConfig.type === FIELD_TYPES.VISIBILITY &&
          (fieldKey === FIELD_KEYS.POINT_A || fieldKey === FIELD_KEYS.POINT_B)
        ) {
          const visible =
            (fieldKey === FIELD_KEYS.POINT_A && servingTeam === "A") ||
            (fieldKey === FIELD_KEYS.POINT_B && servingTeam === "B");

          visibilityFields[fieldIdentifier] = {
            visible,
            fieldConfig,
          };
          return;
        }

        // Обработка полей цвета
        if (fieldConfig.type === FIELD_TYPES.COLOR) {
          if (fieldKey === FIELD_KEYS.COLOR_A) {
            colorFields[fieldIdentifier] = normalizeColor(
              match.teamA?.color,
              "#3498db"
            );
          } else if (fieldKey === FIELD_KEYS.COLOR_B) {
            colorFields[fieldIdentifier] = normalizeColor(
              match.teamB?.color,
              "#e74c3c"
            );
          }
          return;
        }

        // Обработка текстовых полей
        const value = getCurrentScoreFieldValue(
          fieldKey,
          match,
          setsScoreA,
          setsScoreB
        );
        if (fieldIdentifier && value !== "") {
          fields[fieldIdentifier] = value;
        }
      });

      return { fields, colorFields, visibilityFields };
    },
    [calculateSetsScore, getCurrentScoreFieldValue, normalizeColor]
  );

  /**
   * Обновляет инпут текущего счета в vMix
   */
  const updateCurrentScoreInput = useCallback(
    async (match) => {
      if (!isVMixReady()) {
        return { success: false, error: "vMix не подключен" };
      }

      try {
        const inputConfig = vmixConfigRef.current.inputs?.currentScore;
        const validation = validateInputConfig(inputConfig);
        if (!validation.valid) {
          return { success: false, error: validation.error };
        }

        const { fields, colorFields, visibilityFields } =
          formatCurrentScoreData(match);

        const hasFields =
          Object.keys(fields).length > 0 ||
          Object.keys(colorFields).length > 0 ||
          Object.keys(visibilityFields).length > 0;

        if (!hasFields) {
          return { success: false, error: "Нет полей для обновления" };
        }

        const result = await window.electronAPI.updateVMixInputFields(
          validation.inputIdentifier,
          fields,
          colorFields,
          visibilityFields
        );
        return result;
      } catch (error) {
        console.error("Ошибка при обновлении текущего счета:", error);
        return { success: false, error: error.message };
      }
    },
    [isVMixReady, validateInputConfig, formatCurrentScoreData]
  );

  // Форматирует дату и время в формат ДД.ММ.ГГГГ ЧЧ:ММ
  const formatDateTime = useCallback((dateStr, timeStr) => {
    if (!dateStr) return "";

    try {
      // Парсим дату в формате YYYY-MM-DD
      const [year, month, day] = dateStr.split("-");
      if (!year || !month || !day) return dateStr; // Если формат неправильный, возвращаем как есть

      // Форматируем дату в ДД.ММ.ГГГГ
      const formattedDate = `${day}.${month}.${year}`;

      // Добавляем время, если оно есть
      if (timeStr) {
        return `${formattedDate} ${timeStr}`;
      }

      return formattedDate;
    } catch (error) {
      console.error("Ошибка при форматировании даты:", error);
      return dateStr || "";
    }
  }, []);

  // Маппинг значений для полей заявки
  const getLineupFieldValue = useCallback(
    (fieldKey, match, logoBaseUrl) => {
      switch (fieldKey) {
        case "title":
          return match.tournament || "";
        case "subtitle":
          return match.tournamentSubtitle || "";
        case FIELD_KEYS.TEAM_A_LOGO:
          return logoBaseUrl && match.teamA?.logo
            ? `${logoBaseUrl}/logo_a.png`
            : "";
        case "teamAName":
          return match.teamA?.name || "";
        case "teamACity":
          return match.teamA?.city || "";
        case FIELD_KEYS.TEAM_B_LOGO:
          return logoBaseUrl && match.teamB?.logo
            ? `${logoBaseUrl}/logo_b.png`
            : "";
        case "teamBName":
          return match.teamB?.name || "";
        case "teamBCity":
          return match.teamB?.city || "";
        case "matchDate":
          // Дата и время проведения турнира в формате ДД.ММ.ГГГГ ЧЧ:ММ
          return formatDateTime(match.date, match.time);
        case "venueLine1":
          // Место проведения (адрес)
          return match.venue || "";
        case "venueLine2":
          // Город, страна
          return match.location || "";
        default:
          return "";
      }
    },
    [formatDateTime]
  );

  /**
   * Форматирует данные заявки для vMix в виде объекта полей
   * Возвращает объект с полями для текстовых значений и отдельный объект для полей изображений
   */
  const formatLineupData = useCallback(
    async (match) => {
      if (!match) return { fields: {}, imageFields: {} };

      const inputConfig = vmixConfigRef.current?.inputs?.lineup;
      if (!inputConfig?.fields) {
        return { fields: {}, imageFields: {} };
      }

      const fields = {};
      const imageFields = {};

      // Получаем информацию о мобильном сервере для формирования URL логотипов
      let logoBaseUrl = null;
      if (window.electronAPI) {
        try {
          const serverInfo = await window.electronAPI.getMobileServerInfo();
          if (serverInfo?.ip && serverInfo?.port) {
            logoBaseUrl = `http://${serverInfo.ip}:${serverInfo.port}/logos`;
          }
        } catch (error) {
          console.error(
            "Не удалось получить информацию о мобильном сервере для логотипов:",
            error
          );
        }
      }

      // Проходим по всем полям конфигурации и формируем значения
      Object.entries(inputConfig.fields).forEach(([fieldKey, fieldConfig]) => {
        if (fieldConfig.enabled === false || !fieldConfig.fieldIdentifier) {
          return;
        }

        const fieldIdentifier = fieldConfig.fieldIdentifier;
        const value = getLineupFieldValue(fieldKey, match, logoBaseUrl);
        const isLogoField =
          fieldKey === FIELD_KEYS.TEAM_A_LOGO ||
          fieldKey === FIELD_KEYS.TEAM_B_LOGO;

        // Разделяем поля по типам
        if (fieldConfig.type === FIELD_TYPES.IMAGE) {
          if (value !== "") {
            imageFields[fieldIdentifier] = value;
          }
        } else if (fieldConfig.type === FIELD_TYPES.TEXT) {
          // Для текстовых полей отправляем значение, даже если оно пустое
          // (это позволяет очищать поля в vMix при необходимости)
          fields[fieldIdentifier] = value;

          if (isLogoField) {
            console.warn(
              `[formatLineupData] Поле ${fieldKey} имеет тип "text" вместо "image"!`,
              { fieldKey, fieldIdentifier, type: fieldConfig.type, value }
            );
          }
        }
      });

      return { fields, imageFields };
    },
    [getLineupFieldValue]
  );

  /**
   * Обновляет инпут заявки в vMix
   */
  const updateLineupInput = useCallback(
    async (match) => {
      if (!isVMixReady()) {
        return { success: false, error: "vMix не подключен" };
      }

      try {
        const inputConfig = vmixConfigRef.current.inputs?.lineup;
        const validation = validateInputConfig(inputConfig);
        if (!validation.valid) {
          return { success: false, error: validation.error };
        }

        const { fields, imageFields } = await formatLineupData(match);

        const hasFields =
          Object.keys(fields).length > 0 || Object.keys(imageFields).length > 0;

        if (!hasFields) {
          return { success: false, error: "Нет полей для обновления" };
        }

        const result = await window.electronAPI.updateVMixInputFields(
          validation.inputIdentifier,
          fields,
          {},
          {},
          imageFields
        );

        return result;
      } catch (error) {
        console.error("Ошибка при обновлении заявки:", error);
        return { success: false, error: error.message };
      }
    },
    [isVMixReady, validateInputConfig, formatLineupData]
  );

  // Инициализируем debounced функцию для обновления данных
  useEffect(() => {
    updateMatchDataDebouncedRef.current = debounce(async (matchData) => {
      const currentConfig = vmixConfigRef.current;
      const currentStatus = connectionStatusRef.current;

      if (!currentConfig || !currentStatus.connected || !matchData) {
        return;
      }

      try {
        await updateCurrentScoreInput(matchData);
        await updateLineupInput(matchData);

        // Обновляем счет по партиям
        matchData.sets?.forEach((set) => {
          if (set.completed) {
            // TODO: Реализовать для set scores позже
          }
        });

        // Обновляем статистику, если включена
        if (matchData.statistics?.enabled) {
          // TODO: Реализовать для statistics позже
        }
      } catch (error) {
        console.error("Ошибка при обновлении данных в vMix:", error);
      }
    }, DEBOUNCE_DELAY);
  }, [updateCurrentScoreInput, updateLineupInput]);

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
   * Нормализует inputIdentifier в номер инпута для сравнения
   */
  const normalizeInputIdentifier = useCallback(
    (inputIdentifier) => {
      const trimmed = inputIdentifier.trim();

      // Если это число, возвращаем как есть
      if (/^\d+$/.test(trimmed)) {
        return trimmed;
      }

      // Если это "InputN", извлекаем номер
      const inputMatch = trimmed.match(/^Input\s*(\d+)$/i);
      if (inputMatch) {
        return inputMatch[1];
      }

      // Если это имя инпута, ищем его номер в inputsMap
      const normalizedName = trimmed.toLowerCase();
      for (const [number, inputInfo] of Object.entries(inputsMap || {})) {
        const title = (inputInfo.title || "").toLowerCase();
        const shortTitle = (inputInfo.shortTitle || "").toLowerCase();

        if (
          title === normalizedName ||
          shortTitle === normalizedName ||
          title.includes(normalizedName) ||
          shortTitle.includes(normalizedName)
        ) {
          return number;
        }
      }

      return null;
    },
    [inputsMap]
  );

  /**
   * Проверяет, активна ли плашка в оверлее
   */
  const isOverlayActive = useCallback(
    (inputKey) => {
      if (!vmixConfig || !overlayStates) {
        return false;
      }

      const inputConfig = vmixConfig.inputs[inputKey];
      if (!inputConfig) {
        return false;
      }

      const inputIdentifier = getInputIdentifier(inputConfig);
      if (!inputIdentifier) {
        return false;
      }

      const overlay =
        (typeof inputConfig === "object" && inputConfig.overlay) ||
        vmixConfig.overlay ||
        1;

      const overlayState = overlayStates[overlay];
      if (!overlayState) {
        return false;
      }

      const overlayInputNumber = overlayState.input
        ? String(overlayState.input).trim()
        : null;

      const configInputNumber = normalizeInputIdentifier(inputIdentifier);

      return (
        overlayState.active === true &&
        overlayInputNumber !== null &&
        configInputNumber !== null &&
        overlayInputNumber === configInputNumber
      );
    },
    [vmixConfig, overlayStates, getInputIdentifier, normalizeInputIdentifier]
  );

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
