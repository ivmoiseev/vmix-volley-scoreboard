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
export function useVMix(_match) {
  const [vmixConfig, setVMixConfig] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    message: "Не подключено",
  });
  const [overlayStates, setOverlayStates] = useState({});
  const [inputsMap, setInputsMap] = useState({});
  const vmixConfigRef = useRef(vmixConfig);
  const updateMatchDataDebouncedRef = useRef(null);
  const connectionStatusRef = useRef(connectionStatus);

  // Кэш последних отправленных значений для каждого инпута
  // Структура: { inputKey: { fields: {}, colorFields: {}, visibilityFields: {}, imageFields: {} } }
  const lastSentValuesRef = useRef({
    currentScore: {
      fields: {},
      colorFields: {},
      visibilityFields: {},
      imageFields: {},
    },
    lineup: {
      fields: {},
      colorFields: {},
      visibilityFields: {},
      imageFields: {},
    },
    rosterTeamA: {
      fields: {},
      colorFields: {},
      visibilityFields: {},
      imageFields: {},
    },
    rosterTeamB: {
      fields: {},
      colorFields: {},
      visibilityFields: {},
      imageFields: {},
    },
    startingLineupTeamA: {
      fields: {},
      colorFields: {},
      visibilityFields: {},
      imageFields: {},
    },
    startingLineupTeamB: {
      fields: {},
      colorFields: {},
      visibilityFields: {},
      imageFields: {},
    },
    referee2: {
      fields: {},
      colorFields: {},
      visibilityFields: {},
      imageFields: {},
    },
  });

  // ID текущего матча для отслеживания смены матча
  const currentMatchIdRef = useRef(null);

  // Отслеживание активной кнопки для каждого инпута
  // Структура: { inputKey: buttonKey }
  // Например: { referee1: "coachTeamA" }
  const activeButtonRef = useRef({});

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

  /**
   * Сравнивает два значения, нормализуя их для корректного сравнения
   */
  const compareValues = useCallback((value1, value2) => {
    // Приводим к строкам для сравнения
    const str1 = String(value1 || "").trim();
    const str2 = String(value2 || "").trim();
    return str1 === str2;
  }, []);

  /**
   * Сравнивает объект visibilityFields
   */
  const compareVisibilityFields = useCallback((field1, field2) => {
    if (!field1 && !field2) return true;
    if (!field1 || !field2) return false;
    return field1.visible === field2.visible;
  }, []);

  /**
   * Фильтрует поля, оставляя только измененные
   * @param {Object} newFields - новые поля
   * @param {Object} lastSentFields - последние отправленные поля
   * @returns {Object} - объект с только измененными полями
   */
  const filterChangedFields = useCallback(
    (newFields, lastSentFields) => {
      const changed = {};
      for (const [key, value] of Object.entries(newFields)) {
        if (!compareValues(value, lastSentFields[key])) {
          changed[key] = value;
        }
      }
      return changed;
    },
    [compareValues]
  );

  /**
   * Фильтрует colorFields, оставляя только измененные
   */
  const filterChangedColorFields = useCallback(
    (newFields, lastSentFields) => {
      const changed = {};
      for (const [key, value] of Object.entries(newFields)) {
        const normalizedNew = normalizeColor(value);
        const normalizedLast = normalizeColor(lastSentFields[key]);
        if (normalizedNew !== normalizedLast) {
          changed[key] = normalizedNew;
        }
      }
      return changed;
    },
    [normalizeColor]
  );

  /**
   * Фильтрует visibilityFields, оставляя только измененные
   */
  const filterChangedVisibilityFields = useCallback(
    (newFields, lastSentFields) => {
      const changed = {};
      for (const [key, value] of Object.entries(newFields)) {
        if (!compareVisibilityFields(value, lastSentFields[key])) {
          changed[key] = value;
        }
      }
      return changed;
    },
    [compareVisibilityFields]
  );

  /**
   * Фильтрует imageFields, оставляя только измененные
   */
  const filterChangedImageFields = useCallback(
    (newFields, lastSentFields) => {
      const changed = {};
      for (const [key, value] of Object.entries(newFields)) {
        if (!compareValues(value, lastSentFields[key])) {
          changed[key] = value;
        }
      }
      return changed;
    },
    [compareValues]
  );

  /**
   * Сбрасывает кэш для указанного инпута или всех инпутов
   */
  const resetLastSentValues = useCallback((inputKey = null) => {
    if (inputKey) {
      lastSentValuesRef.current[inputKey] = {
        fields: {},
        colorFields: {},
        visibilityFields: {},
        imageFields: {},
      };
    } else {
      lastSentValuesRef.current = {
        currentScore: {
          fields: {},
          colorFields: {},
          visibilityFields: {},
          imageFields: {},
        },
        lineup: {
          fields: {},
          colorFields: {},
          visibilityFields: {},
          imageFields: {},
        },
        rosterTeamA: {
          fields: {},
          colorFields: {},
          visibilityFields: {},
          imageFields: {},
        },
        rosterTeamB: {
          fields: {},
          colorFields: {},
          visibilityFields: {},
          imageFields: {},
        },
        startingLineupTeamA: {
          fields: {},
          colorFields: {},
          visibilityFields: {},
          imageFields: {},
        },
        startingLineupTeamB: {
          fields: {},
          colorFields: {},
          visibilityFields: {},
          imageFields: {},
        },
        referee2: {
          fields: {},
          colorFields: {},
          visibilityFields: {},
          imageFields: {},
        },
      };
    }
  }, []);

  /**
   * Сбрасывает кэш только для imageFields (используется при смене команд для принудительного обновления логотипов)
   */
  const resetImageFieldsCache = useCallback(() => {
    // Сбрасываем imageFields для всех инпутов, которые могут содержать логотипы
    if (lastSentValuesRef.current.lineup) {
      lastSentValuesRef.current.lineup.imageFields = {};
    }
    if (lastSentValuesRef.current.rosterTeamA) {
      lastSentValuesRef.current.rosterTeamA.imageFields = {};
    }
    if (lastSentValuesRef.current.rosterTeamB) {
      lastSentValuesRef.current.rosterTeamB.imageFields = {};
    }
    if (lastSentValuesRef.current.startingLineupTeamA) {
      lastSentValuesRef.current.startingLineupTeamA.imageFields = {};
    }
    if (lastSentValuesRef.current.startingLineupTeamB) {
      lastSentValuesRef.current.startingLineupTeamB.imageFields = {};
    }
  }, []);

  /**
   * Обновляет кэш для указанного инпута
   */
  const updateLastSentValues = useCallback(
    (inputKey, fields, colorFields, visibilityFields, imageFields) => {
      if (!lastSentValuesRef.current[inputKey]) {
        lastSentValuesRef.current[inputKey] = {
          fields: {},
          colorFields: {},
          visibilityFields: {},
          imageFields: {},
        };
      }

      // Обновляем только те поля, которые были отправлены
      if (fields) {
        lastSentValuesRef.current[inputKey].fields = {
          ...lastSentValuesRef.current[inputKey].fields,
          ...fields,
        };
      }
      if (colorFields) {
        lastSentValuesRef.current[inputKey].colorFields = {
          ...lastSentValuesRef.current[inputKey].colorFields,
          ...colorFields,
        };
      }
      if (visibilityFields) {
        lastSentValuesRef.current[inputKey].visibilityFields = {
          ...lastSentValuesRef.current[inputKey].visibilityFields,
          ...visibilityFields,
        };
      }
      if (imageFields) {
        lastSentValuesRef.current[inputKey].imageFields = {
          ...lastSentValuesRef.current[inputKey].imageFields,
          ...imageFields,
        };
      }
    },
    []
  );

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
        // Очищаем активные кнопки для инпутов, которые стали неактивными
        // Обрабатываем инпуты, активированные через vMix напрямую
        const currentConfig = vmixConfigRef.current;
        if (currentConfig && currentConfig.inputs && result.inputsMap) {
          const tempInputsMap = result.inputsMap;

          // Проверяем все инпуты в конфигурации
          for (const [inputKey, inputConfig] of Object.entries(
            currentConfig.inputs
          )) {
            if (!inputConfig) continue;

            const overlay =
              (typeof inputConfig === "object" && inputConfig.overlay) || 1;
            const overlayState = result.overlays[overlay];

            // Проверяем, активен ли оверлей
            const isOverlayActiveInVMix =
              overlayState && overlayState.active === true;

            if (!isOverlayActiveInVMix) {
              // Оверлей неактивен - очищаем активную кнопку для этого инпута
              if (activeButtonRef.current[inputKey]) {
                delete activeButtonRef.current[inputKey];
              }
            } else {
              // Оверлей активен - проверяем, активен ли именно наш инпут
              // Получаем идентификатор инпута из конфигурации
              const inputIdentifier =
                typeof inputConfig === "string"
                  ? inputConfig
                  : inputConfig.inputIdentifier || inputConfig.name;

              if (!inputIdentifier) continue;

              // Получаем номер инпута из оверлея
              const overlayInputValue = overlayState.input
                ? String(overlayState.input).trim()
                : null;

              if (!overlayInputValue) continue;

              // Функция для поиска инпута в карте (локальная копия логики из findInputInMap)
              const findInputInTempMap = (id) => {
                const trimmed = String(id).trim();
                if (/^\d+$/.test(trimmed)) {
                  return tempInputsMap[trimmed] || null;
                }
                for (const [_num, data] of Object.entries(tempInputsMap)) {
                  if (
                    data.key &&
                    data.key.toLowerCase() === trimmed.toLowerCase()
                  ) {
                    return data;
                  }
                  if (
                    data.title &&
                    data.title.toLowerCase() === trimmed.toLowerCase()
                  ) {
                    return data;
                  }
                  if (
                    data.shortTitle &&
                    data.shortTitle.toLowerCase() === trimmed.toLowerCase()
                  ) {
                    return data;
                  }
                }
                return null;
              };

              // Сравниваем инпуты по номерам
              let isOurInputActive = false;
              const overlayInputData = findInputInTempMap(overlayInputValue);
              const configInputData = findInputInTempMap(inputIdentifier);

              if (overlayInputData && configInputData) {
                isOurInputActive =
                  overlayInputData.number === configInputData.number;
              } else if (
                overlayInputValue.toLowerCase() ===
                inputIdentifier.trim().toLowerCase()
              ) {
                isOurInputActive = true;
              }

              if (!isOurInputActive) {
                // В оверлее активен другой инпут - очищаем активную кнопку
                if (activeButtonRef.current[inputKey]) {
                  delete activeButtonRef.current[inputKey];
                }
              } else {
                // Инпут активен в vMix и это именно наш инпут
                // Если активная кнопка не установлена, значит инпут был активирован через vMix напрямую
                if (!activeButtonRef.current[inputKey]) {
                  // Устанавливаем специальный маркер для обозначения внешней активации
                  activeButtonRef.current[inputKey] = "__EXTERNAL__";
                }
              }
            }
          }
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
        // Сохраняем старую конфигурацию перед обновлением для сравнения
        const oldConfig = vmixConfigRef.current;

        // Проверяем, изменилась ли конфигурация (особенно структура инпутов)
        const configChanged =
          oldConfig &&
          JSON.stringify(oldConfig.inputs) !== JSON.stringify(config.inputs);

        setVMixConfig(config);

        // Если конфигурация изменилась (особенно структура инпутов), сбрасываем кэш
        // Это важно, так как структура полей может измениться
        if (configChanged) {
          resetLastSentValues();
          // Очищаем активные кнопки при изменении конфигурации
          activeButtonRef.current = {};
        }

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
        // При переподключении сбрасываем кэш, чтобы синхронизировать данные
        resetLastSentValues();
        // Очищаем активные кнопки при переподключении
        activeButtonRef.current = {};
      }
    } catch {
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
    async (inputKey, buttonKey = null) => {
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
          // Сохраняем активную кнопку для этого инпута
          if (buttonKey) {
            activeButtonRef.current[inputKey] = buttonKey;
          }
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
   * Примечание: activeButtonRef НЕ очищается сразу, так как vMix может скрывать инпут с задержкой (анимация)
   * Состояние кнопки обновится автоматически через периодический опрос vMix API в updateOverlayStates()
   */
  const hideOverlay = useCallback(
    async (inputKey) => {
      if (!isVMixReady()) {
        return { success: false, error: "vMix не подключен" };
      }

      try {
        const result = await window.electronAPI.hideVMixOverlay(inputKey);

        if (result.success) {
          // НЕ очищаем activeButtonRef сразу - дождемся подтверждения через vMix API
          // Это важно, так как vMix может скрывать инпут с задержкой из-за анимации
          // Планируем обновление состояния через периодический опрос
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
   * @param {Object} matchData - данные матча
   * @param {boolean} forceUpdate - принудительное обновление всех полей (игнорирует кэш)
   */
  const updateMatchData = useCallback(
    (matchData, forceUpdate = false) => {
      // Проверяем, сменился ли матч (по matchId)
      if (
        matchData &&
        matchData.matchId &&
        currentMatchIdRef.current !== matchData.matchId
      ) {
        // Матч сменился - сбрасываем кэш и активные кнопки
        resetLastSentValues();
        activeButtonRef.current = {};
        currentMatchIdRef.current = matchData.matchId;
      } else if (!matchData) {
        // Матч был сброшен
        currentMatchIdRef.current = null;
        activeButtonRef.current = {};
      }

      if (updateMatchDataDebouncedRef.current) {
        updateMatchDataDebouncedRef.current(matchData, forceUpdate);
      }
    },
    [resetLastSentValues]
  );

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
        // При forceUpdate отправляем все поля, даже пустые, чтобы очистить данные в vMix
        if (fieldIdentifier) {
          fields[fieldIdentifier] = value;
        }
      });

      return { fields, colorFields, visibilityFields };
    },
    [calculateSetsScore, getCurrentScoreFieldValue, normalizeColor]
  );

  /**
   * Обновляет инпут текущего счета в vMix
   * @param {Object} match - данные матча
   * @param {boolean} forceUpdate - принудительное обновление всех полей (игнорирует кэш)
   */
  const updateCurrentScoreInput = useCallback(
    async (match, forceUpdate = false) => {
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

        // Фильтруем только измененные поля, если не forceUpdate
        let fieldsToSend = fields;
        let colorFieldsToSend = colorFields;
        let visibilityFieldsToSend = visibilityFields;

        if (!forceUpdate) {
          const lastSent = lastSentValuesRef.current.currentScore;
          fieldsToSend = filterChangedFields(fields, lastSent.fields);
          colorFieldsToSend = filterChangedColorFields(
            colorFields,
            lastSent.colorFields
          );
          visibilityFieldsToSend = filterChangedVisibilityFields(
            visibilityFields,
            lastSent.visibilityFields
          );
        }

        const hasFields =
          Object.keys(fieldsToSend).length > 0 ||
          Object.keys(colorFieldsToSend).length > 0 ||
          Object.keys(visibilityFieldsToSend).length > 0;

        // При forceUpdate всегда отправляем команды, даже если поля пустые,
        // чтобы очистить данные в vMix при открытии пустого проекта
        if (!hasFields && !forceUpdate) {
          return {
            success: true,
            skipped: true,
            message: "Нет измененных полей для обновления",
          };
        }

        const result = await window.electronAPI.updateVMixInputFields(
          validation.inputIdentifier,
          fieldsToSend,
          colorFieldsToSend,
          visibilityFieldsToSend
        );

        // Обновляем кэш только при успешной отправке
        if (result.success) {
          updateLastSentValues(
            "currentScore",
            fieldsToSend,
            colorFieldsToSend,
            visibilityFieldsToSend,
            {}
          );
        }

        return result;
      } catch (error) {
        console.error("Ошибка при обновлении текущего счета:", error);
        return { success: false, error: error.message };
      }
    },
    [
      isVMixReady,
      validateInputConfig,
      formatCurrentScoreData,
      filterChangedFields,
      filterChangedColorFields,
      filterChangedVisibilityFields,
      updateLastSentValues,
    ]
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
          // Используем logoPath из матча (с уникальным именем) или fallback на фиксированное имя
          if (logoBaseUrl && match.teamA?.logoPath) {
            // logoPath содержит относительный путь типа "logos/logo_a_1234567890.png"
            const fileName = match.teamA.logoPath.replace(/^logos\//, '');
            return `${logoBaseUrl}/${fileName}`;
          }
          // Fallback для обратной совместимости
          {
            const hasLogoA = logoBaseUrl && (
              match.teamA?.logo || 
              match.teamA?.logoBase64
            );
            return hasLogoA ? `${logoBaseUrl}/logo_a.png` : "";
          }
        case "teamAName":
          return match.teamA?.name || "";
        case "teamACity":
          return match.teamA?.city || "";
        case FIELD_KEYS.TEAM_B_LOGO:
          // Используем logoPath из матча (с уникальным именем) или fallback на фиксированное имя
          if (logoBaseUrl && match.teamB?.logoPath) {
            // logoPath содержит относительный путь типа "logos/logo_b_1234567890.png"
            const fileName = match.teamB.logoPath.replace(/^logos\//, '');
            return `${logoBaseUrl}/${fileName}`;
          }
          // Fallback для обратной совместимости
          {
            const hasLogoB = logoBaseUrl && (
              match.teamB?.logo || 
              match.teamB?.logoBase64
            );
            return hasLogoB ? `${logoBaseUrl}/logo_b.png` : "";
          }
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

  // Маппинг значений для полей состава команды
  const getRosterFieldValue = useCallback(
    (fieldKey, match, teamKey, roster, logoBaseUrl) => {
      const team = teamKey === "A" ? match.teamA : match.teamB;
      const logoFileName = teamKey === "A" ? "logo_a.png" : "logo_b.png";

      // Общие поля (из матча)
      if (fieldKey === "title") {
        return match.tournament || "";
      }
      if (fieldKey === "subtitle") {
        return match.tournamentSubtitle || "";
      }

      // Поля команды
      if (fieldKey === "teamName") {
        return team?.name || "";
      }
      if (fieldKey === "teamCity") {
        return team?.city || "";
      }
      if (fieldKey === "teamLogo") {
        // Используем logoPath из команды (с уникальным именем) или fallback на фиксированное имя
        if (logoBaseUrl && team?.logoPath) {
          // logoPath содержит относительный путь типа "logos/logo_a_1234567890.png"
          const fileName = team.logoPath.replace(/^logos\//, '');
          return `${logoBaseUrl}/${fileName}`;
        }
        // Fallback для обратной совместимости: используем фиксированное имя на основе teamKey
        const hasLogo = logoBaseUrl && (
          team?.logo || 
          team?.logoBase64
        );
        const logoUrl = hasLogo ? `${logoBaseUrl}/${logoFileName}` : "";
        
        // Логирование для отладки
        if (hasLogo) {
          console.log(`[getRosterFieldValue] teamLogo для teamKey=${teamKey}:`);
          console.log(`  team.name: ${team?.name || 'N/A'}`);
          console.log(`  team.logoPath: ${team?.logoPath || 'N/A'}`);
          console.log(`  logoFileName (fallback из teamKey): ${logoFileName}`);
          console.log(`  Сформированный URL: ${logoUrl}`);
        }
        
        return logoUrl;
      }

      // Поля игроков (player1Number, player1Name, ... player14Number, player14Name)
      const playerMatch = fieldKey.match(/^player(\d+)(Number|Name)$/);
      if (playerMatch) {
        const playerIndex = parseInt(playerMatch[1]) - 1; // Индекс в массиве (0-based)
        const fieldType = playerMatch[2]; // "Number" или "Name"

        if (!roster || !Array.isArray(roster) || playerIndex >= roster.length) {
          // Если игрока нет, возвращаем пустую строку
          return "";
        }

        const player = roster[playerIndex];
        if (!player) {
          return "";
        }

        if (fieldType === "Number") {
          return player.number ? String(player.number) : "";
        }
        if (fieldType === "Name") {
          return player.name || "";
        }
      }

      return "";
    },
    []
  );

  /**
   * Форматирует данные заявки для vMix в виде объекта полей
   * Возвращает объект с полями для текстовых значений и отдельный объект для полей изображений
   * @param {Object} match - данные матча
   * @param {boolean} forceUpdate - принудительное обновление (добавляет timestamp к URL логотипов)
   */
  const formatLineupData = useCallback(
    async (match, forceUpdate = false) => {
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
        let value = getLineupFieldValue(fieldKey, match, logoBaseUrl);
        const isLogoField =
          fieldKey === FIELD_KEYS.TEAM_A_LOGO ||
          fieldKey === FIELD_KEYS.TEAM_B_LOGO;

        // Если это поле логотипа и forceUpdate=true, добавляем timestamp к URL
        // чтобы заставить vMix перезагрузить изображение
        if (
          isLogoField &&
          fieldConfig.type === FIELD_TYPES.IMAGE &&
          value &&
          forceUpdate
        ) {
          const separator = value.includes("?") ? "&" : "?";
          value = `${value}${separator}t=${Date.now()}`;
        }

        // Разделяем поля по типам
        if (fieldConfig.type === FIELD_TYPES.IMAGE) {
          // При forceUpdate отправляем все поля изображений, даже пустые, чтобы очистить данные в vMix
          if (value !== "" || forceUpdate) {
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
   * @param {Object} match - данные матча
   * @param {boolean} forceUpdate - принудительное обновление всех полей (игнорирует кэш)
   */
  const updateLineupInput = useCallback(
    async (match, forceUpdate = false) => {
      if (!isVMixReady()) {
        return { success: false, error: "vMix не подключен" };
      }

      try {
        const inputConfig = vmixConfigRef.current.inputs?.lineup;
        const validation = validateInputConfig(inputConfig);
        if (!validation.valid) {
          return { success: false, error: validation.error };
        }

        const { fields, imageFields } = await formatLineupData(
          match,
          forceUpdate
        );

        // Фильтруем только измененные поля, если не forceUpdate
        let fieldsToSend = fields;
        let imageFieldsToSend = imageFields;

        if (!forceUpdate) {
          const lastSent = lastSentValuesRef.current.lineup;
          fieldsToSend = filterChangedFields(fields, lastSent.fields);
          imageFieldsToSend = filterChangedImageFields(
            imageFields,
            lastSent.imageFields
          );
        }

        // При forceUpdate для логотипов: сначала очищаем, затем устанавливаем новое значение
        // Это необходимо для обхода кэширования изображений в vMix
        if (forceUpdate && Object.keys(imageFieldsToSend).length > 0) {
          // Создаем объект с пустыми значениями для всех полей логотипов
          const clearImageFields = {};
          Object.keys(imageFieldsToSend).forEach((key) => {
            clearImageFields[key] = "";
          });

          // Сначала очищаем изображения
          await window.electronAPI.updateVMixInputFields(
            validation.inputIdentifier,
            {},
            {},
            {},
            clearImageFields
          );

          // Небольшая задержка для гарантии обработки очистки vMix
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const hasFields =
          Object.keys(fieldsToSend).length > 0 ||
          Object.keys(imageFieldsToSend).length > 0;

        // При forceUpdate всегда отправляем команды, даже если поля пустые,
        // чтобы очистить данные в vMix при открытии пустого проекта
        if (!hasFields && !forceUpdate) {
          return {
            success: true,
            skipped: true,
            message: "Нет измененных полей для обновления",
          };
        }

        const result = await window.electronAPI.updateVMixInputFields(
          validation.inputIdentifier,
          fieldsToSend,
          {},
          {},
          imageFieldsToSend
        );

        // Обновляем кэш только при успешной отправке
        if (result.success) {
          updateLastSentValues(
            "lineup",
            fieldsToSend,
            {},
            {},
            imageFieldsToSend
          );
        }

        return result;
      } catch (error) {
        console.error("Ошибка при обновлении заявки:", error);
        return { success: false, error: error.message };
      }
    },
    [
      isVMixReady,
      validateInputConfig,
      formatLineupData,
      filterChangedFields,
      filterChangedImageFields,
      updateLastSentValues,
    ]
  );

  /**
   * Обновляет данные тренера в инпуте referee1 (Плашка общая)
   * @param {Object} match - данные матча
   * @param {string} team - 'A' или 'B'
   * @param {string} inputKey - ключ инпута (referee1)
   * @returns {Promise<Object>} результат обновления
   */
  const updateCoachData = useCallback(
    async (match, team, inputKey = "referee1") => {
      if (!isVMixReady()) {
        return { success: false, error: "vMix не подключен" };
      }

      if (!match) {
        return { success: false, error: "Матч не загружен" };
      }

      try {
        const inputConfig = vmixConfigRef.current.inputs?.[inputKey];
        const validation = validateInputConfig(inputConfig);
        if (!validation.valid) {
          return { success: false, error: validation.error };
        }

        // Получаем имя тренера
        const coachName =
          team === "A" ? match.teamA?.coach || "" : match.teamB?.coach || "";

        if (!coachName) {
          return { success: false, error: `Тренер команды ${team} не указан` };
        }

        // Форматируем данные для полей
        const fields = {};
        const fieldsConfig = inputConfig.fields || {};

        // Находим поля name и position в конфигурации
        if (fieldsConfig.name && fieldsConfig.name.enabled) {
          fields[fieldsConfig.name.fieldIdentifier || "Name"] = coachName;
        }

        if (fieldsConfig.position && fieldsConfig.position.enabled) {
          fields[fieldsConfig.position.fieldIdentifier || "Position"] =
            "Тренер";
        }

        if (Object.keys(fields).length === 0) {
          return { success: false, error: "Поля для тренера не настроены" };
        }

        // Отправляем данные в vMix (всегда forceUpdate для тренера, так как это разовое действие)
        const result = await window.electronAPI.updateVMixInputFields(
          validation.inputIdentifier,
          fields,
          {}, // colorFields
          {}, // visibilityFields
          {} // imageFields
        );

        if (result.success) {
          console.log(
            `[updateCoachData] Данные тренера команды ${team} обновлены:`,
            fields
          );
        }

        return result;
      } catch (error) {
        console.error("Ошибка при обновлении данных тренера:", error);
        return { success: false, error: error.message };
      }
    },
    [isVMixReady, validateInputConfig]
  );

  /**
   * Обновляет данные первого судьи в инпуте referee1 (Плашка общая)
   * @param {Object} match - данные матча
   * @param {string} inputKey - ключ инпута (referee1)
   * @returns {Promise<Object>} результат обновления
   */
  const updateReferee1Data = useCallback(
    async (match, inputKey = "referee1") => {
      if (!isVMixReady()) {
        return { success: false, error: "vMix не подключен" };
      }

      if (!match) {
        return { success: false, error: "Матч не загружен" };
      }

      try {
        const inputConfig = vmixConfigRef.current.inputs?.[inputKey];
        const validation = validateInputConfig(inputConfig);
        if (!validation.valid) {
          return { success: false, error: validation.error };
        }

        // Получаем имя первого судьи
        const referee1Name = match.officials?.referee1 || "";

        if (!referee1Name) {
          return { success: false, error: "Первый судья не указан" };
        }

        // Форматируем данные для полей
        const fields = {};
        const fieldsConfig = inputConfig.fields || {};

        // Находим поля name и position в конфигурации
        if (fieldsConfig.name && fieldsConfig.name.enabled) {
          fields[fieldsConfig.name.fieldIdentifier || "Name"] = referee1Name;
        }

        if (fieldsConfig.position && fieldsConfig.position.enabled) {
          fields[fieldsConfig.position.fieldIdentifier || "Position"] =
            "Первый судья";
        }

        if (Object.keys(fields).length === 0) {
          return {
            success: false,
            error: "Поля для первого судьи не настроены",
          };
        }

        // Отправляем данные в vMix (всегда forceUpdate для первого судьи, так как это разовое действие)
        const result = await window.electronAPI.updateVMixInputFields(
          validation.inputIdentifier,
          fields,
          {}, // colorFields
          {}, // visibilityFields
          {} // imageFields
        );

        if (result.success) {
          console.log(
            `[updateReferee1Data] Данные первого судьи обновлены:`,
            fields
          );
        }

        return result;
      } catch (error) {
        console.error("Ошибка при обновлении данных первого судьи:", error);
        return { success: false, error: error.message };
      }
    },
    [isVMixReady, validateInputConfig]
  );

  /**
   * Обновляет данные второго судьи в инпуте referee1 (Плашка общая)
   * @param {Object} match - данные матча
   * @param {string} inputKey - ключ инпута (referee1)
   * @returns {Promise<Object>} результат обновления
   */
  const updateReferee2ShowData = useCallback(
    async (match, inputKey = "referee1") => {
      if (!isVMixReady()) {
        return { success: false, error: "vMix не подключен" };
      }

      if (!match) {
        return { success: false, error: "Матч не загружен" };
      }

      try {
        const inputConfig = vmixConfigRef.current.inputs?.[inputKey];
        const validation = validateInputConfig(inputConfig);
        if (!validation.valid) {
          return { success: false, error: validation.error };
        }

        // Получаем имя второго судьи
        const referee2Name = match.officials?.referee2 || "";

        if (!referee2Name) {
          return { success: false, error: "Второй судья не указан" };
        }

        // Форматируем данные для полей
        const fields = {};
        const fieldsConfig = inputConfig.fields || {};

        // Находим поля name и position в конфигурации
        if (fieldsConfig.name && fieldsConfig.name.enabled) {
          fields[fieldsConfig.name.fieldIdentifier || "Name"] = referee2Name;
        }

        if (fieldsConfig.position && fieldsConfig.position.enabled) {
          fields[fieldsConfig.position.fieldIdentifier || "Position"] =
            "Второй судья";
        }

        if (Object.keys(fields).length === 0) {
          return {
            success: false,
            error: "Поля для второго судьи не настроены",
          };
        }

        // Отправляем данные в vMix (всегда forceUpdate для второго судьи, так как это разовое действие)
        const result = await window.electronAPI.updateVMixInputFields(
          validation.inputIdentifier,
          fields,
          {}, // colorFields
          {}, // visibilityFields
          {} // imageFields
        );

        if (result.success) {
          console.log(
            `[updateReferee2ShowData] Данные второго судьи обновлены:`,
            fields
          );
        }

        return result;
      } catch (error) {
        console.error("Ошибка при обновлении данных второго судьи:", error);
        return { success: false, error: error.message };
      }
    },
    [isVMixReady, validateInputConfig]
  );

  /**
   * Обновляет данные обоих судей в инпуте referee2 (Плашка 2 судьи)
   * @param {Object} match - данные матча
   * @returns {Promise<Object>} результат обновления
   */
  const updateReferee2Data = useCallback(
    async (match, forceUpdate = false) => {
      if (!isVMixReady()) {
        return { success: false, error: "vMix не подключен" };
      }

      if (!match) {
        return { success: false, error: "Матч не загружен" };
      }

      try {
        const inputKey = "referee2";
        const inputConfig = vmixConfigRef.current.inputs?.[inputKey];
        const validation = validateInputConfig(inputConfig);
        if (!validation.valid) {
          return { success: false, error: validation.error };
        }

        // Получаем имена судей
        const referee1Name = match.officials?.referee1 || "";
        const referee2Name = match.officials?.referee2 || "";

        // Форматируем данные для полей
        const fields = {};
        const fieldsConfig = inputConfig.fields || {};

        // Находим поля referee1Name и referee2Name в конфигурации
        if (fieldsConfig.referee1Name && fieldsConfig.referee1Name.enabled) {
          fields[fieldsConfig.referee1Name.fieldIdentifier || "Referee1Name"] =
            referee1Name;
        }

        if (fieldsConfig.referee2Name && fieldsConfig.referee2Name.enabled) {
          fields[fieldsConfig.referee2Name.fieldIdentifier || "Referee2Name"] =
            referee2Name;
        }

        if (Object.keys(fields).length === 0) {
          return { success: false, error: "Поля для судей не настроены" };
        }

        // Проверяем кэш для оптимизации (если не forceUpdate)
        if (!forceUpdate) {
          const cachedValues = lastSentValuesRef.current[inputKey]?.fields || {};
          const changedFields = filterChangedFields(fields, cachedValues);

          if (Object.keys(changedFields).length === 0) {
            // Нет изменений, не отправляем
            return { success: true, skipped: true };
          }

          // Отправляем только измененные поля
          const result = await window.electronAPI.updateVMixInputFields(
            validation.inputIdentifier,
            changedFields,
            {}, // colorFields
            {}, // visibilityFields
            {} // imageFields
          );

          if (result.success) {
            // Обновляем кэш только для отправленных полей
            if (!lastSentValuesRef.current[inputKey]) {
              lastSentValuesRef.current[inputKey] = {
                fields: {},
                colorFields: {},
                visibilityFields: {},
                imageFields: {},
              };
            }
            Object.keys(changedFields).forEach((key) => {
              lastSentValuesRef.current[inputKey].fields[key] = fields[key];
            });
            console.log(
              `[updateReferee2Data] Данные судей обновлены (только измененные):`,
              changedFields
            );
          }

          return result;
        }

        // Отправляем все поля (forceUpdate)
        const result = await window.electronAPI.updateVMixInputFields(
          validation.inputIdentifier,
          fields,
          {}, // colorFields
          {}, // visibilityFields
          {} // imageFields
        );

        if (result.success) {
          // Обновляем кэш
          if (!lastSentValuesRef.current[inputKey]) {
            lastSentValuesRef.current[inputKey] = {
              fields: {},
              colorFields: {},
              visibilityFields: {},
              imageFields: {},
            };
          }
          lastSentValuesRef.current[inputKey].fields = { ...fields };
          console.log(`[updateReferee2Data] Данные судей обновлены:`, fields);
        }

        return result;
      } catch (error) {
        console.error("Ошибка при обновлении данных судей:", error);
        return { success: false, error: error.message };
      }
    },
    [isVMixReady, validateInputConfig, filterChangedFields]
  );

  /**
   * Форматирует данные состава команды для vMix в виде объекта полей
   * @param {Object} match - данные матча
   * @param {string} teamKey - 'A' или 'B'
   * @param {boolean} forceUpdate - принудительное обновление (добавляет timestamp к URL логотипов)
   * @returns {Promise<Object>} объект с полями { fields, imageFields }
   */
  const formatRosterData = useCallback(
    async (match, teamKey, forceUpdate = false) => {
      if (!match) return { fields: {}, imageFields: {} };

      const inputKey = teamKey === "A" ? "rosterTeamA" : "rosterTeamB";
      const inputConfig = vmixConfigRef.current?.inputs?.[inputKey];
      if (!inputConfig?.fields) {
        return { fields: {}, imageFields: {} };
      }

      const team = teamKey === "A" ? match.teamA : match.teamB;
      const roster = team?.roster || [];
      
      // Логирование для отладки проблемы с логотипами
      console.log(`[formatRosterData] Вызов для teamKey=${teamKey}, inputKey=${inputKey}`);
      console.log(`  team.name: ${team?.name || 'N/A'}`);
      console.log(`  team.logoPath: ${team?.logoPath || 'N/A'}`);

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
        let value = getRosterFieldValue(
          fieldKey,
          match,
          teamKey,
          roster,
          logoBaseUrl
        );
        const isLogoField = fieldKey === "teamLogo";

        // Если это поле логотипа и forceUpdate=true, добавляем timestamp к URL
        // чтобы заставить vMix перезагрузить изображение
        if (
          isLogoField &&
          fieldConfig.type === FIELD_TYPES.IMAGE &&
          value &&
          forceUpdate
        ) {
          const separator = value.includes("?") ? "&" : "?";
          value = `${value}${separator}t=${Date.now()}`;
        }

        // Разделяем поля по типам
        if (fieldConfig.type === FIELD_TYPES.IMAGE) {
          // При forceUpdate отправляем все поля изображений, даже пустые, чтобы очистить данные в vMix
          if (value !== "" || forceUpdate) {
            imageFields[fieldIdentifier] = value;
          }
        } else if (fieldConfig.type === FIELD_TYPES.TEXT) {
          // Для текстовых полей отправляем значение, даже если оно пустое
          // (это позволяет очищать поля в vMix при необходимости, например, для пустых игроков)
          fields[fieldIdentifier] = value;

          if (isLogoField) {
            console.warn(
              `[formatRosterData] Поле ${fieldKey} имеет тип "text" вместо "image"!`,
              { fieldKey, fieldIdentifier, type: fieldConfig.type, value }
            );
          }
        }
      });

      // Логирование итоговых imageFields для отладки
      if (Object.keys(imageFields).length > 0) {
        console.log(`[formatRosterData] Итоговые imageFields для teamKey=${teamKey}:`);
        Object.entries(imageFields).forEach(([fieldIdentifier, imagePath]) => {
          console.log(`  ${fieldIdentifier}: ${imagePath}`);
        });
      }

      return { fields, imageFields };
    },
    [getRosterFieldValue]
  );

  /**
   * Получает стартовый состав команды с учетом порядка из startingLineupOrder
   * @param {Object} team - данные команды
   * @returns {Array} - массив игроков стартового состава (максимум 8)
   */
  const getStartingLineup = useCallback((team) => {
    const teamRoster = team?.roster || [];
    const starters = teamRoster.filter((p) => p.isStarter);

    // Если есть сохраненный порядок, используем его
    if (
      team.startingLineupOrder &&
      Array.isArray(team.startingLineupOrder) &&
      team.startingLineupOrder.length > 0
    ) {
      // startingLineupOrder содержит индексы игроков из roster в порядке стартового состава
      const orderedStarters = team.startingLineupOrder
        .map((index) => teamRoster[index])
        .filter((player) => player && player.isStarter); // Фильтруем только стартовых

      // Добавляем стартовых игроков, которых нет в startingLineupOrder (на случай добавления новых)
      starters.forEach((player) => {
        const rosterIndex = teamRoster.findIndex(
          (p) =>
            p.number === player.number &&
            p.name === player.name &&
            p.isStarter === true
        );
        if (
          rosterIndex !== -1 &&
          !team.startingLineupOrder.includes(rosterIndex)
        ) {
          orderedStarters.push(player);
        }
      });

      // Возвращаем первые 8 игроков
      return orderedStarters.slice(0, 8);
    }

    // Если порядка нет, возвращаем стартовых игроков в порядке их появления в roster
    // Возвращаем первые 8 игроков
    return starters.slice(0, 8);
  }, []);

  /**
   * Получает значение поля для стартового состава
   * @param {string} fieldKey - ключ поля
   * @param {Object} match - данные матча
   * @param {string} teamKey - 'A' или 'B'
   * @param {Array} startingLineup - массив игроков стартового состава
   * @param {string} logoBaseUrl - базовый URL для логотипов
   * @returns {string} - значение поля
   */
  const getStartingLineupFieldValue = useCallback(
    (fieldKey, match, teamKey, startingLineup, logoBaseUrl) => {
      const team = teamKey === "A" ? match.teamA : match.teamB;
      const logoFileName = teamKey === "A" ? "logo_a.png" : "logo_b.png";

      // Общие поля (из матча) - совпадают с полными составами
      if (fieldKey === "title") {
        return match.tournament || "";
      }
      if (fieldKey === "subtitle") {
        return match.tournamentSubtitle || "";
      }

      // Поля команды - совпадают с полными составами
      if (fieldKey === "teamName") {
        return team?.name || "";
      }
      if (fieldKey === "teamCity") {
        return team?.city || "";
      }
      if (fieldKey === "teamLogo") {
        // Используем logoPath из команды (с уникальным именем) или fallback на фиксированное имя
        if (logoBaseUrl && team?.logoPath) {
          // logoPath содержит относительный путь типа "logos/logo_a_1234567890.png"
          const fileName = team.logoPath.replace(/^logos\//, '');
          return `${logoBaseUrl}/${fileName}`;
        }
        // Fallback для обратной совместимости: используем фиксированное имя на основе teamKey
        const hasLogo = logoBaseUrl && (
          team?.logo || 
          team?.logoBase64
        );
        return hasLogo ? `${logoBaseUrl}/${logoFileName}` : "";
      }

      // Поля игроков (player1Number, player1Name, player1NumberOnCard, ... player6Number, player6Name, player6NumberOnCard)
      // Берем из стартового состава (индексы 0-5 - это первые 6 игроков)
      const playerMatch = fieldKey.match(/^player(\d+)(Number|Name|NumberOnCard)$/);
      if (playerMatch) {
        const playerIndex = parseInt(playerMatch[1]) - 1; // Индекс в массиве (0-based: 1 -> 0, 2 -> 1, ..., 6 -> 5)
        const fieldType = playerMatch[2]; // "Number", "Name" или "NumberOnCard"

        // Проверяем, что номер игрока не больше 6 (т.к. 7 и 8 теперь либеро)
        if (playerIndex >= 6) {
          return "";
        }

        if (
          !startingLineup ||
          !Array.isArray(startingLineup) ||
          playerIndex >= startingLineup.length
        ) {
          // Если игрока нет, возвращаем пустую строку
          return "";
        }

        const player = startingLineup[playerIndex];
        if (!player) {
          return "";
        }

        if (fieldType === "Number") {
          return player.number ? String(player.number) : "";
        }
        if (fieldType === "Name") {
          return player.name || "";
        }
        if (fieldType === "NumberOnCard") {
          // Поле "Номер на карте" берем из player.numberOnCard, если оно есть, иначе используем обычный номер
          return player.numberOnCard ? String(player.numberOnCard) : (player.number ? String(player.number) : "");
        }
      }

      // Поля либеро (libero1Number, libero1Name, libero1NumberOnCard, libero2Number, libero2Name, libero2NumberOnCard)
      // Берем из стартового состава (индексы 6 и 7 - это либеро 1 и либеро 2)
      const liberoMatch = fieldKey.match(/^libero(\d+)(Number|Name|NumberOnCard)$/);
      if (liberoMatch) {
        const liberoIndex = parseInt(liberoMatch[1]) - 1; // Индекс либеро (0-based: 0 = libero1, 1 = libero2)
        const fieldType = liberoMatch[2]; // "Number", "Name" или "NumberOnCard"

        // Либеро 1 находится на индексе 6, либеро 2 на индексе 7 в стартовом составе
        const startingLineupIndex = liberoIndex + 6; // 0 -> 6, 1 -> 7

        if (
          !startingLineup ||
          !Array.isArray(startingLineup) ||
          startingLineupIndex >= startingLineup.length
        ) {
          // Если либеро нет в стартовом составе, возвращаем пустую строку
          return "";
        }

        const libero = startingLineup[startingLineupIndex];
        if (!libero) {
          return "";
        }

        if (fieldType === "Number") {
          return libero.number ? String(libero.number) : "";
        }
        if (fieldType === "Name") {
          return libero.name || "";
        }
        if (fieldType === "NumberOnCard") {
          // Поле "Номер на карте" берем из libero.numberOnCard, если оно есть, иначе используем обычный номер
          return libero.numberOnCard ? String(libero.numberOnCard) : (libero.number ? String(libero.number) : "");
        }
      }

      return "";
    },
    []
  );

  /**
   * Форматирует данные стартового состава для vMix в виде объекта полей
   * @param {Object} match - данные матча
   * @param {string} teamKey - 'A' или 'B'
   * @param {boolean} forceUpdate - принудительное обновление (добавляет timestamp к URL логотипов)
   * @returns {Object} - объект с полями { fields, imageFields }
   */
  const formatStartingLineupData = useCallback(
    async (match, teamKey, forceUpdate = false) => {
      if (!match) return { fields: {}, imageFields: {} };

      const inputKey =
        teamKey === "A" ? "startingLineupTeamA" : "startingLineupTeamB";
      const inputConfig = vmixConfigRef.current?.inputs?.[inputKey];
      if (!inputConfig?.fields) {
        return { fields: {}, imageFields: {} };
      }

      const team = teamKey === "A" ? match.teamA : match.teamB;
      const startingLineup = getStartingLineup(team);

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
        let value = getStartingLineupFieldValue(
          fieldKey,
          match,
          teamKey,
          startingLineup,
          logoBaseUrl
        );
        const isLogoField = fieldKey === "teamLogo";

        // Если это поле логотипа и forceUpdate=true, добавляем timestamp к URL
        // чтобы заставить vMix перезагрузить изображение
        if (
          isLogoField &&
          fieldConfig.type === FIELD_TYPES.IMAGE &&
          value &&
          forceUpdate
        ) {
          const separator = value.includes("?") ? "&" : "?";
          value = `${value}${separator}t=${Date.now()}`;
        }

        // Разделяем поля по типам
        if (fieldConfig.type === FIELD_TYPES.IMAGE) {
          // При forceUpdate отправляем все поля изображений, даже пустые, чтобы очистить данные в vMix
          if (value !== "" || forceUpdate) {
            imageFields[fieldIdentifier] = value;
          }
        } else if (fieldConfig.type === FIELD_TYPES.TEXT) {
          // Для текстовых полей отправляем значение, даже если оно пустое
          fields[fieldIdentifier] = value;

          if (isLogoField) {
            console.warn(
              `[formatStartingLineupData] Поле ${fieldKey} имеет тип "text" вместо "image"!`,
              { fieldKey, fieldIdentifier, type: fieldConfig.type, value }
            );
          }
        }
      });

      return { fields, imageFields };
    },
    [getStartingLineup, getStartingLineupFieldValue]
  );

  /**
   * Обновляет инпут стартового состава команды А в vMix
   * @param {Object} match - данные матча
   * @param {boolean} forceUpdate - принудительное обновление всех полей (игнорирует кэш)
   */
  const updateStartingLineupTeamAInput = useCallback(
    async (match, forceUpdate = false) => {
      if (!isVMixReady()) {
        return { success: false, error: "vMix не подключен" };
      }

      try {
        const inputConfig = vmixConfigRef.current.inputs?.startingLineupTeamA;
        const validation = validateInputConfig(inputConfig);
        if (!validation.valid) {
          return { success: false, error: validation.error };
        }

        const { fields, imageFields } = await formatStartingLineupData(
          match,
          "A",
          forceUpdate
        );

        // Фильтруем только измененные поля, если не forceUpdate
        let fieldsToSend = fields;
        let imageFieldsToSend = imageFields;

        if (!forceUpdate) {
          const lastSent = lastSentValuesRef.current.startingLineupTeamA;
          fieldsToSend = filterChangedFields(fields, lastSent.fields);
          imageFieldsToSend = filterChangedImageFields(
            imageFields,
            lastSent.imageFields
          );
        }

        // При forceUpdate для логотипов: сначала очищаем, затем устанавливаем новое значение
        // Это необходимо для обхода кэширования изображений в vMix
        if (forceUpdate && Object.keys(imageFieldsToSend).length > 0) {
          // Создаем объект с пустыми значениями для всех полей логотипов
          const clearImageFields = {};
          Object.keys(imageFieldsToSend).forEach((key) => {
            clearImageFields[key] = "";
          });

          // Сначала очищаем изображения
          await window.electronAPI.updateVMixInputFields(
            validation.inputIdentifier,
            {},
            {},
            {},
            clearImageFields
          );

          // Небольшая задержка для гарантии обработки очистки vMix
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const hasFields =
          Object.keys(fieldsToSend).length > 0 ||
          Object.keys(imageFieldsToSend).length > 0;

        // При forceUpdate всегда отправляем команды, даже если поля пустые,
        // чтобы очистить данные в vMix при открытии пустого проекта
        if (!hasFields && !forceUpdate) {
          return {
            success: true,
            skipped: true,
            message: "Нет измененных полей для обновления",
          };
        }

        const result = await window.electronAPI.updateVMixInputFields(
          validation.inputIdentifier,
          fieldsToSend,
          {},
          {},
          imageFieldsToSend
        );

        // Обновляем кэш только при успешной отправке
        if (result.success) {
          updateLastSentValues(
            "startingLineupTeamA",
            fieldsToSend,
            {},
            {},
            imageFieldsToSend
          );
        }

        return result;
      } catch (error) {
        console.error(
          "Ошибка при обновлении стартового состава команды А:",
          error
        );
        return { success: false, error: error.message };
      }
    },
    [
      isVMixReady,
      validateInputConfig,
      formatStartingLineupData,
      filterChangedFields,
      filterChangedImageFields,
      updateLastSentValues,
    ]
  );

  /**
   * Обновляет инпут стартового состава команды Б в vMix
   * @param {Object} match - данные матча
   * @param {boolean} forceUpdate - принудительное обновление всех полей (игнорирует кэш)
   */
  const updateStartingLineupTeamBInput = useCallback(
    async (match, forceUpdate = false) => {
      if (!isVMixReady()) {
        return { success: false, error: "vMix не подключен" };
      }

      try {
        const inputConfig = vmixConfigRef.current.inputs?.startingLineupTeamB;
        const validation = validateInputConfig(inputConfig);
        if (!validation.valid) {
          return { success: false, error: validation.error };
        }

        const { fields, imageFields } = await formatStartingLineupData(
          match,
          "B",
          forceUpdate
        );

        // Фильтруем только измененные поля, если не forceUpdate
        let fieldsToSend = fields;
        let imageFieldsToSend = imageFields;

        if (!forceUpdate) {
          const lastSent = lastSentValuesRef.current.startingLineupTeamB;
          fieldsToSend = filterChangedFields(fields, lastSent.fields);
          imageFieldsToSend = filterChangedImageFields(
            imageFields,
            lastSent.imageFields
          );
        }

        // При forceUpdate для логотипов: сначала очищаем, затем устанавливаем новое значение
        // Это необходимо для обхода кэширования изображений в vMix
        if (forceUpdate && Object.keys(imageFieldsToSend).length > 0) {
          // Создаем объект с пустыми значениями для всех полей логотипов
          const clearImageFields = {};
          Object.keys(imageFieldsToSend).forEach((key) => {
            clearImageFields[key] = "";
          });

          // Сначала очищаем изображения
          await window.electronAPI.updateVMixInputFields(
            validation.inputIdentifier,
            {},
            {},
            {},
            clearImageFields
          );

          // Небольшая задержка для гарантии обработки очистки vMix
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const hasFields =
          Object.keys(fieldsToSend).length > 0 ||
          Object.keys(imageFieldsToSend).length > 0;

        // При forceUpdate всегда отправляем команды, даже если поля пустые,
        // чтобы очистить данные в vMix при открытии пустого проекта
        if (!hasFields && !forceUpdate) {
          return {
            success: true,
            skipped: true,
            message: "Нет измененных полей для обновления",
          };
        }

        const result = await window.electronAPI.updateVMixInputFields(
          validation.inputIdentifier,
          fieldsToSend,
          {},
          {},
          imageFieldsToSend
        );

        // Обновляем кэш только при успешной отправке
        if (result.success) {
          updateLastSentValues(
            "startingLineupTeamB",
            fieldsToSend,
            {},
            {},
            imageFieldsToSend
          );
        }

        return result;
      } catch (error) {
        console.error(
          "Ошибка при обновлении стартового состава команды Б:",
          error
        );
        return { success: false, error: error.message };
      }
    },
    [
      isVMixReady,
      validateInputConfig,
      formatStartingLineupData,
      filterChangedFields,
      filterChangedImageFields,
      updateLastSentValues,
    ]
  );

  /**
   * Обновляет инпут состава команды А в vMix
   * @param {Object} match - данные матча
   * @param {boolean} forceUpdate - принудительное обновление всех полей (игнорирует кэш)
   */
  const updateRosterTeamAInput = useCallback(
    async (match, forceUpdate = false) => {
      if (!isVMixReady()) {
        return { success: false, error: "vMix не подключен" };
      }

      try {
        const inputConfig = vmixConfigRef.current.inputs?.rosterTeamA;
        const validation = validateInputConfig(inputConfig);
        if (!validation.valid) {
          return { success: false, error: validation.error };
        }

        const { fields, imageFields } = await formatRosterData(
          match,
          "A",
          forceUpdate
        );
        
        // Логирование для отладки проблемы с логотипами
        if (Object.keys(imageFields).length > 0) {
          console.log('[updateRosterTeamAInput] Логотипы для команды A:');
          Object.entries(imageFields).forEach(([fieldName, imagePath]) => {
            console.log(`  ${fieldName}: ${imagePath}`);
            if (imagePath && imagePath.includes('logo')) {
              console.log(`    [DEBUG] teamKey=A, ожидаемый файл: logo_a.png, URL содержит: ${imagePath.includes('logo_a.png') ? 'logo_a.png ✓' : imagePath.includes('logo_b.png') ? 'logo_b.png ✗ ОШИБКА!' : 'неизвестно'}`);
            }
          });
        }

        // Фильтруем только измененные поля, если не forceUpdate
        let fieldsToSend = fields;
        let imageFieldsToSend = imageFields;

        if (!forceUpdate) {
          const lastSent = lastSentValuesRef.current.rosterTeamA;
          fieldsToSend = filterChangedFields(fields, lastSent.fields);
          imageFieldsToSend = filterChangedImageFields(
            imageFields,
            lastSent.imageFields
          );
        }

        // При forceUpdate для логотипов: сначала очищаем, затем устанавливаем новое значение
        // Это необходимо для обхода кэширования изображений в vMix
        if (forceUpdate && Object.keys(imageFieldsToSend).length > 0) {
          // Создаем объект с пустыми значениями для всех полей логотипов
          const clearImageFields = {};
          Object.keys(imageFieldsToSend).forEach((key) => {
            clearImageFields[key] = "";
          });

          // Сначала очищаем изображения
          await window.electronAPI.updateVMixInputFields(
            validation.inputIdentifier,
            {},
            {},
            {},
            clearImageFields
          );

          // Небольшая задержка для гарантии обработки очистки vMix
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const hasFields =
          Object.keys(fieldsToSend).length > 0 ||
          Object.keys(imageFieldsToSend).length > 0;

        // При forceUpdate всегда отправляем команды, даже если поля пустые,
        // чтобы очистить данные в vMix при открытии пустого проекта
        if (!hasFields && !forceUpdate) {
          return {
            success: true,
            skipped: true,
            message: "Нет измененных полей для обновления",
          };
        }

        const result = await window.electronAPI.updateVMixInputFields(
          validation.inputIdentifier,
          fieldsToSend,
          {},
          {},
          imageFieldsToSend
        );

        // Обновляем кэш только при успешной отправке
        if (result.success) {
          updateLastSentValues(
            "rosterTeamA",
            fieldsToSend,
            {},
            {},
            imageFieldsToSend
          );
        }

        return result;
      } catch (error) {
        console.error("Ошибка при обновлении состава команды А:", error);
        return { success: false, error: error.message };
      }
    },
    [
      isVMixReady,
      validateInputConfig,
      formatRosterData,
      filterChangedFields,
      filterChangedImageFields,
      updateLastSentValues,
    ]
  );

  /**
   * Обновляет инпут состава команды Б в vMix
   * @param {Object} match - данные матча
   * @param {boolean} forceUpdate - принудительное обновление всех полей (игнорирует кэш)
   */
  const updateRosterTeamBInput = useCallback(
    async (match, forceUpdate = false) => {
      if (!isVMixReady()) {
        return { success: false, error: "vMix не подключен" };
      }

      try {
        const inputConfig = vmixConfigRef.current.inputs?.rosterTeamB;
        const validation = validateInputConfig(inputConfig);
        if (!validation.valid) {
          return { success: false, error: validation.error };
        }

        const { fields, imageFields } = await formatRosterData(
          match,
          "B",
          forceUpdate
        );
        
        // Логирование для отладки проблемы с логотипами
        if (Object.keys(imageFields).length > 0) {
          console.log('[updateRosterTeamBInput] Логотипы для команды B:');
          Object.entries(imageFields).forEach(([fieldName, imagePath]) => {
            console.log(`  ${fieldName}: ${imagePath}`);
            if (imagePath && imagePath.includes('logo')) {
              console.log(`    [DEBUG] teamKey=B, ожидаемый файл: logo_b.png, URL содержит: ${imagePath.includes('logo_b.png') ? 'logo_b.png ✓' : imagePath.includes('logo_a.png') ? 'logo_a.png ✗ ОШИБКА!' : 'неизвестно'}`);
            }
          });
        }

        // Фильтруем только измененные поля, если не forceUpdate
        let fieldsToSend = fields;
        let imageFieldsToSend = imageFields;

        if (!forceUpdate) {
          const lastSent = lastSentValuesRef.current.rosterTeamB;
          fieldsToSend = filterChangedFields(fields, lastSent.fields);
          imageFieldsToSend = filterChangedImageFields(
            imageFields,
            lastSent.imageFields
          );
        }

        // При forceUpdate для логотипов: сначала очищаем, затем устанавливаем новое значение
        // Это необходимо для обхода кэширования изображений в vMix
        if (forceUpdate && Object.keys(imageFieldsToSend).length > 0) {
          // Создаем объект с пустыми значениями для всех полей логотипов
          const clearImageFields = {};
          Object.keys(imageFieldsToSend).forEach((key) => {
            clearImageFields[key] = "";
          });

          // Сначала очищаем изображения
          await window.electronAPI.updateVMixInputFields(
            validation.inputIdentifier,
            {},
            {},
            {},
            clearImageFields
          );

          // Небольшая задержка для гарантии обработки очистки vMix
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const hasFields =
          Object.keys(fieldsToSend).length > 0 ||
          Object.keys(imageFieldsToSend).length > 0;

        // При forceUpdate всегда отправляем команды, даже если поля пустые,
        // чтобы очистить данные в vMix при открытии пустого проекта
        if (!hasFields && !forceUpdate) {
          return {
            success: true,
            skipped: true,
            message: "Нет измененных полей для обновления",
          };
        }

        const result = await window.electronAPI.updateVMixInputFields(
          validation.inputIdentifier,
          fieldsToSend,
          {},
          {},
          imageFieldsToSend
        );

        // Обновляем кэш только при успешной отправке
        if (result.success) {
          updateLastSentValues(
            "rosterTeamB",
            fieldsToSend,
            {},
            {},
            imageFieldsToSend
          );
        }

        return result;
      } catch (error) {
        console.error("Ошибка при обновлении состава команды Б:", error);
        return { success: false, error: error.message };
      }
    },
    [
      isVMixReady,
      validateInputConfig,
      formatRosterData,
      filterChangedFields,
      filterChangedImageFields,
      updateLastSentValues,
    ]
  );

  // Инициализируем debounced функцию для обновления данных
  useEffect(() => {
    updateMatchDataDebouncedRef.current = debounce(
      async (matchData, forceUpdate = false) => {
        const currentConfig = vmixConfigRef.current;
        const currentStatus = connectionStatusRef.current;

        if (!currentConfig || !currentStatus.connected || !matchData) {
          return;
        }

        try {
          await updateCurrentScoreInput(matchData, forceUpdate);
          await updateLineupInput(matchData, forceUpdate);

          // Обновляем составы команд
          await updateRosterTeamAInput(matchData, forceUpdate);
          await updateRosterTeamBInput(matchData, forceUpdate);

          // Обновляем стартовые составы команд
          await updateStartingLineupTeamAInput(matchData, forceUpdate);
          await updateStartingLineupTeamBInput(matchData, forceUpdate);

          // Обновляем данные судей в "Плашка 2 судьи"
          await updateReferee2Data(matchData, forceUpdate);

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
      },
      DEBOUNCE_DELAY
    );
  }, [
    updateCurrentScoreInput,
    updateLineupInput,
    updateRosterTeamAInput,
    updateRosterTeamBInput,
    updateStartingLineupTeamAInput,
    updateStartingLineupTeamBInput,
    updateReferee2Data,
  ]);

  // Неиспользуемые функции оставлены для возможного будущего использования
  // eslint-disable-next-line unused-imports/no-unused-vars
  const formatSetScoreData = (_match, _set) => {
    return JSON.stringify({
      teamA: _match.teamA.name,
      teamB: _match.teamB.name,
      setNumber: _set.setNumber,
      scoreA: _set.scoreA,
      scoreB: _set.scoreB,
    });
  };

  // eslint-disable-next-line unused-imports/no-unused-vars
  const formatStatisticsData = (_match) => {
    return JSON.stringify({
      teamA: {
        name: _match.teamA.name,
        attack: _match.statistics.teamA.attack,
        block: _match.statistics.teamA.block,
        serve: _match.statistics.teamA.serve,
        opponentErrors: _match.statistics.teamA.opponentErrors,
      },
      teamB: {
        name: _match.teamB.name,
        attack: _match.statistics.teamB.attack,
        block: _match.statistics.teamB.block,
        serve: _match.statistics.teamB.serve,
        opponentErrors: _match.statistics.teamB.opponentErrors,
      },
    });
  };

  /**
   * Находит инпут в inputsMap по идентификатору (номер, ID или имя)
   * Возвращает объект с информацией об инпуте или null, если не найден
   */
  const findInputInMap = useCallback(
    (inputIdentifier) => {
      if (
        !inputIdentifier ||
        !inputsMap ||
        Object.keys(inputsMap).length === 0
      ) {
        return null;
      }

      const trimmed = inputIdentifier.trim();

      // 1. Если это число (порядковый номер) - ищем напрямую
      if (/^\d+$/.test(trimmed)) {
        const inputData = inputsMap[trimmed];
        if (inputData) {
          return {
            number: inputData.number,
            key: inputData.key,
            title: inputData.title,
            shortTitle: inputData.shortTitle,
            type: inputData.type,
          };
        }
        return null;
      }

      // 2. Если это ID инпута (key) - ищем по key
      for (const [_number, inputData] of Object.entries(inputsMap)) {
        if (
          inputData.key &&
          inputData.key.toLowerCase() === trimmed.toLowerCase()
        ) {
          return {
            number: inputData.number,
            key: inputData.key,
            title: inputData.title,
            shortTitle: inputData.shortTitle,
            type: inputData.type,
          };
        }
      }

      // 3. Если это имя инпута (title или shortTitle) - ищем по имени
      const normalizedName = trimmed.toLowerCase();
      for (const [_number, inputData] of Object.entries(inputsMap)) {
        const title = (inputData.title || "").toLowerCase();
        const shortTitle = (inputData.shortTitle || "").toLowerCase();

        // Точное совпадение
        if (title === normalizedName || shortTitle === normalizedName) {
          return {
            number: inputData.number,
            key: inputData.key,
            title: inputData.title,
            shortTitle: inputData.shortTitle,
            type: inputData.type,
          };
        }

        // Также проверяем, если имя содержит расширение (например, ".gtzip")
        // и совпадает с именем без расширения
        if (normalizedName.includes(".")) {
          const nameWithoutExt = normalizedName.split(".")[0];
          if (nameWithoutExt === title || nameWithoutExt === shortTitle) {
            return {
              number: inputData.number,
              key: inputData.key,
              title: inputData.title,
              shortTitle: inputData.shortTitle,
              type: inputData.type,
            };
          }
        }
      }

      // 4. Если ничего не найдено, возвращаем null
      // НЕ извлекаем номер из "Input3" - это неправильно,
      // потому что "Input3" и "3" - это разные способы обращения к инпуту в vMix
      return null;
    },
    [inputsMap]
  );

  /**
   * Проверяет, активна ли плашка в оверлее
   * @param {string} inputKey - ключ инпута
   * @param {string} buttonKey - ключ кнопки (опционально, для кнопок, использующих один инпут)
   * @returns {boolean} true если плашка активна и buttonKey соответствует активной кнопке
   */
  const isOverlayActive = useCallback(
    (inputKey, buttonKey = null) => {
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

      // Если оверлей неактивен, плашка не активна
      if (overlayState.active !== true) {
        // Если оверлей неактивен, очищаем активную кнопку для этого инпута
        if (activeButtonRef.current[inputKey]) {
          delete activeButtonRef.current[inputKey];
        }
        return false;
      }

      const overlayInputValue = overlayState.input
        ? String(overlayState.input).trim()
        : null;

      if (!overlayInputValue) {
        return false;
      }

      // vMix API возвращает в оверлее порядковый номер инпута (например, "3")
      // В конфиге может быть указан:
      // - Порядковый номер: "3"
      // - ID инпута (key): "some-uuid"
      // - Имя инпута: "Zayavka2024-2.gtzip"
      // НЕ используем формат "Input3" как идентификатор - это некорректно

      // Сначала проверяем точное совпадение исходных идентификаторов
      const normalizedConfig = inputIdentifier.trim().toLowerCase();
      const normalizedOverlay = overlayInputValue.toLowerCase();

      let isInputActive = false;
      if (normalizedConfig === normalizedOverlay) {
        isInputActive = true;
      } else {
        const trimmedIdentifier = inputIdentifier.trim();

        // Проверяем, является ли overlayInputValue порядковым номером (из vMix API)
        const isOverlayNumber = /^\d+$/.test(overlayInputValue);

        if (isOverlayNumber) {
          // vMix API вернул номер инпута в оверлее
          // Найдем инпут с этим номером в inputsMap
          const overlayInputData = inputsMap && inputsMap[overlayInputValue];

          if (overlayInputData) {
            // Теперь найдем инпут из конфига в inputsMap
            const configInputData = findInputInMap(trimmedIdentifier);

            if (configInputData) {
              // Сравниваем номера инпутов - если они совпадают, это один и тот же инпут
              isInputActive =
                configInputData.number === overlayInputData.number;
            }
          }
        } else {
          // Если в оверлее не число (нестандартный случай)
          // Найдем оба инпута в inputsMap и сравним их номера
          const overlayInputData = findInputInMap(overlayInputValue);
          const configInputData = findInputInMap(trimmedIdentifier);

          if (overlayInputData && configInputData) {
            // Сравниваем номера инпутов
            isInputActive = overlayInputData.number === configInputData.number;
          }
        }
      }

      // Если инпут неактивен, очищаем активную кнопку
      if (!isInputActive) {
        if (activeButtonRef.current[inputKey]) {
          delete activeButtonRef.current[inputKey];
        }
        return false;
      }

      // Если инпут активен, проверяем, соответствует ли buttonKey активной кнопке
      if (buttonKey !== null) {
        // Для кнопок, использующих один инпут, проверяем активную кнопку
        let activeButton = activeButtonRef.current[inputKey];

        // Если активная кнопка имеет специальное значение '__EXTERNAL__',
        // значит инпут был активирован через vMix напрямую
        // В этом случае устанавливаем текущую кнопку как активную при первом вызове
        // Используем атомарную проверку для предотвращения гонки условий
        if (activeButton === "__EXTERNAL__") {
          // Атомарно устанавливаем buttonKey как активную кнопку только если она еще '__EXTERNAL__'
          activeButtonRef.current[inputKey] = buttonKey;
          activeButton = buttonKey;
        }

        // Если активная кнопка не установлена (undefined или null), но инпут активен в vMix,
        // значит это первый раз, когда мы проверяем этот инпут после активации через vMix
        // Устанавливаем текущую кнопку как активную
        // Это может произойти, если updateOverlayStates еще не успел установить '__EXTERNAL__'
        if (
          (activeButton === undefined || activeButton === null) &&
          isInputActive
        ) {
          // Двойная проверка для атомарности (избегаем гонки условий)
          // Если между проверками другая кнопка установилась, используем её
          const currentActive = activeButtonRef.current[inputKey];
          if (
            currentActive === undefined ||
            currentActive === null ||
            currentActive === "__EXTERNAL__"
          ) {
            activeButtonRef.current[inputKey] = buttonKey;
            activeButton = buttonKey;
          } else {
            // Другая кнопка уже установилась - используем её
            activeButton = currentActive;
          }
        }

        // Обновляем локальную переменную после возможных изменений
        activeButton = activeButtonRef.current[inputKey];

        // Если активная кнопка все еще не установлена или имеет маркер внешней активации, возвращаем false
        if (
          activeButton === undefined ||
          activeButton === null ||
          activeButton === "__EXTERNAL__"
        ) {
          return false;
        }

        return activeButton === buttonKey;
      }

      // Если buttonKey не указан, возвращаем статус активности инпута
      // Но это используется только для внутренних проверок
      return true;
    },
    [vmixConfig, overlayStates, getInputIdentifier, findInputInMap, inputsMap]
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
    resetImageFieldsCache,
    updateCoachData,
    updateReferee1Data,
    updateReferee2ShowData,
    updateReferee2Data,
  };
}
