import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMatch } from '../hooks/useMatch';
import { useVMix } from '../hooks/useVMix';
import ScoreDisplay from '../components/ScoreDisplay';
import SetsDisplay from '../components/SetsDisplay';
import ServeControl from '../components/ServeControl';
import ScoreButtons from '../components/ScoreButtons';
import VMixOverlayButtons from '../components/VMixOverlayButtons';

function MatchControlPage({ match: initialMatch, onMatchChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Получаем матч из location.state, если initialMatch еще не установлен
  // Это решает проблему гонки условий при первом создании матча
  const matchFromState = location.state?.match;
  const effectiveInitialMatch = initialMatch || matchFromState;
  
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
          navigate('/');
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [match, effectiveInitialMatch, navigate, location.state]);

  // Автоматическое обновление vMix при изменении матча
  useEffect(() => {
    if (match && connectionStatus.connected) {
      updateMatchData(match);
    }
  }, [match, connectionStatus.connected, updateMatchData]);

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

  // Обработка обновления матча из мобильного приложения
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleLoadMatch = (updatedMatch) => {
      if (updatedMatch) {
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

    const removeMatchSaved = window.electronAPI.onMatchSaved?.(handleMatchSaved);

    return () => {
      // Удаляем слушатель при размонтировании компонента
      removeMatchSaved?.();
    };
  }, []);

  // Условный рендеринг ПОСЛЕ всех хуков
  if (!initialMatch || !match) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Матч не загружен</h2>
        <p>Пожалуйста, создайте новый матч или откройте существующий.</p>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '1rem',
          }}
        >
          Вернуться на главную
        </button>
      </div>
    );
  }

  const handleSaveMatch = async () => {
    try {
      if (!window.electronAPI) {
        alert('Electron API недоступен');
        return;
      }

      const result = await window.electronAPI.saveMatch(match);
      if (result.success) {
        alert('Матч успешно сохранен!');
        setMatch({ ...match, updatedAt: new Date().toISOString() });
        // Отмечаем как сохраненный
        if (window.electronAPI.markMatchSaved) {
          window.electronAPI.markMatchSaved();
        }
      }
    } catch (error) {
      console.error('Ошибка при сохранении матча:', error);
      alert('Не удалось сохранить матч: ' + error.message);
    }
  };

  const handleSaveAsMatch = async () => {
    try {
      if (!window.electronAPI) {
        alert('Electron API недоступен');
        return;
      }

      const result = await window.electronAPI.saveMatchDialog(match);
      if (result.success) {
        alert('Матч успешно сохранен!');
        setMatch({ ...match, updatedAt: new Date().toISOString() });
        // Отмечаем как сохраненный
        if (window.electronAPI.markMatchSaved) {
          window.electronAPI.markMatchSaved();
        }
      }
    } catch (error) {
      console.error('Ошибка при сохранении матча:', error);
      alert('Не удалось сохранить матч: ' + error.message);
    }
  };

  const handleFinishSet = () => {
    if (!canFinish) {
      const threshold = match?.currentSet?.setNumber === 5 ? 15 : 25;
      alert(`Партия не может быть завершена. Необходимо набрать ${threshold} очков с разницей минимум 2 очка.`);
      return;
    }
    
    if (window.confirm('Завершить текущую партию?')) {
      finishSet();
    }
  };

  return (
    <div style={{ padding: '1rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Заголовок с кнопками сохранения */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <h2 style={{ margin: 0 }}>Управление матчем</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleSaveMatch}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Сохранить
          </button>
          <button
            onClick={handleSaveAsMatch}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#95a5a6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Сохранить как...
          </button>
        </div>
      </div>

      {/* Информация о матче */}
      <div style={{ 
        backgroundColor: '#ecf0f1', 
        padding: '1rem', 
        borderRadius: '4px',
        marginBottom: '1rem',
      }}>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div><strong>Турнир:</strong> {match.tournament || 'Не указан'}</div>
          <div><strong>Место:</strong> {match.venue || 'Не указано'}</div>
          <div><strong>Дата:</strong> {match.date || 'Не указана'}</div>
          <div><strong>Время:</strong> {match.time || 'Не указано'}</div>
        </div>
      </div>

      {/* Команды */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '1rem',
        marginBottom: '1rem',
      }}>
        <div style={{ 
          backgroundColor: match.teamA.color || '#3498db', 
          color: 'white',
          padding: '1rem',
          borderRadius: '4px',
          textAlign: 'center',
        }}>
          <h3 style={{ marginTop: 0 }}>{match.teamA.name}</h3>
          {match.teamA.coach && <p>Тренер: {match.teamA.coach}</p>}
        </div>
        <div style={{ 
          backgroundColor: match.teamB.color || '#e74c3c', 
          color: 'white',
          padding: '1rem',
          borderRadius: '4px',
          textAlign: 'center',
        }}>
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
      <div style={{
        backgroundColor: '#fff',
        border: '2px solid #3498db',
        borderRadius: '4px',
        padding: '1rem',
        marginBottom: '1rem',
      }}>
        <h3 style={{ textAlign: 'center', marginTop: 0 }}>
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
      <div style={{
        display: 'flex',
        gap: '1rem',
        justifyContent: 'center',
        marginBottom: '1rem',
      }}>
        <button
          onClick={handleFinishSet}
          disabled={!canFinish}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: canFinish ? '#27ae60' : '#95a5a6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: canFinish ? 'pointer' : 'not-allowed',
            fontWeight: 'bold',
          }}
        >
          Завершить партию
        </button>
        <button
          onClick={undoLastAction}
          disabled={!hasHistory}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: hasHistory ? '#e74c3c' : '#95a5a6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: hasHistory ? 'pointer' : 'not-allowed',
          }}
        >
          Отменить последнее действие
        </button>
      </div>

      {/* Расширенная статистика */}
      <div style={{
        backgroundColor: '#ecf0f1',
        padding: '1rem',
        borderRadius: '4px',
        marginBottom: '1rem',
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem',
          marginBottom: match.statistics.enabled ? '1rem' : 0,
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
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
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '1rem',
              marginBottom: '1rem',
            }}>
              <div>
                <h4>{match.teamA.name}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.25rem' }}>
                      <button
                        onClick={(e) => changeStatistics('A', 'attack', -1, e)}
                        style={{ flex: 1, padding: '0.5rem', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        -1
                      </button>
                      <button
                        onClick={(e) => changeStatistics('A', 'attack', 1, e)}
                        style={{ flex: 1, padding: '0.5rem', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        +1
                      </button>
                    </div>
                    <div style={{ textAlign: 'center', fontWeight: 'bold' }}>Атака: {match.statistics.teamA.attack}</div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.25rem' }}>
                      <button
                        onClick={(e) => changeStatistics('A', 'block', -1, e)}
                        style={{ flex: 1, padding: '0.5rem', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        -1
                      </button>
                      <button
                        onClick={(e) => changeStatistics('A', 'block', 1, e)}
                        style={{ flex: 1, padding: '0.5rem', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        +1
                      </button>
                    </div>
                    <div style={{ textAlign: 'center', fontWeight: 'bold' }}>Блок: {match.statistics.teamA.block}</div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.25rem' }}>
                      <button
                        onClick={(e) => changeStatistics('A', 'serve', -1, e)}
                        style={{ flex: 1, padding: '0.5rem', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        -1
                      </button>
                      <button
                        onClick={(e) => changeStatistics('A', 'serve', 1, e)}
                        style={{ flex: 1, padding: '0.5rem', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        +1
                      </button>
                    </div>
                    <div style={{ textAlign: 'center', fontWeight: 'bold' }}>Подачи: {match.statistics.teamA.serve}</div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.25rem' }}>
                      <button
                        onClick={(e) => changeStatistics('A', 'opponentErrors', -1, e)}
                        style={{ flex: 1, padding: '0.5rem', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        -1
                      </button>
                      <button
                        onClick={(e) => changeStatistics('A', 'opponentErrors', 1, e)}
                        style={{ flex: 1, padding: '0.5rem', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        +1
                      </button>
                    </div>
                    <div style={{ textAlign: 'center', fontWeight: 'bold' }}>Ошибки соперника: {match.statistics.teamA.opponentErrors}</div>
                  </div>
                </div>
              </div>
              <div>
                <h4>{match.teamB.name}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.25rem' }}>
                      <button
                        onClick={(e) => changeStatistics('B', 'attack', -1, e)}
                        style={{ flex: 1, padding: '0.5rem', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        -1
                      </button>
                      <button
                        onClick={(e) => changeStatistics('B', 'attack', 1, e)}
                        style={{ flex: 1, padding: '0.5rem', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        +1
                      </button>
                    </div>
                    <div style={{ textAlign: 'center', fontWeight: 'bold' }}>Атака: {match.statistics.teamB.attack}</div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.25rem' }}>
                      <button
                        onClick={(e) => changeStatistics('B', 'block', -1, e)}
                        style={{ flex: 1, padding: '0.5rem', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        -1
                      </button>
                      <button
                        onClick={(e) => changeStatistics('B', 'block', 1, e)}
                        style={{ flex: 1, padding: '0.5rem', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        +1
                      </button>
                    </div>
                    <div style={{ textAlign: 'center', fontWeight: 'bold' }}>Блок: {match.statistics.teamB.block}</div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.25rem' }}>
                      <button
                        onClick={(e) => changeStatistics('B', 'serve', -1, e)}
                        style={{ flex: 1, padding: '0.5rem', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        -1
                      </button>
                      <button
                        onClick={(e) => changeStatistics('B', 'serve', 1, e)}
                        style={{ flex: 1, padding: '0.5rem', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        +1
                      </button>
                    </div>
                    <div style={{ textAlign: 'center', fontWeight: 'bold' }}>Подачи: {match.statistics.teamB.serve}</div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.25rem' }}>
                      <button
                        onClick={(e) => changeStatistics('B', 'opponentErrors', -1, e)}
                        style={{ flex: 1, padding: '0.5rem', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        -1
                      </button>
                      <button
                        onClick={(e) => changeStatistics('B', 'opponentErrors', 1, e)}
                        style={{ flex: 1, padding: '0.5rem', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        +1
                      </button>
                    </div>
                    <div style={{ textAlign: 'center', fontWeight: 'bold' }}>Ошибки соперника: {match.statistics.teamB.opponentErrors}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Управление плашками vMix */}
      <VMixOverlayButtons
        vmixConfig={vmixConfig}
        connectionStatus={connectionStatus}
        overlayStates={overlayStates}
        onShowOverlay={showOverlay}
        onHideOverlay={hideOverlay}
        isOverlayActive={isOverlayActive}
      />

      {/* Статус подключения к vMix */}
      <div style={{
        padding: '0.5rem 1rem',
        backgroundColor: connectionStatus.connected ? '#27ae60' : '#e74c3c',
        color: 'white',
        borderRadius: '4px',
        textAlign: 'center',
        marginBottom: '1rem',
        marginTop: '1rem',
      }}>
        Статус: {connectionStatus.message}
      </div>

      {/* Навигация */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        justifyContent: 'center',
      }}>
        <button
          onClick={() => navigate('/match/settings')}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Настройки матча
        </button>
        <button
          onClick={() => navigate('/match/roster')}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: '#9b59b6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Управление составами
        </button>
        <button
          onClick={() => navigate('/vmix/settings')}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: '#16a085',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Настройки vMix
        </button>
        <button
          onClick={() => navigate('/mobile/access')}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: '#f39c12',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Мобильный доступ
        </button>
      </div>
    </div>
  );
}

export default MatchControlPage;
