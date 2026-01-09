import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useVMix } from '../hooks/useVMix';

const POSITIONS = [
  'Нападающий',
  'Связующий',
  'Доигровщик',
  'Центральный блокирующий',
  'Либеро',
  'Другое',
];

function RosterManagementPage({ match: propMatch, onMatchChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const matchFromState = location.state?.match;

  // Используем match из пропсов, затем из state
  const [match, setMatch] = useState(propMatch || matchFromState || null);
  
  // Получаем updateMatchData из useVMix для принудительного обновления при сохранении
  const { updateMatchData, connectionStatus } = useVMix(match);
  
  const [selectedTeam, setSelectedTeam] = useState('A');
  const [roster, setRoster] = useState([]);

  // Обновляем match при изменении propMatch или matchFromState
  useEffect(() => {
    if (propMatch) {
      setMatch(propMatch);
    } else if (matchFromState) {
      setMatch(matchFromState);
    }
  }, [propMatch, matchFromState]);

  useEffect(() => {
    if (!match) {
      // Не делаем редирект сразу, даем время загрузить матч
      const timer = setTimeout(() => {
        if (!match) {
          navigate('/');
        }
      }, 100);
      return () => clearTimeout(timer);
    }

    updateRoster();
  }, [match, selectedTeam, navigate]);

  const updateRoster = () => {
    const team = selectedTeam === 'A' ? match.teamA : match.teamB;
    setRoster(team.roster || []);
  };

  const handleAddPlayer = () => {
    // Генерируем следующий номер, учитывая, что могут быть игроки без номера (null/undefined)
    let nextNumber = 1;
    if (roster.length > 0) {
      const numbers = roster
        .map(p => p.number)
        .filter(num => num != null && !isNaN(num) && num > 0);
      if (numbers.length > 0) {
        nextNumber = Math.max(...numbers) + 1;
      }
    }

    const newPlayer = {
      number: nextNumber,
      name: '',
      position: POSITIONS[0],
      isStarter: false,
    };

    const updatedRoster = [...roster, newPlayer];
    updateTeamRoster(updatedRoster);
  };

  const handleRemovePlayer = (index) => {
    const updatedRoster = roster.filter((_, i) => i !== index);
    updateTeamRoster(updatedRoster);
  };

  const handlePlayerChange = (index, field, value) => {
    const updatedRoster = roster.map((player, i) => {
      if (i === index) {
        // Для номера игрока: разрешаем пустое значение (null) и проверяем, что значение не отрицательное
        if (field === 'number') {
          // Если значение null, undefined или пустая строка, разрешаем отсутствие номера
          if (value === null || value === undefined || value === '') {
            return { ...player, [field]: null };
          }
          const numValue = parseInt(value, 10);
          // Если значение не число или отрицательное, устанавливаем null (без номера)
          if (isNaN(numValue) || numValue < 0) {
            return { ...player, [field]: null };
          }
          return { ...player, [field]: numValue };
        }
        return { ...player, [field]: value };
      }
      return player;
    });
    updateTeamRoster(updatedRoster);
  };

  const handleToggleStarter = (index) => {
    const updatedRoster = roster.map((player, i) => {
      if (i === index) {
        return { ...player, isStarter: !player.isStarter };
      }
      return player;
    });
    updateTeamRoster(updatedRoster);
  };

  const updateTeamRoster = (newRoster) => {
    setRoster(newRoster);
    
    const updatedMatch = { ...match };
    if (selectedTeam === 'A') {
      updatedMatch.teamA = {
        ...updatedMatch.teamA,
        roster: newRoster,
      };
    } else {
      updatedMatch.teamB = {
        ...updatedMatch.teamB,
        roster: newRoster,
      };
    }
    updatedMatch.updatedAt = new Date().toISOString();
    setMatch(updatedMatch);
    
    // Обновляем матч в родительском компоненте и Electron API
    if (onMatchChange) {
      onMatchChange(updatedMatch);
    }
    
    if (window.electronAPI) {
      window.electronAPI.setCurrentMatch(updatedMatch).catch(err => {
        console.error('Ошибка при обновлении матча:', err);
      });
      window.electronAPI.setMobileMatch(updatedMatch).catch(err => {
        console.error('Ошибка при обновлении мобильного матча:', err);
      });
    }
  };


  const handleSave = async () => {
    if (!match) return;
    
    // Обновляем матч в Electron API
    if (window.electronAPI) {
      try {
        await window.electronAPI.setCurrentMatch(match);
        await window.electronAPI.setMobileMatch(match);
      } catch (error) {
        console.error('Ошибка при сохранении матча:', error);
      }
    }
    
    // Обновляем матч в родительском компоненте
    if (onMatchChange) {
      onMatchChange(match);
    }
    
    // Принудительно обновляем все данные в vMix при сохранении списков команд
    if (connectionStatus.connected) {
      updateMatchData(match, true);
    }
    
    navigate('/match', { state: { match } });
  };

  const handleExportRoster = () => {
    const team = selectedTeam === 'A' ? match.teamA : match.teamB;
    // Экспортируем состав и тренера вместе
    const exportData = {
      coach: team.coach || '',
      roster: team.roster || [],
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `roster_${team.name}_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportRoster = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        
        // Проверяем формат: объект с полями coach и roster
        if (!importedData.roster || !Array.isArray(importedData.roster)) {
          alert('Некорректный формат файла. Ожидается объект с полями "roster" (массив) и "coach" (строка)');
          return;
        }
        
        const importedRoster = importedData.roster;
        const importedCoach = importedData.coach || '';
        
        // Обновляем состав
        updateTeamRoster(importedRoster);
        
        // Обновляем тренера
        const updatedMatch = { ...match };
        if (selectedTeam === 'A') {
          updatedMatch.teamA = {
            ...updatedMatch.teamA,
            coach: importedCoach,
          };
        } else {
          updatedMatch.teamB = {
            ...updatedMatch.teamB,
            coach: importedCoach,
          };
        }
        updatedMatch.updatedAt = new Date().toISOString();
        setMatch(updatedMatch);
        
        // Обновляем матч в родительском компоненте и Electron API
        if (onMatchChange) {
          onMatchChange(updatedMatch);
        }
        
        if (window.electronAPI) {
          window.electronAPI.setCurrentMatch(updatedMatch).catch(err => {
            console.error('Ошибка при обновлении матча:', err);
          });
          window.electronAPI.setMobileMatch(updatedMatch).catch(err => {
            console.error('Ошибка при обновлении мобильного матча:', err);
          });
        }
        
        alert('Состав и тренер успешно импортированы!');
      } catch (error) {
        alert('Ошибка при чтении файла: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  if (!match) {
    return null;
  }

  const team = selectedTeam === 'A' ? match.teamA : match.teamB;
  const starters = roster.filter(p => p.isStarter);

  return (
    <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>Управление составами команд</h2>

      {/* Выбор команды */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <button
          onClick={() => setSelectedTeam('A')}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: selectedTeam === 'A' ? match.teamA.color : '#95a5a6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: selectedTeam === 'A' ? 'bold' : 'normal',
          }}
        >
          {match.teamA.name}
        </button>
        <button
          onClick={() => setSelectedTeam('B')}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: selectedTeam === 'B' ? match.teamB.color : '#95a5a6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: selectedTeam === 'B' ? 'bold' : 'normal',
          }}
        >
          {match.teamB.name}
        </button>
      </div>

      {/* Состав команды */}
      <div style={{
        backgroundColor: '#ecf0f1',
        padding: '1.5rem',
        borderRadius: '4px',
        marginBottom: '1.5rem',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}>
          <h3 style={{ marginTop: 0 }}>Состав команды</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <label style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#27ae60',
              color: 'white',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'inline-block',
            }}>
              Импорт
              <input
                type="file"
                accept=".json"
                onChange={handleImportRoster}
                style={{ display: 'none' }}
              />
            </label>
            <button
              onClick={handleExportRoster}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Экспорт
            </button>
            <button
              onClick={handleAddPlayer}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#27ae60',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Добавить игрока
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: 'white',
            borderRadius: '4px',
          }}>
            <thead>
              <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>№</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Имя</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Позиция</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Стартовый</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((player, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #ecf0f1' }}>
                  <td style={{ padding: '0.75rem' }}>
                    <input
                      type="number"
                      min="0"
                      value={player.number ?? ''}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        // Если поле пустое или содержит только минус, разрешаем отсутствие номера (null)
                        if (inputValue === '' || inputValue === '-') {
                          handlePlayerChange(index, 'number', null);
                          return;
                        }
                        // Парсим значение и передаем в handlePlayerChange, который сам проверит на отрицательное
                        const numValue = parseInt(inputValue, 10);
                        handlePlayerChange(index, 'number', isNaN(numValue) ? null : numValue);
                      }}
                      onBlur={(e) => {
                        // При потере фокуса проверяем значение и корректируем, если нужно
                        const inputValue = e.target.value;
                        if (inputValue === '' || inputValue === '-') {
                          handlePlayerChange(index, 'number', null);
                          return;
                        }
                        const numValue = parseInt(inputValue, 10);
                        if (numValue < 0 || isNaN(numValue)) {
                          handlePlayerChange(index, 'number', null);
                        }
                      }}
                      placeholder="Без номера"
                      style={{
                        width: '80px',
                        padding: '0.25rem',
                        border: '1px solid #bdc3c7',
                        borderRadius: '4px',
                      }}
                    />
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <input
                      type="text"
                      value={player.name}
                      onChange={(e) => handlePlayerChange(index, 'name', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.25rem',
                        border: '1px solid #bdc3c7',
                        borderRadius: '4px',
                      }}
                      placeholder="Имя игрока"
                    />
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <select
                      value={player.position}
                      onChange={(e) => handlePlayerChange(index, 'position', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.25rem',
                        border: '1px solid #bdc3c7',
                        borderRadius: '4px',
                      }}
                    >
                      {POSITIONS.map(pos => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={player.isStarter}
                      onChange={() => handleToggleStarter(index)}
                    />
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <button
                      onClick={() => handleRemovePlayer(index)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {roster.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#7f8c8d' }}>
              Состав пуст. Добавьте игроков.
            </div>
          )}
        </div>
        
        {/* Поле тренера под списком команды */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '2px solid #bdc3c7' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Тренер
          </label>
          <input
            type="text"
            value={team.coach || ''}
            onChange={(e) => {
              const updatedMatch = { ...match };
              if (selectedTeam === 'A') {
                updatedMatch.teamA = {
                  ...updatedMatch.teamA,
                  coach: e.target.value,
                };
              } else {
                updatedMatch.teamB = {
                  ...updatedMatch.teamB,
                  coach: e.target.value,
                };
              }
              updatedMatch.updatedAt = new Date().toISOString();
              setMatch(updatedMatch);
              
              // Обновляем матч в родительском компоненте и Electron API
              if (onMatchChange) {
                onMatchChange(updatedMatch);
              }
              
              if (window.electronAPI) {
                window.electronAPI.setCurrentMatch(updatedMatch).catch(err => {
                  console.error('Ошибка при обновлении матча:', err);
                });
                window.electronAPI.setMobileMatch(updatedMatch).catch(err => {
                  console.error('Ошибка при обновлении мобильного матча:', err);
                });
              }
            }}
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid #bdc3c7',
              borderRadius: '4px',
            }}
            placeholder="Имя тренера"
          />
        </div>
      </div>

      {/* Стартовый состав */}
      {starters.length > 0 && (
        <div style={{
          backgroundColor: '#ecf0f1',
          padding: '1.5rem',
          borderRadius: '4px',
          marginBottom: '1.5rem',
        }}>
          <h3 style={{ marginTop: 0 }}>Стартовый состав</h3>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}>
            {starters.map((player, index) => (
              <div
                key={index}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#27ae60',
                  color: 'white',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                }}
              >
                {player.number != null ? `№${player.number}` : 'Без номера'} {player.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Кнопки */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        justifyContent: 'flex-end',
      }}>
        <button
          onClick={handleSave}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: '#27ae60',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Сохранить и вернуться
        </button>
      </div>
    </div>
  );
}

export default RosterManagementPage;

