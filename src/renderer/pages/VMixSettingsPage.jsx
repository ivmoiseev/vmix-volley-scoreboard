import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useHeaderButtons } from "../components/Layout";
import { removeInputFromVMixConfig } from "../../shared/vmixConfigUtils";
import VMixInputFieldsPanel from "../components/VMixInputFieldsPanel";

function VMixSettingsPage() {
  const navigate = useNavigate();
  const { setButtons } = useHeaderButtons();
  const [config, setConfig] = useState({
    host: "localhost",
    port: 8088,
    connectionState: "disconnected",
    inputOrder: [],
    inputs: {},
  });
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    testing: false,
    message: "",
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = useCallback(async () => {
    try {
      if (!window.electronAPI) {
        alert("Electron API недоступен");
        return;
      }

      // Сохраняем конфигурацию (новая структура уже используется)
      await window.electronAPI.setVMixConfig(config);
      // Переходим на страницу матча с принудительным обновлением инпутов vMix (как при F5)
      navigate("/match", { state: { forceUpdateVMix: true } });
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
        setConfig(savedConfig);
        setConnectionStatus((prev) => ({
          ...prev,
          connected: savedConfig.connectionState === "connected",
          message: savedConfig.connectionState === "connected" ? "Подключено" : "",
        }));
      }
    } catch (error) {
      console.error("Ошибка при загрузке настроек vMix:", error);
    }
  };

  const handleConnectionFieldChange = (field, value) => {
    setConfig((prev) => ({
      ...prev,
      [field]: field === "port" ? parseInt(value, 10) || 8088 : value,
    }));
  };

  const handleTestConnection = async () => {
    setConnectionStatus((prev) => ({ ...prev, testing: true, message: "Проверка подключения..." }));
    try {
      if (!window.electronAPI) {
        setConnectionStatus({ connected: false, testing: false, message: "Electron API недоступен" });
        return;
      }
      const result = await window.electronAPI.testVMixConnection(config.host, config.port);
      setConnectionStatus({
        connected: !!result.success,
        testing: false,
        message: result.success ? "Подключение успешно!" : (result.error || "Не удалось подключиться к vMix"),
      });
    } catch (error) {
      setConnectionStatus({ connected: false, testing: false, message: "Ошибка: " + error.message });
    }
  };

  const handleConnect = async () => {
    setConnectionStatus((prev) => ({ ...prev, testing: true, message: "" }));
    try {
      if (!window.electronAPI?.vmixConnect) {
        setConnectionStatus({ connected: false, testing: false, message: "API недоступен" });
        return;
      }
      const result = await window.electronAPI.vmixConnect(config.host, config.port);
      if (result.success) {
        setConnectionStatus({ connected: true, testing: false, message: "Подключено" });
      } else {
        setConnectionStatus({ connected: false, testing: false, message: result.error || "Ошибка подключения" });
      }
    } catch (error) {
      setConnectionStatus({ connected: false, testing: false, message: "Ошибка: " + error.message });
    }
  };

  const handleDisconnect = async () => {
    try {
      if (window.electronAPI?.vmixDisconnect) {
        await window.electronAPI.vmixDisconnect();
      }
      setConnectionStatus({ connected: false, testing: false, message: "" });
    } catch (error) {
      setConnectionStatus({ connected: false, testing: false, message: "Ошибка: " + error.message });
    }
  };


  // Динамические инпуты (новая структура: inputOrder + inputs с displayName/vmixTitle)
  const [selectedDynamicInputId, setSelectedDynamicInputId] = useState(null);
  const [showAddInputModal, setShowAddInputModal] = useState(false);
  const [gtInputs, setGtInputs] = useState([]);
  const [addFormDisplayName, setAddFormDisplayName] = useState("");
  const [addFormSelectedGT, setAddFormSelectedGT] = useState(null);
  // Перетаскивание порядка инпутов
  const [draggedInputId, setDraggedInputId] = useState(null);
  const [dragOverInputId, setDragOverInputId] = useState(null);

  const dynamicInputOrder = Array.isArray(config.inputOrder) ? config.inputOrder : [];
  const dynamicInputsList = dynamicInputOrder
    .map((id) => {
      const input = config.inputs?.[id];
      if (!input || input.displayName == null) return null;
      return { id, ...input };
    })
    .filter(Boolean);

  useEffect(() => {
    if (!showAddInputModal || !window.electronAPI?.getVMixGTInputs) return;
    window.electronAPI.getVMixGTInputs().then((res) => {
      if (res?.success && Array.isArray(res.inputs)) setGtInputs(res.inputs);
      else setGtInputs([]);
    });
  }, [showAddInputModal]);

  const handleAddDynamicInput = () => {
    if (!addFormDisplayName.trim() || !addFormSelectedGT) return;
    const uuid = crypto.randomUUID?.() ?? `input_${Date.now()}`;
    const newInput = {
      displayName: addFormDisplayName.trim(),
      vmixTitle: addFormSelectedGT.title,
      vmixKey: addFormSelectedGT.key,
      vmixNumber: addFormSelectedGT.number,
      enabled: true,
      overlay: 1,
      fields: {},
    };
    setConfig((prev) => ({
      ...prev,
      inputs: { ...prev.inputs, [uuid]: newInput },
      inputOrder: [...(prev.inputOrder || []), uuid],
    }));
    setSelectedDynamicInputId(uuid);
    setShowAddInputModal(false);
    setAddFormDisplayName("");
    setAddFormSelectedGT(null);
  };

  const handleFieldChange = useCallback((inputId, fieldName, value) => {
    setConfig((prev) => {
      const next = { ...prev, inputs: { ...prev.inputs } };
      const input = next.inputs[inputId];
      if (!input) return prev;
      const fields = { ...(input.fields || {}) };
      if (value == null) {
        delete fields[fieldName];
      } else {
        fields[fieldName] = {
          ...(fields[fieldName] || {}),
          ...value,
        };
      }
      next.inputs[inputId] = { ...input, fields };
      return next;
    });
  }, []);

  const handleDeleteDynamicInput = () => {
    if (!selectedDynamicInputId) return;
    const displayName = config.inputs?.[selectedDynamicInputId]?.displayName || "инпут";
    if (!window.confirm(`Удалить инпут «${displayName}»? Настройки полей будут потеряны.`)) return;
    const result = removeInputFromVMixConfig({ vmix: config }, selectedDynamicInputId);
    setConfig(result.vmix);
    const remaining = (result.vmix?.inputOrder || []).filter((id) => id !== selectedDynamicInputId);
    setSelectedDynamicInputId(remaining[0] ?? null);
  };

  const handleInputDragStart = (e, inputId) => {
    setDraggedInputId(inputId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", inputId);
    e.dataTransfer.setData("application/json", JSON.stringify({ inputId }));
  };

  const handleInputDragOver = (e, inputId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (inputId !== draggedInputId) setDragOverInputId(inputId);
  };

  const handleInputDragLeave = () => {
    setDragOverInputId(null);
  };

  const handleInputDrop = (e, dropTargetId) => {
    e.preventDefault();
    setDragOverInputId(null);
    setDraggedInputId(null);
    const draggedId = e.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === dropTargetId) return;
    const order = Array.isArray(config.inputOrder) ? [...config.inputOrder] : [];
    const fromIndex = order.indexOf(draggedId);
    if (fromIndex === -1) return;
    order.splice(fromIndex, 1);
    const toIndex = order.indexOf(dropTargetId);
    const insertIndex = toIndex === -1 ? order.length : toIndex;
    order.splice(insertIndex, 0, draggedId);
    setConfig((prev) => ({ ...prev, inputOrder: order }));
  };

  const handleInputDragEnd = () => {
    setDraggedInputId(null);
    setDragOverInputId(null);
  };

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
              onChange={(e) => handleConnectionFieldChange("host", e.target.value)}
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
                handleConnectionFieldChange("port", parseInt(e.target.value, 10) || 8088)
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
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <button
              onClick={connectionStatus.connected ? handleDisconnect : handleConnect}
              disabled={connectionStatus.testing}
              style={{
                padding: "0.75rem 1.5rem",
                fontSize: "1rem",
                backgroundColor: connectionStatus.testing
                  ? "#95a5a6"
                  : connectionStatus.connected
                    ? "#e74c3c"
                    : "#3498db",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: connectionStatus.testing ? "not-allowed" : "pointer",
              }}
            >
              {connectionStatus.testing
                ? "Проверка..."
                : connectionStatus.connected
                  ? "Отключить"
                  : "Подключить"}
            </button>
            <button
              onClick={handleTestConnection}
              disabled={connectionStatus.testing}
              style={{
                padding: "0.75rem 1rem",
                fontSize: "0.9rem",
                backgroundColor: connectionStatus.testing ? "#95a5a6" : "#7f8c8d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: connectionStatus.testing ? "not-allowed" : "pointer",
              }}
            >
              Тест подключения
            </button>
            {connectionStatus.message && (
              <span
                style={{
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

      {/* Настройка инпутов (динамические инпуты по списку GT из vMix) */}
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
        <div style={{ display: "flex", gap: "1rem", minHeight: "280px" }}>
          <div
            style={{
              width: "250px",
              backgroundColor: "white",
              borderRadius: "4px",
              padding: "0.5rem",
              border: "1px solid #bdc3c7",
              overflowY: "auto",
              maxHeight: "400px",
            }}
          >
            <button
              type="button"
              onClick={() => setShowAddInputModal(true)}
              style={{
                width: "100%",
                marginBottom: "0.5rem",
                padding: "0.5rem",
                backgroundColor: "#27ae60",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Добавить инпут
            </button>
            {dynamicInputsList.length === 0 ? (
              <div style={{ padding: "0.75rem", color: "#7f8c8d", fontSize: "0.9rem" }}>
                Нет инпутов. Подключитесь к vMix и нажмите «Добавить инпут».
              </div>
            ) : (
              dynamicInputsList.map((item) => {
                const isSelected = selectedDynamicInputId === item.id;
                const isDragging = draggedInputId === item.id;
                const isDragOver = dragOverInputId === item.id;
                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleInputDragStart(e, item.id)}
                    onDragOver={(e) => handleInputDragOver(e, item.id)}
                    onDragLeave={handleInputDragLeave}
                    onDrop={(e) => handleInputDrop(e, item.id)}
                    onDragEnd={handleInputDragEnd}
                    onClick={() => setSelectedDynamicInputId(item.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.75rem",
                      marginBottom: "0.25rem",
                      borderRadius: "4px",
                      cursor: "grab",
                      backgroundColor: isDragOver ? "#e8f4f8" : isSelected ? "#3498db" : "white",
                      color: isSelected && !isDragOver ? "white" : "#2c3e50",
                      border: `1px solid ${isDragOver ? "#3498db" : isSelected ? "#2980b9" : "#bdc3c7"}`,
                      opacity: isDragging ? 0.5 : 1,
                    }}
                  >
                    <span
                      title="Перетащите для смены порядка"
                      style={{
                        cursor: "grab",
                        color: isSelected && !isDragOver ? "rgba(255,255,255,0.8)" : "#7f8c8d",
                        fontSize: "0.9rem",
                        userSelect: "none",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      ⋮⋮
                    </span>
                    <span style={{ flex: 1 }}>{item.displayName}</span>
                  </div>
                );
              })
            )}
          </div>
          {selectedDynamicInputId && config.inputs?.[selectedDynamicInputId] && (
            <div
              style={{
                flex: 1,
                backgroundColor: "white",
                borderRadius: "4px",
                padding: "1rem",
                border: "1px solid #bdc3c7",
              }}
            >
              <h4 style={{ marginTop: 0 }}>Настройки инпута</h4>
              <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>Отображаемое имя</label>
                  <input
                    type="text"
                    value={config.inputs[selectedDynamicInputId].displayName || ""}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        inputs: {
                          ...prev.inputs,
                          [selectedDynamicInputId]: {
                            ...prev.inputs[selectedDynamicInputId],
                            displayName: e.target.value,
                          },
                        },
                      }))
                    }
                    style={{ width: "100%", padding: "0.5rem", border: "1px solid #bdc3c7", borderRadius: "4px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input
                      type="checkbox"
                      checked={config.inputs[selectedDynamicInputId].enabled !== false}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          inputs: {
                            ...prev.inputs,
                            [selectedDynamicInputId]: {
                              ...prev.inputs[selectedDynamicInputId],
                              enabled: e.target.checked,
                            },
                          },
                        }))
                      }
                    />
                    Включить инпут
                  </label>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>Оверлей</label>
                  <select
                    value={config.inputs[selectedDynamicInputId].overlay || 1}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        inputs: {
                          ...prev.inputs,
                          [selectedDynamicInputId]: {
                            ...prev.inputs[selectedDynamicInputId],
                            overlay: parseInt(e.target.value, 10),
                          },
                        },
                      }))
                    }
                    style={{ padding: "0.5rem", border: "1px solid #bdc3c7", borderRadius: "4px" }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>Оверлей {n}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteDynamicInput}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#e74c3c",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Удалить инпут
                </button>
              </div>
              <p style={{ fontSize: "0.9rem", color: "#7f8c8d" }}>
                Инпут vMix: <strong>{config.inputs[selectedDynamicInputId].vmixTitle}</strong>
              </p>
              <VMixInputFieldsPanel
                inputId={selectedDynamicInputId}
                inputConfig={config.inputs[selectedDynamicInputId]}
                config={config}
                onFieldChange={handleFieldChange}
                readOnly={false}
              />
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно: Добавить инпут */}
      {showAddInputModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowAddInputModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "1.5rem",
              borderRadius: "8px",
              minWidth: "360px",
              maxWidth: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Добавить инпут</h3>
            <div style={{ display: "grid", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Название (в приложении)</label>
                <input
                  type="text"
                  value={addFormDisplayName}
                  onChange={(e) => setAddFormDisplayName(e.target.value)}
                  placeholder="Например: Текущий счёт"
                  style={{ width: "100%", padding: "0.5rem", border: "1px solid #bdc3c7", borderRadius: "4px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Инпут vMix (GT)</label>
                <select
                  value={addFormSelectedGT ? addFormSelectedGT.key : ""}
                  onChange={(e) => {
                    const gt = gtInputs.find((i) => i.key === e.target.value);
                    setAddFormSelectedGT(gt || null);
                  }}
                  style={{ width: "100%", padding: "0.5rem", border: "1px solid #bdc3c7", borderRadius: "4px" }}
                >
                  <option value="">— Выберите инпут —</option>
                  {gtInputs.map((inp) => (
                    <option key={inp.key} value={inp.key}>
                      {inp.title || inp.shortTitle || inp.number}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  setShowAddInputModal(false);
                  setAddFormDisplayName("");
                  setAddFormSelectedGT(null);
                }}
                style={{ padding: "0.5rem 1rem", border: "1px solid #bdc3c7", borderRadius: "4px", cursor: "pointer" }}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleAddDynamicInput}
                disabled={!addFormDisplayName.trim() || !addFormSelectedGT}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#27ae60",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: !addFormDisplayName.trim() || !addFormSelectedGT ? "not-allowed" : "pointer",
                }}
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

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
