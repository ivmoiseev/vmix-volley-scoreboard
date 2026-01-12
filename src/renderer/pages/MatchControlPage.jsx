import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMatch } from "../hooks/useMatch";
import { useVMix } from "../hooks/useVMix";
import ScoreDisplay from "../components/ScoreDisplay";
import SetsDisplay from "../components/SetsDisplay";
import ServeControl from "../components/ServeControl";
import ScoreButtons from "../components/ScoreButtons";
import VMixOverlayButtons from "../components/VMixOverlayButtons";

function MatchControlPage({ match: initialMatch, onMatchChange }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Получаем матч из location.state, если initialMatch еще не установлен
  // Это решает проблему гонки условий при первом создании матча
  const matchFromState = location.state?.match;
  const effectiveInitialMatch = initialMatch || matchFromState;

  // Функция для форматирования даты в формат ДД.ММ.ГГГГ
  const formatDate = (dateStr) => {
    if (!dateStr) return "Не указана";
    try {
      // Парсим дату в формате YYYY-MM-DD
      const [year, month, day] = dateStr.split("-");
      if (!year || !month || !day) return dateStr; // Если формат неправильный, возвращаем как есть
      // Форматируем дату в ДД.ММ.ГГГГ
      return `${day}.${month}.${year}`;
    } catch (error) {
      console.error("Ошибка при форматировании даты:", error);
      return dateStr || "Не указана";
    }
  };

  // Отслеживание предыдущего matchId для определения первой загрузки
  const previousMatchIdRef = useRef(null);
  const isFirstLoadRef = useRef(true);

  // Флаг принудительного обновления из location.state (например, при F5)
  const forceUpdateFromState = location.state?.forceUpdateVMix || false;

  // ВСЕ хуки должны вызываться ДО любых условных возвратов
  const {
    match,
    setMatch,
    changeScore,
    changeServingTeam,
    finishSet,
    changeStatistics,
    toggleStatistics,
    undoLastAction,
    isSetballNow,
    setballTeam,
    isMatchballNow,
    matchballTeam,
    canFinish,
    hasHistory,
  } = useMatch(effectiveInitialMatch);

  const {
    vmixConfig,
    connectionStatus,
    overlayStates,
    updateMatchData,
    showOverlay,
    hideOverlay,
    isOverlayActive,
    updateCoachData,
    updateReferee1Data,
    updateReferee2ShowData,
  } = useVMix(match);

  // Синхронизируем match из location.state с родительским компонентом
  useEffect(() => {
    if (matchFromState && !initialMatch) {
      // Если матч пришел из state, но initialMatch еще null, устанавливаем его
      // Это происходит при первом создании матча
      if (onMatchChange) {
        onMatchChange(matchFromState);
      }
      // Очищаем state после использования, чтобы избежать повторной обработки
      window.history.replaceState({}, document.title);
    }
  }, [matchFromState, initialMatch, onMatchChange]);

  // Проверяем наличие матча только после того, как все эффекты отработали
  useEffect(() => {
    // Не делаем редирект сразу, даем время для обработки location.state
    if (!effectiveInitialMatch && !match) {
      const timer = setTimeout(() => {
        // Проверяем еще раз после небольшой задержки
        if (!match && !location.state?.match) {
          navigate("/");
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [match, effectiveInitialMatch, navigate, location.state]);

  // Автоматическое обновление vMix при изменении матча
  useEffect(() => {
    if (match && connectionStatus.connected) {
      // Определяем, является ли это первой загрузкой матча или сменой матча
      const currentMatchId = match.matchId;
      const isNewMatch = previousMatchIdRef.current !== currentMatchId;
      // forceUpdate используется при первой загрузке, смене матча или явном запросе (например, F5)
      const forceUpdate =
        isFirstLoadRef.current || isNewMatch || forceUpdateFromState;

      if (isNewMatch) {
        previousMatchIdRef.current = currentMatchId;
        isFirstLoadRef.current = false;
      }

      console.log(
        "[MatchControlPage] Вызов updateMatchData для обновления vMix:",
        {
          matchId: match.matchId,
          teamA: match.teamA?.name,
          teamB: match.teamB?.name,
          hasLogoA: !!match.teamA?.logo,
          hasLogoB: !!match.teamB?.logo,
          forceUpdate,
          isNewMatch,
        }
      );
      updateMatchData(match, forceUpdate);

      // Очищаем флаг forceUpdateFromState после использования
      if (forceUpdateFromState) {
        window.history.replaceState({}, document.title);
      }
    } else {
      console.log("[MatchControlPage] updateMatchData не вызван:", {
        hasMatch: !!match,
        connected: connectionStatus.connected,
      });
      // Сбрасываем флаг первой загрузки, если нет матча
      if (!match) {
        previousMatchIdRef.current = null;
        isFirstLoadRef.current = true;
      }
    }
  }, [
    match,
    connectionStatus.connected,
    updateMatchData,
    forceUpdateFromState,
  ]);

  // Синхронизируем изменения матча с родительским компонентом
  useEffect(() => {
    if (onMatchChange && match) {
      onMatchChange(match);
    }
  }, [match, onMatchChange]);

  // Синхронизируем матч с мобильным сервером
  useEffect(() => {
    if (match && window.electronAPI) {
      window.electronAPI.setMobileMatch(match);
      window.electronAPI.setCurrentMatch(match);
    }
  }, [match]);

  // Дополнительная синхронизация при изменении подачи
  useEffect(() => {
    if (
      match &&
      match.currentSet &&
      window.electronAPI &&
      window.electronAPI.setMobileMatch
    ) {
      // Используем setTimeout для гарантии, что состояние обновилось
      const timeoutId = setTimeout(() => {
        window.electronAPI.setMobileMatch(match).catch((err) => {
          console.error(
            "Ошибка при синхронизации матча с мобильным сервером:",
            err
          );
        });
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [match?.currentSet?.servingTeam]);

  // Принудительное обновление видимости полей в vMix при изменении подачи
  useEffect(() => {
    if (
      match &&
      match.currentSet &&
      connectionStatus.connected
    ) {
      console.log(
        "[MatchControlPage] Обновление видимости полей при изменении подачи:",
        {
          servingTeam: match.currentSet.servingTeam,
        }
      );
      // Вызываем updateMatchData с forceUpdate=false, но изменения видимости должны быть обнаружены
      // через filterChangedVisibilityFields, так как видимость изменилась
      updateMatchData(match, false);
    }
  }, [match?.currentSet?.servingTeam, connectionStatus.connected, updateMatchData]);

  // Обработка обновления матча из мобильного приложения или при создании/открытии матча
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleLoadMatch = (updatedMatch) => {
      if (updatedMatch) {
        // При загрузке нового матча (создание или открытие) сбрасываем previousMatchIdRef
        // чтобы гарантировать, что updateMatchData будет вызван с forceUpdate=true
        const isNewMatch = previousMatchIdRef.current !== updatedMatch.matchId;
        if (isNewMatch) {
          previousMatchIdRef.current = null; // Сбрасываем, чтобы гарантировать обновление vMix
          isFirstLoadRef.current = true; // Помечаем как первую загрузку
        }
        
        // Обновляем матч в состоянии хука useMatch
        setMatch(updatedMatch);
        // Также обновляем в родительском компоненте
        if (onMatchChange) {
          onMatchChange(updatedMatch);
        }
      }
    };

    const removeLoadMatch = window.electronAPI.onLoadMatch?.(handleLoadMatch);

    return () => {
      removeLoadMatch?.();
    };
  }, [setMatch, onMatchChange]);

  // Отмечаем матч как сохраненный после успешного сохранения
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleMatchSaved = () => {
      if (window.electronAPI.markMatchSaved) {
        window.electronAPI.markMatchSaved();
      }
    };

    const removeMatchSaved =
      window.electronAPI.onMatchSaved?.(handleMatchSaved);

    return () => {
      // Удаляем слушатель при размонтировании компонента
      removeMatchSaved?.();
    };
  }, []);

  // Условный рендеринг ПОСЛЕ всех хуков
  if (!initialMatch || !match) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h2>Матч не загружен</h2>
        <p>Пожалуйста, создайте новый матч или откройте существующий.</p>
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            backgroundColor: "#3498db",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginTop: "1rem",
          }}
        >
          Вернуться на главную
        </button>
      </div>
    );
  }

  const handleFinishSet = () => {
    if (!canFinish) {
      const threshold = match?.currentSet?.setNumber === 5 ? 15 : 25;
      alert(
        `Партия не может быть завершена. Необходимо набрать ${threshold} очков с разницей минимум 2 очка.`
      );
      return;
    }

    if (window.confirm("Завершить текущую партию?")) {
      finishSet();
    }
  };

  return (
    <div style={{ padding: "1rem", maxWidth: "1600px", margin: "0 auto" }}>
      {/* Основной контент: 2/3 слева, 1/3 справа */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)",
          gap: "1rem",
          alignItems: "start",
        }}
      >
        {/* Левая часть (2/3) - Управление матчем */}
        <div>
          {/* Информация о матче */}
          <div
            style={{
              backgroundColor: "#ecf0f1",
              padding: "1rem",
              borderRadius: "4px",
              marginBottom: "1rem",
            }}
          >
            <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
              <div>
                <strong>Турнир:</strong> {match.tournament || "Не указан"}
              </div>
              <div>
                <strong>Место:</strong> {match.venue || "Не указано"}
              </div>
              <div>
                <strong>Дата:</strong> {formatDate(match.date)}
              </div>
              <div>
                <strong>Время:</strong> {match.time || "Не указано"}
              </div>
            </div>
          </div>

          {/* Команды */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                backgroundColor: match.teamA.color || "#3498db",
                color: "white",
                padding: "1rem",
                borderRadius: "4px",
                textAlign: "center",
              }}
            >
              <h3 style={{ marginTop: 0 }}>{match.teamA.name}</h3>
              {match.teamA.coach && <p>Тренер: {match.teamA.coach}</p>}
            </div>
            <div
              style={{
                backgroundColor: match.teamB.color || "#e74c3c",
                color: "white",
                padding: "1rem",
                borderRadius: "4px",
                textAlign: "center",
              }}
            >
              <h3 style={{ marginTop: 0 }}>{match.teamB.name}</h3>
              {match.teamB.coach && <p>Тренер: {match.teamB.coach}</p>}
            </div>
          </div>

          {/* Счет по партиям */}
          <SetsDisplay
            sets={match.sets}
            currentSetNumber={match.currentSet.setNumber}
          />

          {/* Текущий счет */}
          <div
            style={{
              backgroundColor: "#fff",
              border: "2px solid #3498db",
              borderRadius: "4px",
              padding: "1rem",
              marginBottom: "1rem",
            }}
          >
            <h3 style={{ textAlign: "center", marginTop: 0 }}>
              Партия #{match.currentSet.setNumber}
            </h3>
            <ScoreDisplay
              teamA={match.teamA.name}
              teamB={match.teamB.name}
              scoreA={match.currentSet.scoreA}
              scoreB={match.currentSet.scoreB}
              servingTeam={match.currentSet.servingTeam}
              isSetball={isSetballNow}
              setballTeam={setballTeam}
              isMatchball={isMatchballNow}
              matchballTeam={matchballTeam}
              teamALogo={match.teamA.logo}
              teamBLogo={match.teamB.logo}
            />
            <ServeControl
              servingTeam={match.currentSet.servingTeam}
              teamAName={match.teamA.name}
              teamBName={match.teamB.name}
              onChange={changeServingTeam}
            />
          </div>

          {/* Кнопки управления счетом */}
          <ScoreButtons
            teamAName={match.teamA.name}
            teamBName={match.teamB.name}
            onScoreChange={changeScore}
          />

          {/* Кнопки управления партией */}
          <div
            style={{
              display: "flex",
              gap: "1rem",
              justifyContent: "center",
              marginBottom: "1rem",
            }}
          >
            <button
              onClick={handleFinishSet}
              disabled={!canFinish}
              style={{
                padding: "0.75rem 1.5rem",
                fontSize: "1rem",
                backgroundColor: canFinish ? "#27ae60" : "#95a5a6",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: canFinish ? "pointer" : "not-allowed",
                fontWeight: "bold",
              }}
            >
              Завершить партию
            </button>
            <button
              onClick={undoLastAction}
              disabled={!hasHistory}
              style={{
                padding: "0.75rem 1.5rem",
                fontSize: "1rem",
                backgroundColor: hasHistory ? "#e74c3c" : "#95a5a6",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: hasHistory ? "pointer" : "not-allowed",
              }}
            >
              Отменить последнее действие
            </button>
          </div>

          {/* Расширенная статистика */}
          <div
            style={{
              backgroundColor: "#ecf0f1",
              padding: "1rem",
              borderRadius: "4px",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginBottom: match.statistics.enabled ? "1rem" : 0,
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={match.statistics.enabled}
                  onChange={(e) => toggleStatistics(e.target.checked)}
                />
                <span>Расширенная статистика</span>
              </label>
            </div>

            {match.statistics.enabled && (
              <div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div>
                    <h4>{match.teamA.name}</h4>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "0.5rem",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.25rem",
                            marginBottom: "0.25rem",
                          }}
                        >
                          <button
                            onClick={(e) =>
                              changeStatistics("A", "attack", -1, e)
                            }
                            style={{
                              flex: 1,
                              padding: "0.5rem",
                              backgroundColor: "#e74c3c",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            -1
                          </button>
                          <button
                            onClick={(e) =>
                              changeStatistics("A", "attack", 1, e)
                            }
                            style={{
                              flex: 1,
                              padding: "0.5rem",
                              backgroundColor: "#27ae60",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            +1
                          </button>
                        </div>
                        <div
                          style={{ textAlign: "center", fontWeight: "bold" }}
                        >
                          Атака: {match.statistics.teamA.attack}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.25rem",
                            marginBottom: "0.25rem",
                          }}
                        >
                          <button
                            onClick={(e) =>
                              changeStatistics("A", "block", -1, e)
                            }
                            style={{
                              flex: 1,
                              padding: "0.5rem",
                              backgroundColor: "#e74c3c",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            -1
                          </button>
                          <button
                            onClick={(e) =>
                              changeStatistics("A", "block", 1, e)
                            }
                            style={{
                              flex: 1,
                              padding: "0.5rem",
                              backgroundColor: "#27ae60",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            +1
                          </button>
                        </div>
                        <div
                          style={{ textAlign: "center", fontWeight: "bold" }}
                        >
                          Блок: {match.statistics.teamA.block}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.25rem",
                            marginBottom: "0.25rem",
                          }}
                        >
                          <button
                            onClick={(e) =>
                              changeStatistics("A", "serve", -1, e)
                            }
                            style={{
                              flex: 1,
                              padding: "0.5rem",
                              backgroundColor: "#e74c3c",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            -1
                          </button>
                          <button
                            onClick={(e) =>
                              changeStatistics("A", "serve", 1, e)
                            }
                            style={{
                              flex: 1,
                              padding: "0.5rem",
                              backgroundColor: "#27ae60",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            +1
                          </button>
                        </div>
                        <div
                          style={{ textAlign: "center", fontWeight: "bold" }}
                        >
                          Подачи: {match.statistics.teamA.serve}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.25rem",
                            marginBottom: "0.25rem",
                          }}
                        >
                          <button
                            onClick={(e) =>
                              changeStatistics("A", "opponentErrors", -1, e)
                            }
                            style={{
                              flex: 1,
                              padding: "0.5rem",
                              backgroundColor: "#e74c3c",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            -1
                          </button>
                          <button
                            onClick={(e) =>
                              changeStatistics("A", "opponentErrors", 1, e)
                            }
                            style={{
                              flex: 1,
                              padding: "0.5rem",
                              backgroundColor: "#27ae60",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            +1
                          </button>
                        </div>
                        <div
                          style={{ textAlign: "center", fontWeight: "bold" }}
                        >
                          Ошибки соперника:{" "}
                          {match.statistics.teamA.opponentErrors}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4>{match.teamB.name}</h4>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "0.5rem",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.25rem",
                            marginBottom: "0.25rem",
                          }}
                        >
                          <button
                            onClick={(e) =>
                              changeStatistics("B", "attack", -1, e)
                            }
                            style={{
                              flex: 1,
                              padding: "0.5rem",
                              backgroundColor: "#e74c3c",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            -1
                          </button>
                          <button
                            onClick={(e) =>
                              changeStatistics("B", "attack", 1, e)
                            }
                            style={{
                              flex: 1,
                              padding: "0.5rem",
                              backgroundColor: "#27ae60",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            +1
                          </button>
                        </div>
                        <div
                          style={{ textAlign: "center", fontWeight: "bold" }}
                        >
                          Атака: {match.statistics.teamB.attack}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.25rem",
                            marginBottom: "0.25rem",
                          }}
                        >
                          <button
                            onClick={(e) =>
                              changeStatistics("B", "block", -1, e)
                            }
                            style={{
                              flex: 1,
                              padding: "0.5rem",
                              backgroundColor: "#e74c3c",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            -1
                          </button>
                          <button
                            onClick={(e) =>
                              changeStatistics("B", "block", 1, e)
                            }
                            style={{
                              flex: 1,
                              padding: "0.5rem",
                              backgroundColor: "#27ae60",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            +1
                          </button>
                        </div>
                        <div
                          style={{ textAlign: "center", fontWeight: "bold" }}
                        >
                          Блок: {match.statistics.teamB.block}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.25rem",
                            marginBottom: "0.25rem",
                          }}
                        >
                          <button
                            onClick={(e) =>
                              changeStatistics("B", "serve", -1, e)
                            }
                            style={{
                              flex: 1,
                              padding: "0.5rem",
                              backgroundColor: "#e74c3c",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            -1
                          </button>
                          <button
                            onClick={(e) =>
                              changeStatistics("B", "serve", 1, e)
                            }
                            style={{
                              flex: 1,
                              padding: "0.5rem",
                              backgroundColor: "#27ae60",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            +1
                          </button>
                        </div>
                        <div
                          style={{ textAlign: "center", fontWeight: "bold" }}
                        >
                          Подачи: {match.statistics.teamB.serve}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.25rem",
                            marginBottom: "0.25rem",
                          }}
                        >
                          <button
                            onClick={(e) =>
                              changeStatistics("B", "opponentErrors", -1, e)
                            }
                            style={{
                              flex: 1,
                              padding: "0.5rem",
                              backgroundColor: "#e74c3c",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            -1
                          </button>
                          <button
                            onClick={(e) =>
                              changeStatistics("B", "opponentErrors", 1, e)
                            }
                            style={{
                              flex: 1,
                              padding: "0.5rem",
                              backgroundColor: "#27ae60",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            +1
                          </button>
                        </div>
                        <div
                          style={{ textAlign: "center", fontWeight: "bold" }}
                        >
                          Ошибки соперника:{" "}
                          {match.statistics.teamB.opponentErrors}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Правая часть (1/3) - Управление vMix */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            position: "sticky",
            top: "1rem",
          }}
        >
          {/* Управление плашками vMix */}
          <VMixOverlayButtons
            vmixConfig={vmixConfig}
            connectionStatus={connectionStatus}
            overlayStates={overlayStates}
            onShowOverlay={showOverlay}
            onHideOverlay={hideOverlay}
            isOverlayActive={isOverlayActive}
            match={match}
            onUpdateCoachData={updateCoachData}
            onUpdateReferee1Data={updateReferee1Data}
            onUpdateReferee2ShowData={updateReferee2ShowData}
          />

          {/* Статус подключения к vMix */}
          <div
            style={{
              padding: "0.75rem 1rem",
              backgroundColor: connectionStatus.connected
                ? "#27ae60"
                : "#e74c3c",
              color: "white",
              borderRadius: "4px",
              textAlign: "center",
              fontSize: "0.95rem",
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: "0.25rem" }}>
              vMix
            </div>
            <div>{connectionStatus.message}</div>
          </div>

          {/* Кнопка настроек vMix */}
          <button
            onClick={() => navigate("/vmix/settings")}
            style={{
              padding: "0.75rem 1rem",
              fontSize: "1rem",
              backgroundColor: "#16a085",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
              width: "100%",
            }}
          >
            Настройки vMix
          </button>
        </div>
      </div>

      {/* Навигация (внизу страницы, на всю ширину) */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          justifyContent: "center",
          marginTop: "1rem",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => navigate("/match/settings")}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            backgroundColor: "#3498db",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Настройки матча
        </button>
        <button
          onClick={() => navigate("/match/roster")}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            backgroundColor: "#9b59b6",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Управление составами
        </button>
        <button
          onClick={() => navigate("/mobile/access")}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            backgroundColor: "#f39c12",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Мобильный доступ
        </button>
      </div>
    </div>
  );
}

export default MatchControlPage;
