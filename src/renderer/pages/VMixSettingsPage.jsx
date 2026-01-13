import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getFullFieldName } from "../utils/vmix-field-utils";
import { useHeaderButtons } from "../components/Layout";

function VMixSettingsPage() {
  const navigate = useNavigate();
  const { setButtons } = useHeaderButtons();
  const [config, setConfig] = useState({
    host: "localhost",
    port: 8088,
    inputs: {
      lineup: { name: "Input1", overlay: 1 },
      statistics: { name: "Input2", overlay: 1 },
      rosterTeamA: { name: "Input3", overlay: 1 },
      rosterTeamB: { name: "Input4", overlay: 1 },
      startingLineupTeamA: { name: "Input5", overlay: 1 },
      startingLineupTeamB: { name: "Input6", overlay: 1 },
      currentScore: { name: "Input7", overlay: 1 },
      set1Score: { name: "Input8", overlay: 1 },
      set2Score: { name: "Input9", overlay: 1 },
      set3Score: { name: "Input10", overlay: 1 },
      set4Score: { name: "Input11", overlay: 1 },
      set5Score: { name: "Input12", overlay: 1 },
      referee1: { name: "Input13", overlay: 1 },
      referee2: { name: "Input14", overlay: 1 },
    },
  });
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    testing: false,
    message: "",
  });

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    // Автоматически выбираем первый инпут при загрузке конфигурации
    if (
      config.inputs &&
      Object.keys(config.inputs).length > 0 &&
      !selectedInput
    ) {
      const firstInputKey = Object.keys(config.inputs)[0];
      setSelectedInput(firstInputKey);
    }
  }, [config.inputs]);

  const handleSave = useCallback(async () => {
    try {
      if (!window.electronAPI) {
        alert("Electron API недоступен");
        return;
      }

      // Сохраняем конфигурацию (новая структура уже используется)
      await window.electronAPI.setVMixConfig(config);
      alert("Настройки сохранены!");
      navigate("/match");
    } catch (error) {
      console.error("Ошибка при сохранении настроек:", error);
      alert("Не удалось сохранить настройки: " + error.message);
    }
  }, [config, navigate]);

  // Устанавливаем кнопки в Header
  useEffect(() => {
    setButtons(
      <>
        <button
          onClick={() => navigate("/match")}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#95a5a6",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Отмена
        </button>
        <button
          onClick={handleSave}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#27ae60",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Сохранить
        </button>
      </>
    );

    return () => setButtons(null);
  }, [setButtons, navigate, handleSave]);

  const loadConfig = async () => {
    try {
      if (!window.electronAPI) {
        return;
      }
      const savedConfig = await window.electronAPI.getVMixConfig();
      if (savedConfig) {
        // Миграция происходит на серверной стороне в settingsManager.js
        setConfig(savedConfig);
      }
    } catch (error) {
      console.error("Ошибка при загрузке настроек vMix:", error);
    }
  };

  const handleInputChange = (field, value) => {
    if (field.includes(".")) {
      const parts = field.split(".");
      if (parts.length === 2) {
        // Простые поля (host, port)
        const [parent, child] = parts;
        setConfig((prev) => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: child === "port" ? parseInt(value) || 8088 : value,
          },
        }));
      } else if (parts.length === 3) {
        // inputs.key.property (enabled, inputIdentifier, overlay)
        const [parent, key, property] = parts;
        setConfig((prev) => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [key]: {
              ...prev[parent][key],
              [property]:
                property === "overlay" || property === "enabled"
                  ? property === "overlay"
                    ? parseInt(value) || 1
                    : value === true || value === "true"
                  : value,
            },
          },
        }));
      } else if (parts.length === 5) {
        // inputs.key.fields.fieldKey.property (enabled, fieldIdentifier)
        const [parent, inputKey, fieldsKey, fieldKey2, property] = parts;
        setConfig((prev) => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [inputKey]: {
              ...prev[parent][inputKey],
              [fieldsKey]: {
                ...prev[parent][inputKey][fieldsKey],
                [fieldKey2]: {
                  ...prev[parent][inputKey][fieldsKey][fieldKey2],
                  [property]:
                    property === "enabled"
                      ? value === true || value === "true"
                      : value,
                },
              },
            },
          },
        }));
      }
    } else {
      setConfig((prev) => ({
        ...prev,
        [field]: field === "port" ? parseInt(value) || 8088 : value,
      }));
    }
  };

  const handleTestConnection = async () => {
    setConnectionStatus({
      connected: false,
      testing: true,
      message: "Проверка подключения...",
    });

    try {
      if (!window.electronAPI) {
        setConnectionStatus({
          connected: false,
          testing: false,
          message: "Electron API недоступен",
        });
        return;
      }

      const result = await window.electronAPI.testVMixConnection(
        config.host,
        config.port
      );

      if (result.success) {
        setConnectionStatus({
          connected: true,
          testing: false,
          message: "Подключение успешно!",
        });
      } else {
        setConnectionStatus({
          connected: false,
          testing: false,
          message: result.error || "Не удалось подключиться к vMix",
        });
      }
    } catch (error) {
      setConnectionStatus({
        connected: false,
        testing: false,
        message: "Ошибка: " + error.message,
      });
    }
  };


  const inputLabels = {
    lineup: "Заявка (TeamA vs TeamB)",
    statistics: "Статистика",
    rosterTeamA: "Состав команды А (полный)",
    rosterTeamB: "Состав команды Б (полный)",
    startingLineupTeamA: "Стартовый состав команды А",
    startingLineupTeamB: "Стартовый состав команды Б",
    currentScore: "Текущий счет (во время партии)",
    set1Score: "Счет после 1 партии",
    set2Score: "Счет после 2 партии",
    set3Score: "Счет после 3 партии",
    set4Score: "Счет после 4 партии",
    set5Score: "Счет после 5 партии",
    referee1: "Плашка общая",
    referee2: "Плашка 2 судьи",
  };

  const [selectedInput, setSelectedInput] = useState(null);

  return (
    <div style={{ padding: "1rem", maxWidth: "1000px", margin: "0 auto" }}>

      {/* Настройки подключения */}
      <div
        style={{
          backgroundColor: "#ecf0f1",
          padding: "1.5rem",
          borderRadius: "4px",
          marginBottom: "1.5rem",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Подключение</h3>
        <div style={{ display: "grid", gap: "1rem" }}>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "bold",
              }}
            >
              IP адрес vMix
            </label>
            <input
              type="text"
              value={config.host}
              onChange={(e) => handleInputChange("host", e.target.value)}
              style={{
                width: "100%",
                maxWidth: "300px",
                padding: "0.5rem",
                fontSize: "1rem",
                border: "1px solid #bdc3c7",
                borderRadius: "4px",
              }}
              placeholder="192.168.1.100"
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "bold",
              }}
            >
              Порт
            </label>
            <input
              type="number"
              value={config.port}
              onChange={(e) =>
                handleInputChange("port", parseInt(e.target.value) || 8088)
              }
              style={{
                width: "100%",
                maxWidth: "150px",
                padding: "0.5rem",
                fontSize: "1rem",
                border: "1px solid #bdc3c7",
                borderRadius: "4px",
              }}
              placeholder="8088"
            />
          </div>
          <div>
            <button
              onClick={handleTestConnection}
              disabled={connectionStatus.testing}
              style={{
                padding: "0.75rem 1.5rem",
                fontSize: "1rem",
                backgroundColor: connectionStatus.testing
                  ? "#95a5a6"
                  : "#3498db",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: connectionStatus.testing ? "not-allowed" : "pointer",
              }}
            >
              {connectionStatus.testing ? "Проверка..." : "Тест подключения"}
            </button>
            {connectionStatus.message && (
              <span
                style={{
                  marginLeft: "1rem",
                  color: connectionStatus.connected ? "#27ae60" : "#e74c3c",
                  fontWeight: "bold",
                }}
              >
                {connectionStatus.message}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Настройка инпутов - новая структура с вкладками */}
      <div
        style={{
          backgroundColor: "#ecf0f1",
          padding: "1.5rem",
          borderRadius: "4px",
          marginBottom: "1.5rem",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>
          Настройка инпутов
        </h3>
        <div style={{ display: "flex", gap: "1rem", minHeight: "500px" }}>
          {/* Левая панель - вкладки инпутов */}
          <div
            style={{
              width: "250px",
              backgroundColor: "white",
              borderRadius: "4px",
              padding: "0.5rem",
              border: "1px solid #bdc3c7",
              overflowY: "auto",
              maxHeight: "600px",
            }}
          >
            {Object.keys(inputLabels).map((key) => {
              const input = config.inputs[key] || {};
              const isEnabled = input.enabled !== false;
              const isSelected = selectedInput === key;

              return (
                <div
                  key={key}
                  onClick={() => setSelectedInput(key)}
                  style={{
                    padding: "0.75rem",
                    marginBottom: "0.25rem",
                    borderRadius: "4px",
                    cursor: "pointer",
                    backgroundColor: isSelected
                      ? "#3498db"
                      : isEnabled
                      ? "white"
                      : "#ecf0f1",
                    color: isSelected ? "white" : "#2c3e50",
                    border: `1px solid ${isSelected ? "#2980b9" : "#bdc3c7"}`,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleInputChange(
                        `inputs.${key}.enabled`,
                        e.target.checked
                      );
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span
                    style={{
                      fontWeight: isSelected ? "bold" : "normal",
                      flex: 1,
                    }}
                  >
                    {inputLabels[key]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Правая панель - редактирование выбранного инпута */}
          {selectedInput && config.inputs[selectedInput] && (
            <div
              style={{
                flex: 1,
                backgroundColor: "white",
                borderRadius: "4px",
                padding: "1.5rem",
                border: "1px solid #bdc3c7",
                overflowY: "auto",
                maxHeight: "600px",
              }}
            >
              <h4 style={{ marginTop: 0, marginBottom: "1rem" }}>
                {inputLabels[selectedInput]}
              </h4>

              {/* Общие настройки инпута */}
              <div
                style={{
                  marginBottom: "1.5rem",
                  paddingBottom: "1rem",
                  borderBottom: "1px solid #ecf0f1",
                }}
              >
                <h5 style={{ marginTop: 0, marginBottom: "0.75rem" }}>
                  Общие настройки
                </h5>
                <div style={{ display: "grid", gap: "1rem" }}>
                  <div>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={config.inputs[selectedInput].enabled !== false}
                        onChange={(e) =>
                          handleInputChange(
                            `inputs.${selectedInput}.enabled`,
                            e.target.checked
                          )
                        }
                      />
                      <span style={{ fontWeight: "bold" }}>Включить инпут</span>
                    </label>
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontWeight: "bold",
                      }}
                    >
                      Имя или номер инпута
                    </label>
                    <input
                      type="text"
                      value={
                        config.inputs[selectedInput].inputIdentifier ||
                        config.inputs[selectedInput].name ||
                        ""
                      }
                      onChange={(e) =>
                        handleInputChange(
                          `inputs.${selectedInput}.inputIdentifier`,
                          e.target.value
                        )
                      }
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        fontSize: "1rem",
                        border: "1px solid #bdc3c7",
                        borderRadius: "4px",
                      }}
                      placeholder="Input5 или Название инпута"
                    />
                    <small
                      style={{
                        color: "#7f8c8d",
                        display: "block",
                        marginTop: "0.25rem",
                      }}
                    >
                      Если число - обращение по номеру, если строка - поиск по
                      имени
                    </small>
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontWeight: "bold",
                      }}
                    >
                      Номер оверлея
                    </label>
                    <select
                      value={config.inputs[selectedInput].overlay || 1}
                      onChange={(e) =>
                        handleInputChange(
                          `inputs.${selectedInput}.overlay`,
                          parseInt(e.target.value)
                        )
                      }
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        fontSize: "1rem",
                        border: "1px solid #bdc3c7",
                        borderRadius: "4px",
                      }}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                        <option key={num} value={num}>
                          Оверлей {num}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Поля инпута */}
              {config.inputs[selectedInput].fields &&
                Object.keys(config.inputs[selectedInput].fields).length > 0 && (
                  <div>
                    <h5 style={{ marginTop: 0, marginBottom: "0.75rem" }}>
                      Поля инпута
                    </h5>
                    <div style={{ display: "grid", gap: "0.75rem" }}>
                      {Object.entries(config.inputs[selectedInput].fields).map(
                        ([fieldKey, field]) => (
                          <div
                            key={fieldKey}
                            style={{
                              padding: "1rem",
                              backgroundColor: "#f8f9fa",
                              borderRadius: "4px",
                              border: "1px solid #e9ecef",
                              display: "grid",
                              gap: "0.75rem",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.75rem",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={field.enabled !== false}
                                onChange={(e) =>
                                  handleInputChange(
                                    `inputs.${selectedInput}.fields.${fieldKey}.enabled`,
                                    e.target.checked
                                  )
                                }
                              />
                              <span
                                style={{
                                  flex: 1,
                                  fontWeight: "bold",
                                  opacity: field.enabled !== false ? 1 : 0.6,
                                }}
                              >
                                {field.fieldName || fieldKey}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  padding: "0.25rem 0.5rem",
                                  borderRadius: "4px",
                                  backgroundColor:
                                    field.type === "text"
                                      ? "#e3f2fd"
                                      : field.type === "fill"
                                      ? "#fff3e0"
                                      : field.type === "image"
                                      ? "#e8f5e9"
                                      : "#e0e0e0",
                                  color: "#555",
                                }}
                              >
                                {field.type === "text"
                                  ? "Текст"
                                  : field.type === "fill"
                                  ? "Филл"
                                  : field.type === "image"
                                  ? "Изображение"
                                  : field.type}
                              </span>
                            </div>
                            <div>
                              <label
                                style={{
                                  display: "block",
                                  marginBottom: "0.25rem",
                                  fontSize: "0.875rem",
                                  fontWeight: "bold",
                                }}
                              >
                                Имя поля для vMix (базовое имя)
                              </label>
                              <input
                                type="text"
                                value={field.fieldIdentifier || ""}
                                onChange={(e) => {
                                  const path = `inputs.${selectedInput}.fields.${fieldKey}.fieldIdentifier`;
                                  const parts = path.split(".");
                                  if (parts.length === 5) {
                                    const [
                                      parent,
                                      inputKey,
                                      fieldsKey,
                                      fieldKey2,
                                      property,
                                    ] = parts;
                                    setConfig((prev) => ({
                                      ...prev,
                                      [parent]: {
                                        ...prev[parent],
                                        [inputKey]: {
                                          ...prev[parent][inputKey],
                                          [fieldsKey]: {
                                            ...prev[parent][inputKey][
                                              fieldsKey
                                            ],
                                            [fieldKey2]: {
                                              ...prev[parent][inputKey][
                                                fieldsKey
                                              ][fieldKey2],
                                              [property]: e.target.value,
                                            },
                                          },
                                        },
                                      },
                                    }));
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "0.5rem",
                                  fontSize: "0.875rem",
                                  border: "1px solid #bdc3c7",
                                  borderRadius: "4px",
                                }}
                                placeholder="Имя поля для vMix"
                              />
                              {field.fieldIdentifier && field.type && (
                                <small
                                  style={{
                                    color: "#3498db",
                                    display: "block",
                                    marginTop: "0.25rem",
                                    fontWeight: "bold",
                                  }}
                                >
                                  Полное имя: {getFullFieldName(field.fieldIdentifier, field.type)}
                                </small>
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Кнопки */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          justifyContent: "flex-end",
        }}
      >
        <button
          onClick={() => navigate("/match")}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            backgroundColor: "#95a5a6",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Отмена
        </button>
        <button
          onClick={handleSave}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            backgroundColor: "#27ae60",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Сохранить настройки
        </button>
      </div>
    </div>
  );
}

export default VMixSettingsPage;
