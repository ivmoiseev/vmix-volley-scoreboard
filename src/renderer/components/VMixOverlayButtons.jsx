
const OVERLAY_BUTTONS = [
  { key: "lineup", label: "Заявка" },
  { key: "statistics", label: "Статистика" },
  { key: "rosterTeamA", label: "Состав А" },
  { key: "rosterTeamB", label: "Состав Б" },
  { key: "startingLineupTeamA", label: "Старт. А" },
  { key: "startingLineupTeamB", label: "Старт. Б" },
  { key: "coachTeamA", label: "Тренер А", usesInput: "referee1" },
  { key: "coachTeamB", label: "Тренер Б", usesInput: "referee1" },
  { key: "referee1Show", label: "Первый судья", usesInput: "referee1" },
  { key: "referee2Show", label: "Второй судья", usesInput: "referee1" },
  { key: "referee2", label: "Два судьи" },
  { key: "currentScore", label: "Текущий счет" },
  { key: "set1Score", label: "Счет П1" },
  { key: "set2Score", label: "Счет П2" },
  { key: "set3Score", label: "Счет П3" },
  { key: "set4Score", label: "Счет П4" },
  { key: "set5Score", label: "Счет П5" },
];

function VMixOverlayButtons({
  vmixConfig,
  connectionStatus,
  overlayStates: _overlayStates,
  onShowOverlay,
  onHideOverlay,
  isOverlayActive,
  match,
  onUpdateCoachData,
  onUpdateReferee1Data,
  onUpdateReferee2ShowData,
}) {
  const handleButtonClick = async (buttonConfig) => {
    const buttonKey = buttonConfig.key;
    const inputKey = buttonConfig.usesInput || buttonConfig.key;
    const isActive = isOverlayActive(inputKey, buttonKey);

    if (isActive) {
      const result = await onHideOverlay(inputKey);
      if (result && !result.success) {
        console.error("Ошибка при скрытии оверлея:", result.error);
      }
    } else {
      // Для кнопок тренера сначала обновляем данные
      if (
        buttonConfig.key === "coachTeamA" ||
        buttonConfig.key === "coachTeamB"
      ) {
        if (onUpdateCoachData && match) {
          const team = buttonConfig.key === "coachTeamA" ? "A" : "B";
          const updateResult = await onUpdateCoachData(match, team, inputKey);
          if (!updateResult.success) {
            console.error(
              "Ошибка при обновлении данных тренера:",
              updateResult.error
            );
            alert(`Не удалось обновить данные тренера: ${updateResult.error}`);
            return;
          }
        }
      }

      // Для кнопки первого судьи сначала обновляем данные
      if (buttonConfig.key === "referee1Show") {
        if (onUpdateReferee1Data && match) {
          const updateResult = await onUpdateReferee1Data(match, inputKey);
          if (!updateResult.success) {
            console.error(
              "Ошибка при обновлении данных первого судьи:",
              updateResult.error
            );
            alert(
              `Не удалось обновить данные первого судьи: ${updateResult.error}`
            );
            return;
          }
        }
      }

      // Для кнопки второго судьи сначала обновляем данные
      if (buttonConfig.key === "referee2Show") {
        if (onUpdateReferee2ShowData && match) {
          const updateResult = await onUpdateReferee2ShowData(match, inputKey);
          if (!updateResult.success) {
            console.error(
              "Ошибка при обновлении данных второго судьи:",
              updateResult.error
            );
            alert(
              `Не удалось обновить данные второго судьи: ${updateResult.error}`
            );
            return;
          }
        }
      }

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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.5rem",
        }}
      >
        {OVERLAY_BUTTONS.map((buttonConfig) => {
          const { key, label, usesInput } = buttonConfig;
          const buttonKey = key;
          const actualInputKey = usesInput || key;
          
          // Сначала проверяем активность кнопки
          // Это важно для правильной установки активной кнопки при внешней активации через vMix
          const active = isOverlayActive(actualInputKey, buttonKey);
          
          const inputConfig = vmixConfig?.inputs?.[actualInputKey];
          // Инпут считается включенным, если он существует и enabled !== false
          // По умолчанию (если enabled не задан) инпут включен
          const isInputEnabled = inputConfig && inputConfig.enabled !== false;
          const isVMixConnected = connectionStatus.connected;

          // Для инпутов "Счет после X партии" проверяем, завершена ли партия
          let isButtonDisabled = false;
          if (key.startsWith('set') && key.endsWith('Score')) {
            const setNumber = parseInt(key.replace('set', '').replace('Score', ''), 10);
            if (!isNaN(setNumber)) {
              // Проверяем, завершена ли партия с этим номером
              const completedSets = match?.sets?.filter(
                set => set.setNumber <= setNumber && 
                (set.status === 'completed' || set.completed === true)
              ) || [];
              const isSetCompleted = completedSets.some(set => set.setNumber === setNumber);
              isButtonDisabled = !isSetCompleted;
            }
          }

          // Для кнопок тренера и судей проверяем наличие данных
          let isDataAvailable = true;
          if (key === "coachTeamA") {
            isDataAvailable = !!match?.teamA?.coach;
          } else if (key === "coachTeamB") {
            isDataAvailable = !!match?.teamB?.coach;
          } else if (key === "referee1Show") {
            isDataAvailable = !!match?.officials?.referee1;
          } else if (key === "referee2Show") {
            isDataAvailable = !!match?.officials?.referee2;
          }

          // Проверяем, не заблокирована ли кнопка (если другой buttonKey того же инпута активен)
          // Кнопка заблокирована, если инпут активен, но активна другая кнопка (не эта)
          let isBlocked = false;
          if (usesInput && !active) {
            // Проверяем все другие кнопки, использующие тот же инпут
            const buttonsUsingSameInput = OVERLAY_BUTTONS.filter(
              (btn) =>
                (btn.usesInput || btn.key) === actualInputKey &&
                btn.key !== buttonKey
            );
            // Проверяем, активна ли хотя бы одна из других кнопок
            // Используем проверку без изменения состояния (read-only проверка)
            isBlocked = buttonsUsingSameInput.some((btn) => {
              // Проверяем активность другой кнопки
              // Это может установить активную кнопку, если она еще не установлена,
              // но это нормально, так как мы уже проверили текущую кнопку
              return isOverlayActive(actualInputKey, btn.key);
            });
          }

          // Кнопка disabled если: vMix не подключен, инпут отключен, нет нужных данных, заблокирована другой активной кнопкой, или партия не завершена (для инпутов "Счет после X партии")
          const disabled =
            !isVMixConnected ||
            !isInputEnabled ||
            !isDataAvailable ||
            isBlocked ||
            isButtonDisabled;

          // Определяем причину отключения для tooltip
          let tooltipText = "";
          if (!isVMixConnected) {
            tooltipText = "vMix не подключен";
          } else if (!inputConfig) {
            tooltipText = "Инпут не настроен";
          } else if (!isInputEnabled) {
            tooltipText = "Инпут отключен в настройках";
          } else if (isButtonDisabled) {
            const setNumber = key.replace('set', '').replace('Score', '');
            tooltipText = `Партия ${setNumber} еще не завершена`;
          } else if (!isDataAvailable) {
            if (key === "coachTeamA" || key === "coachTeamB") {
              tooltipText = "Тренер не указан";
            } else if (key === "referee1Show") {
              tooltipText = "Первый судья не указан";
            } else if (key === "referee2Show") {
              tooltipText = "Второй судья не указан";
            }
          } else if (isBlocked) {
            tooltipText = "Другая плашка этого инпута активна";
          } else if (active) {
            tooltipText = "Скрыть плашку";
          } else {
            tooltipText = "Показать плашку";
          }

          return (
            <button
              key={key}
              onClick={() => handleButtonClick(buttonConfig)}
              disabled={disabled}
              style={{
                padding: "0.75rem",
                fontSize: "0.9rem",
                backgroundColor: active
                  ? "#27ae60"
                  : disabled
                  ? "#bdc3c7"
                  : "#3498db",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: disabled ? "not-allowed" : "pointer",
                fontWeight: active ? "bold" : "normal",
                position: "relative",
                opacity:
                  disabled && !isVMixConnected ? 0.6 : disabled ? 0.5 : 1,
              }}
              title={tooltipText}
            >
              {label}
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
