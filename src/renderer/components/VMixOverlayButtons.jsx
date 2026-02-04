function VMixOverlayButtons({
  vmixConfig,
  connectionStatus,
  onShowOverlay,
  onHideOverlay,
  isOverlayActive,
}) {
  const handleButtonClick = async (buttonConfig) => {
    const buttonKey = buttonConfig.key;
    const inputKey = buttonConfig.inputKey || buttonKey;
    const isActive = isOverlayActive(inputKey, buttonKey);

    if (isActive) {
      const result = await onHideOverlay(inputKey);
      if (result && !result.success) {
        console.error("Ошибка при скрытии оверлея:", result.error);
      }
    } else {
      const result = await onShowOverlay(inputKey, buttonKey);
      if (result && !result.success) {
        console.error("Ошибка при показе оверлея:", result.error);
      }
    }
  };

  if (!vmixConfig) {
    return (
      <div
        style={{
          padding: "1rem",
          backgroundColor: "#ecf0f1",
          borderRadius: "4px",
          textAlign: "center",
          color: "#7f8c8d",
        }}
      >
        Настройки vMix не загружены. Настройте подключение в настройках vMix.
      </div>
    );
  }

  const inputOrder = Array.isArray(vmixConfig?.inputOrder) ? vmixConfig.inputOrder : [];
  const dynamicButtons = inputOrder
    .map((id) => {
      const input = vmixConfig?.inputs?.[id];
      if (!input || input.displayName == null) return null;
      return { key: id, label: input.displayName, inputKey: id };
    })
    .filter(Boolean);

  return (
    <div
      style={{
        backgroundColor: "#ecf0f1",
        padding: "1rem",
        borderRadius: "4px",
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>
        Управление плашками vMix
      </h3>
      {dynamicButtons.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.5rem",
          }}
        >
          {dynamicButtons.map((btn) => {
            const active = isOverlayActive(btn.inputKey, btn.key);
            const inputConfig = vmixConfig?.inputs?.[btn.inputKey];
            const isInputEnabled = inputConfig && inputConfig.enabled !== false;
            const isVMixConnected = connectionStatus.connected;
            const disabled = !isVMixConnected || !isInputEnabled;
            const tooltipText = disabled
              ? !isVMixConnected
                ? "vMix не подключен"
                : "Инпут отключен в настройках"
              : active
                ? "Скрыть плашку"
                : "Показать плашку";
            return (
              <button
                key={btn.key}
                type="button"
                disabled={disabled}
                onClick={() => handleButtonClick({ key: btn.key, inputKey: btn.inputKey })}
                title={tooltipText}
                style={{
                  padding: "0.75rem",
                  fontSize: "0.9rem",
                  backgroundColor: active ? "#27ae60" : disabled ? "#bdc3c7" : "#3498db",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: disabled ? "not-allowed" : "pointer",
                  fontWeight: active ? "bold" : "normal",
                  position: "relative",
                  opacity: disabled && !isVMixConnected ? 0.6 : disabled ? 0.5 : 1,
                }}
              >
                {btn.label}
                {active && (
                  <span
                    style={{
                      position: "absolute",
                      top: "2px",
                      right: "4px",
                      fontSize: "0.8rem",
                    }}
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <p
          style={{
            margin: 0,
            color: "#7f8c8d",
            fontSize: "0.9rem",
          }}
        >
          Добавьте инпуты в настройках vMix (раздел «Настройка инпутов»).
        </p>
      )}
      {!connectionStatus.connected && (
        <p
          style={{
            marginTop: "0.5rem",
            fontSize: "0.9rem",
            color: "#e74c3c",
            textAlign: "center",
          }}
        >
          vMix не подключен
        </p>
      )}
    </div>
  );
}

export default VMixOverlayButtons;
