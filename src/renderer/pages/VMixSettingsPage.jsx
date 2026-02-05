import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useHeaderButtons } from "../components/Layout";
import { removeInputFromVMixConfig } from "../../shared/vmixConfigUtils";
import VMixInputFieldsPanel from "../components/VMixInputFieldsPanel";
import Button from "../components/Button";
import { space, radius } from "../theme/tokens";

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
        <Button variant="secondary" onClick={() => navigate("/match")}>
          Отмена
        </Button>
        <Button variant="success" onClick={handleSave} style={{ fontWeight: "bold" }}>
          Сохранить
        </Button>
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
          backgroundColor: "var(--color-surface-muted)",
          padding: "1.5rem",
          borderRadius: radius.sm,
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
                border: "1px solid var(--color-border)",
                borderRadius: radius.sm,
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
                border: "1px solid var(--color-border)",
                borderRadius: radius.sm,
              }}
              placeholder="8088"
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <Button
              variant={connectionStatus.connected ? "danger" : "primary"}
              onClick={connectionStatus.connected ? handleDisconnect : handleConnect}
              disabled={connectionStatus.testing}
            >
              {connectionStatus.testing
                ? "Проверка..."
                : connectionStatus.connected
                  ? "Отключить"
                  : "Подключить"}
            </Button>
            <Button
              variant="secondary"
              onClick={handleTestConnection}
              disabled={connectionStatus.testing}
              style={{ fontSize: "0.9rem" }}
            >
              Тест подключения
            </Button>
            {connectionStatus.message && (
              <span
                style={{
                  color: connectionStatus.connected ? "var(--color-success)" : "var(--color-danger)",
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
          backgroundColor: "var(--color-surface-muted)",
          padding: "1.5rem",
          borderRadius: radius.sm,
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
              backgroundColor: "var(--color-surface)",
              color: "var(--color-text)",
              borderRadius: radius.sm,
              padding: "0.5rem",
              border: "1px solid var(--color-border)",
              overflowY: "auto",
              maxHeight: "400px",
            }}
          >
            <Button
              type="button"
              variant="success"
              onClick={() => setShowAddInputModal(true)}
              style={{ width: "100%", marginBottom: "0.5rem" }}
            >
              Добавить инпут
            </Button>
            {dynamicInputsList.length === 0 ? (
              <div style={{ padding: "0.75rem", color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
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
                      borderRadius: radius.sm,
                      cursor: "grab",
                      backgroundColor: isDragOver ? "var(--color-primary-light)" : isSelected ? "var(--color-primary)" : "var(--color-surface)",
                      color: isSelected && !isDragOver ? "white" : "var(--color-text)",
                      border: `1px solid ${isDragOver ? "var(--color-primary)" : isSelected ? "var(--color-primary-hover)" : "var(--color-border)"}`,
                      opacity: isDragging ? 0.5 : 1,
                    }}
                  >
                    <span
                      title="Перетащите для смены порядка"
                      style={{
                        cursor: "grab",
                        color: isSelected && !isDragOver ? "rgba(255,255,255,0.8)" : "var(--color-text-secondary)",
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
                backgroundColor: "var(--color-surface)",
                color: "var(--color-text)",
                borderRadius: radius.sm,
                padding: "1rem",
                border: "1px solid var(--color-border)",
              }}
            >
              <h4 style={{ marginTop: 0, color: "var(--color-text)" }}>Настройки инпута</h4>
              <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold", color: "var(--color-text)" }}>Отображаемое имя</label>
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
                    style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--color-border)", borderRadius: radius.sm }}
                  />
                </div>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-text)" }}>
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
                  <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold", color: "var(--color-text)" }}>Оверлей</label>
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
                    style={{ padding: "0.5rem", border: "1px solid var(--color-border)", borderRadius: radius.sm }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>Оверлей {n}</option>
                    ))}
                  </select>
                </div>
                <Button type="button" variant="danger" onClick={handleDeleteDynamicInput}>
                  Удалить инпут
                </Button>
              </div>
              <p style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)" }}>
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
            backgroundColor: "var(--color-overlay)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowAddInputModal(false)}
        >
          <div
            style={{
              backgroundColor: "var(--color-surface)",
              color: "var(--color-text)",
              padding: space.lg,
              borderRadius: radius.md,
              minWidth: "360px",
              maxWidth: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, color: "var(--color-text)" }}>Добавить инпут</h3>
            <div style={{ display: "grid", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold", color: "var(--color-text)" }}>Название (в приложении)</label>
                <input
                  type="text"
                  value={addFormDisplayName}
                  onChange={(e) => setAddFormDisplayName(e.target.value)}
                  placeholder="Например: Текущий счёт"
                  style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--color-border)", borderRadius: radius.sm }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold", color: "var(--color-text)" }}>Инпут vMix (GT)</label>
                <select
                  value={addFormSelectedGT ? addFormSelectedGT.key : ""}
                  onChange={(e) => {
                    const gt = gtInputs.find((i) => i.key === e.target.value);
                    setAddFormSelectedGT(gt || null);
                  }}
                  style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--color-border)", borderRadius: radius.sm }}
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
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowAddInputModal(false);
                  setAddFormDisplayName("");
                  setAddFormSelectedGT(null);
                }}
              >
                Отмена
              </Button>
              <Button
                type="button"
                variant="success"
                onClick={handleAddDynamicInput}
                disabled={!addFormDisplayName.trim() || !addFormSelectedGT}
              >
                Добавить
              </Button>
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
        <Button variant="secondary" onClick={() => navigate("/match")}>
          Отмена
        </Button>
        <Button variant="success" onClick={handleSave} style={{ fontWeight: "bold" }}>
          Сохранить настройки
        </Button>
      </div>
    </div>
  );
}

export default VMixSettingsPage;
