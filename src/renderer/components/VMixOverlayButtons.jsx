import { space, radius, typography } from '../theme/tokens';
import Button from './Button';

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
          padding: space.md,
          backgroundColor: 'var(--color-surface-muted)',
          borderRadius: radius.sm,
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
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
        backgroundColor: 'var(--color-surface-muted)',
        padding: space.md,
        borderRadius: radius.sm,
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: space.md }}>
        Управление плашками vMix
      </h3>
      {dynamicButtons.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: space.sm,
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
                ? 'vMix не подключен'
                : 'Инпут отключен в настройках'
              : active
                ? 'Скрыть плашку'
                : 'Показать плашку';
            return (
              <Button
                key={btn.key}
                type="button"
                variant={active ? 'success' : disabled ? 'secondary' : 'primary'}
                disabled={disabled}
                onClick={() => handleButtonClick({ key: btn.key, inputKey: btn.inputKey })}
                title={tooltipText}
                style={{
                  fontSize: typography.small,
                  fontWeight: active ? 'bold' : 'normal',
                  position: 'relative',
                  opacity: disabled && !isVMixConnected ? 0.6 : disabled ? 0.5 : 1,
                }}
              >
                {btn.label}
                {active && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '4px',
                      fontSize: '0.8rem',
                    }}
                  >
                    ✓
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      ) : (
        <p
          style={{
            margin: 0,
            color: 'var(--color-text-secondary)',
            fontSize: typography.small,
          }}
        >
          Добавьте инпуты в настройках vMix (раздел «Настройка инпутов»).
        </p>
      )}
    </div>
  );
}

export default VMixOverlayButtons;
