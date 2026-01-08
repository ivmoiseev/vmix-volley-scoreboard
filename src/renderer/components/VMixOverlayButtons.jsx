import React from 'react';

const OVERLAY_BUTTONS = [
  { key: 'lineup', label: 'Заявка' },
  { key: 'statistics', label: 'Статистика' },
  { key: 'roster', label: 'Состав' },
  { key: 'startingLineup', label: 'Стартовый состав' },
  { key: 'currentScore', label: 'Текущий счет' },
  { key: 'set1Score', label: 'Счет П1' },
  { key: 'set2Score', label: 'Счет П2' },
  { key: 'set3Score', label: 'Счет П3' },
  { key: 'set4Score', label: 'Счет П4' },
  { key: 'set5Score', label: 'Счет П5' },
  { key: 'referee1', label: 'Судья 1' },
  { key: 'referee2', label: 'Судья 2' },
];

function VMixOverlayButtons({ 
  vmixConfig, 
  connectionStatus, 
  overlayStates, 
  onShowOverlay, 
  onHideOverlay,
  isOverlayActive,
}) {
  const handleButtonClick = async (inputKey) => {
    const isActive = isOverlayActive(inputKey);
    
    if (isActive) {
      const result = await onHideOverlay(inputKey);
      if (result && !result.success) {
        console.error('Ошибка при скрытии оверлея:', result.error);
      }
    } else {
      const result = await onShowOverlay(inputKey);
      if (result && !result.success) {
        console.error('Ошибка при показе оверлея:', result.error);
      }
    }
  };

  if (!vmixConfig) {
    return (
      <div style={{
        padding: '1rem',
        backgroundColor: '#ecf0f1',
        borderRadius: '4px',
        textAlign: 'center',
        color: '#7f8c8d',
      }}>
        Настройки vMix не загружены. Настройте подключение в настройках vMix.
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#ecf0f1',
      padding: '1rem',
      borderRadius: '4px',
    }}>
      <h3 style={{ marginTop: 0 }}>Управление плашками vMix</h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '0.5rem',
      }}>
        {OVERLAY_BUTTONS.map(({ key, label }) => {
          const active = isOverlayActive(key);
          const disabled = !connectionStatus.connected;

          return (
            <button
              key={key}
              onClick={() => handleButtonClick(key)}
              disabled={disabled}
              style={{
                padding: '0.75rem',
                fontSize: '0.9rem',
                backgroundColor: active 
                  ? '#27ae60' 
                  : disabled 
                    ? '#bdc3c7' 
                    : '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontWeight: active ? 'bold' : 'normal',
                position: 'relative',
              }}
              title={disabled ? 'vMix не подключен' : (active ? 'Скрыть плашку' : 'Показать плашку')}
            >
              {label}
              {active && (
                <span style={{
                  position: 'absolute',
                  top: '2px',
                  right: '4px',
                  fontSize: '0.8rem',
                }}>
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
      {!connectionStatus.connected && (
        <p style={{
          marginTop: '0.5rem',
          fontSize: '0.9rem',
          color: '#e74c3c',
          textAlign: 'center',
        }}>
          vMix не подключен
        </p>
      )}
    </div>
  );
}

export default VMixOverlayButtons;

